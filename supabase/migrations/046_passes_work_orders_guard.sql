-- Права жителя и исполнителя на пропуска и заказы работ.
-- * Пропуск: житель мог вернуть в работу пропуск, отозванный охраной, обнулить
--   счётчик проходов, выдать пропуск на годы вперёд или задать свой код.
-- * Заказ работ: исполнитель мог удалить заказ или переназначить его.

CREATE OR REPLACE FUNCTION auth_user_is_security()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(auth_user_membership_role() IN ('chair', 'admin', 'dispatcher', 'guard', 'concierge'), FALSE);
$$;

CREATE OR REPLACE FUNCTION access_pass_resident_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Охрана, управление и фоновые задачи (без пользователя) работают как раньше.
  IF auth.uid() IS NULL OR auth_user_is_security() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Код, токен и счётчики выдаёт сервер.
    NEW.access_code := upper(substr(encode(gen_random_bytes(10), 'hex'), 1, 10));
    NEW.token_hash := encode(gen_random_bytes(32), 'hex');
    NEW.used_count := 0;
    NEW.status := 'active';
    NEW.revoked_at := NULL;
    NEW.valid_from := GREATEST(COALESCE(NEW.valid_from, NOW()), NOW() - INTERVAL '1 hour');
    IF NEW.valid_until <= NOW() OR NEW.valid_until > NOW() + INTERVAL '366 days' THEN
      RAISE EXCEPTION 'Пропуск можно выдать не больше чем на год' USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
  END IF;

  -- Житель может только отозвать свой действующий пропуск.
  IF NEW.status <> 'revoked' OR OLD.status <> 'active'
     OR (to_jsonb(NEW) - 'status' - 'revoked_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'revoked_at') THEN
    RAISE EXCEPTION 'Пропуск можно только отозвать' USING ERRCODE = '42501';
  END IF;
  NEW.revoked_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS access_pass_resident_guard ON access_passes;
CREATE TRIGGER access_pass_resident_guard BEFORE INSERT OR UPDATE ON access_passes
  FOR EACH ROW EXECUTE FUNCTION access_pass_resident_guard();

-- Заказ работ ведёт управление; исполнитель отмечает пункты чек-листа.
DROP POLICY IF EXISTS "work_orders_manage" ON work_orders;
CREATE POLICY "work_orders_manage" ON work_orders FOR ALL
  USING (complex_id = auth_user_complex_id() AND auth_user_can_manage())
  WITH CHECK (complex_id = auth_user_complex_id() AND auth_user_can_manage());
