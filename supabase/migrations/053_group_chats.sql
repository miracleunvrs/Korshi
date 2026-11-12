-- Группы в чатах.
-- Житель создаёт тематический чат своего ЖК и сам становится его админом.
-- Участников можно не указывать: группа создаётся и пустой, соседей добавляют
-- позже. В группу попадают только подтверждённые жители того же ЖК.

CREATE OR REPLACE FUNCTION create_group_chat(p_name TEXT, p_member_ids UUID[] DEFAULT '{}')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_complex UUID;
  chat_name TEXT := btrim(COALESCE(p_name, ''));
  new_chat_id UUID;
BEGIN
  SELECT complex_id INTO caller_complex FROM profiles WHERE id = caller_id AND verified;
  IF caller_complex IS NULL THEN
    RAISE EXCEPTION 'Группы доступны подтверждённым жителям' USING ERRCODE = '42501';
  END IF;
  IF char_length(chat_name) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'Название группы — от 2 до 80 символов' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(cardinality(p_member_ids), 0) > 200 THEN
    RAISE EXCEPTION 'Не больше 200 участников за раз' USING ERRCODE = '22023';
  END IF;

  INSERT INTO chats (complex_id, type, name, created_by)
  VALUES (caller_complex, 'thematic', chat_name, caller_id)
  RETURNING id INTO new_chat_id;

  INSERT INTO chat_members (chat_id, user_id, role) VALUES (new_chat_id, caller_id, 'admin');

  INSERT INTO chat_members (chat_id, user_id)
  SELECT new_chat_id, member.id
  FROM profiles member
  WHERE member.id = ANY (COALESCE(p_member_ids, '{}'))
    AND member.id <> caller_id
    AND member.verified
    AND member.complex_id = caller_complex
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN new_chat_id;
END;
$$;

REVOKE ALL ON FUNCTION create_group_chat(TEXT, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_group_chat(TEXT, UUID[]) TO authenticated;
