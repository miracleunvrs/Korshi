-- Инструменты управления ЖК.
-- 1. ОСИ узнаёт о новом пропуске, который ждёт одобрения.
-- 2. Дом с подъездами и квартирами создаётся одним вызовом: квартиры
--    нумеруются сквозь все подъезды, как в реальных домах.
-- 3. Беседы: админ беседы добавляет участников и переименовывает её,
--    любой участник может выйти. Беседа без участников удаляется.

CREATE OR REPLACE FUNCTION notify_management_on_pending_pass()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT DISTINCT membership.user_id, 'system', 'Пропуск ждёт одобрения',
    'Гость «' || NEW.guest_name || '». Откройте «Доступ и парковка».',
    jsonb_build_object('pass_id', NEW.id)
  FROM complex_memberships membership
  WHERE membership.complex_id = NEW.complex_id
    AND membership.is_active
    AND membership.role IN ('chair', 'admin', 'dispatcher')
    AND membership.user_id <> NEW.resident_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_management_on_pending_pass ON access_passes;
CREATE TRIGGER notify_management_on_pending_pass AFTER INSERT ON access_passes
  FOR EACH ROW EXECUTE FUNCTION notify_management_on_pending_pass();
REVOKE ALL ON FUNCTION notify_management_on_pending_pass() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION create_building_with_apartments(
  p_number TEXT,
  p_entrances INTEGER,
  p_apartments_per_entrance INTEGER,
  p_first_apartment INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  complex UUID := auth_user_complex_id();
  building_number TEXT := btrim(COALESCE(p_number, ''));
  new_building UUID;
  new_entrance UUID;
  entrance_no INTEGER;
  apartment_no INTEGER := p_first_apartment;
BEGIN
  IF NOT auth_user_can_manage() OR complex IS NULL THEN
    RAISE EXCEPTION 'Дома добавляет только ОСИ' USING ERRCODE = '42501';
  END IF;
  IF char_length(building_number) NOT BETWEEN 1 AND 80
     OR p_entrances NOT BETWEEN 1 AND 30
     OR p_apartments_per_entrance NOT BETWEEN 1 AND 500
     OR p_first_apartment NOT BETWEEN 1 AND 100000 THEN
    RAISE EXCEPTION 'Проверьте номер дома, подъезды и квартиры' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM buildings WHERE complex_id = complex AND number = building_number) THEN
    RAISE EXCEPTION 'Дом % уже есть в ЖК', building_number USING ERRCODE = '23505';
  END IF;

  INSERT INTO buildings (complex_id, number) VALUES (complex, building_number) RETURNING id INTO new_building;
  FOR entrance_no IN 1..p_entrances LOOP
    INSERT INTO entrances (building_id, number) VALUES (new_building, entrance_no) RETURNING id INTO new_entrance;
    INSERT INTO apartments (entrance_id, number)
    SELECT new_entrance, n::TEXT FROM generate_series(apartment_no, apartment_no + p_apartments_per_entrance - 1) n;
    apartment_no := apartment_no + p_apartments_per_entrance;
  END LOOP;
  RETURN new_building;
END;
$$;

REVOKE ALL ON FUNCTION create_building_with_apartments(TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_building_with_apartments(TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION manage_group_chat(p_chat_id UUID, p_action TEXT, p_name TEXT DEFAULT NULL, p_member_ids UUID[] DEFAULT '{}')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chat chats;
  caller_role chat_member_role;
  chat_name TEXT := btrim(COALESCE(p_name, ''));
BEGIN
  SELECT * INTO chat FROM chats WHERE id = p_chat_id AND type = 'thematic' FOR UPDATE;
  SELECT role INTO caller_role FROM chat_members WHERE chat_id = p_chat_id AND user_id = auth.uid();
  IF chat.id IS NULL OR caller_role IS NULL THEN
    RAISE EXCEPTION 'Вы не участник этой беседы' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'leave' THEN
    DELETE FROM chat_members WHERE chat_id = p_chat_id AND user_id = auth.uid();
    IF NOT EXISTS (SELECT 1 FROM chat_members WHERE chat_id = p_chat_id) THEN
      DELETE FROM chats WHERE id = p_chat_id;
    ELSIF caller_role = 'admin' AND NOT EXISTS (SELECT 1 FROM chat_members WHERE chat_id = p_chat_id AND role = 'admin') THEN
      -- Беседа не остаётся без админа: им становится самый давний участник.
      UPDATE chat_members SET role = 'admin'
      WHERE id = (SELECT id FROM chat_members WHERE chat_id = p_chat_id ORDER BY joined_at LIMIT 1);
    END IF;
    RETURN 'left';
  END IF;

  IF caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Это может только админ беседы' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'rename' THEN
    IF char_length(chat_name) NOT BETWEEN 2 AND 80 THEN
      RAISE EXCEPTION 'Название беседы — от 2 до 80 символов' USING ERRCODE = '22023';
    END IF;
    UPDATE chats SET name = chat_name WHERE id = p_chat_id;
    RETURN 'renamed';
  ELSIF p_action = 'add' THEN
    INSERT INTO chat_members (chat_id, user_id)
    SELECT p_chat_id, member.id FROM profiles member
    WHERE member.id = ANY (COALESCE(p_member_ids, '{}')) AND member.verified AND member.complex_id = chat.complex_id
    ON CONFLICT (chat_id, user_id) DO NOTHING;
    RETURN 'added';
  ELSIF p_action = 'remove' THEN
    DELETE FROM chat_members
    WHERE chat_id = p_chat_id AND user_id = ANY (COALESCE(p_member_ids, '{}')) AND user_id <> auth.uid();
    RETURN 'removed';
  ELSIF p_action = 'delete' THEN
    DELETE FROM chats WHERE id = p_chat_id;
    RETURN 'deleted';
  END IF;
  RAISE EXCEPTION 'Неизвестное действие' USING ERRCODE = '22023';
END;
$$;

REVOKE ALL ON FUNCTION manage_group_chat(UUID, TEXT, TEXT, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION manage_group_chat(UUID, TEXT, TEXT, UUID[]) TO authenticated;
