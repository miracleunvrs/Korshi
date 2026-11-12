-- Гостевой пропуск жителя начинает действовать только после одобрения ОСИ.
-- Житель создаёт пропуск в статусе pending; председатель, админ или диспетчер
-- одобряет (active) или отклоняет (revoked). Охрана выдаёт пропуска сразу.

ALTER TABLE access_passes DROP CONSTRAINT access_passes_status_check;
ALTER TABLE access_passes ADD CONSTRAINT access_passes_status_check
  CHECK (status IN ('pending','active','used','revoked','expired'));

CREATE OR REPLACE FUNCTION access_pass_resident_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
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
    NEW.status := 'pending';
    NEW.revoked_at := NULL;
    NEW.valid_from := GREATEST(COALESCE(NEW.valid_from, NOW()), NOW() - INTERVAL '1 hour');
    IF NEW.valid_until <= NOW() OR NEW.valid_until > NOW() + INTERVAL '366 days' THEN
      RAISE EXCEPTION 'Пропуск можно выдать не больше чем на год' USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
  END IF;

  -- Житель может только отозвать свой действующий или ожидающий пропуск.
  IF NEW.status <> 'revoked' OR OLD.status NOT IN ('active','pending')
     OR (to_jsonb(NEW) - 'status' - 'revoked_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'revoked_at') THEN
    RAISE EXCEPTION 'Пропуск можно только отозвать' USING ERRCODE = '42501';
  END IF;
  NEW.revoked_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION review_access_pass(p_pass_id UUID, p_approve BOOLEAN)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pass access_passes;
BEGIN
  IF NOT auth_user_can_manage() THEN
    RAISE EXCEPTION 'Одобрять пропуска может только ОСИ' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO pass FROM access_passes
  WHERE id = p_pass_id AND complex_id = auth_user_complex_id()
  FOR UPDATE;
  IF pass.id IS NULL THEN RETURN 'not_found'; END IF;
  IF pass.status <> 'pending' THEN RETURN 'already_reviewed'; END IF;

  UPDATE access_passes
  SET status = CASE WHEN p_approve THEN 'active' ELSE 'revoked' END,
      revoked_at = CASE WHEN p_approve THEN NULL ELSE NOW() END
  WHERE id = pass.id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    pass.resident_id, 'system',
    CASE WHEN p_approve THEN 'Пропуск одобрен' ELSE 'Пропуск отклонён' END,
    CASE WHEN p_approve THEN 'ОСИ одобрило пропуск для гостя «' || pass.guest_name || '».'
         ELSE 'ОСИ отклонило пропуск для гостя «' || pass.guest_name || '».' END,
    jsonb_build_object('pass_id', pass.id)
  );
  RETURN CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END;
END;
$$;

REVOKE ALL ON FUNCTION review_access_pass(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION review_access_pass(UUID, BOOLEAN) TO authenticated;

-- Неодобренный пропуск тоже истекает.
CREATE OR REPLACE FUNCTION expire_access_passes()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected INTEGER;
BEGIN
  UPDATE access_passes SET status = 'expired' WHERE status IN ('active','pending') AND valid_until <= NOW();
  GET DIAGNOSTICS affected = ROW_COUNT;
  UPDATE parking_bookings SET status = 'completed' WHERE status = 'confirmed' AND ends_at <= NOW();
  RETURN affected;
END; $$;
