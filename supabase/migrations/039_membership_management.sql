-- Управление членствами.
-- Политика memberships_manage разрешала любой роли управления (включая
-- диспетчера) менять любые членства своего ЖК — в том числе собственное:
-- диспетчер мог назначить себе роль admin. Теперь членства меняются только
-- через функции с явными правилами.

DROP POLICY IF EXISTS "memberships_manage" ON complex_memberships;

CREATE OR REPLACE FUNCTION auth_user_can_assign_roles()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(auth_user_membership_role() IN ('chair', 'admin'), FALSE);
$$;

CREATE OR REPLACE FUNCTION set_member_role(p_membership_id UUID, p_role TEXT)
RETURNS complex_memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target complex_memberships;
  caller_role TEXT := auth_user_membership_role();
BEGIN
  IF NOT auth_user_can_assign_roles() THEN
    RAISE EXCEPTION 'Only the chair or an administrator can assign roles' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('owner', 'tenant', 'family', 'chair', 'admin', 'dispatcher', 'executor', 'guard', 'concierge') THEN
    RAISE EXCEPTION 'Unknown role' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO target FROM complex_memberships
  WHERE id = p_membership_id AND complex_id = auth_user_complex_id()
  FOR UPDATE;
  IF target.id IS NULL THEN
    RAISE EXCEPTION 'Membership is not accessible' USING ERRCODE = '42501';
  END IF;
  IF target.user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own role' USING ERRCODE = '42501';
  END IF;
  IF (p_role = 'admin' OR target.role = 'admin') AND caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Only an administrator can grant or revoke the administrator role' USING ERRCODE = '42501';
  END IF;

  UPDATE complex_memberships SET role = p_role, updated_at = NOW()
  WHERE id = p_membership_id
  RETURNING * INTO target;
  RETURN target;
END;
$$;

-- Выезд жителя: членство перестаёт быть подтверждённым, а если это текущий
-- ЖК профиля — профиль тоже теряет подтверждение и выходит из чатов ЖК.
CREATE OR REPLACE FUNCTION revoke_member_access(p_membership_id UUID)
RETURNS complex_memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target complex_memberships;
  caller_role TEXT := auth_user_membership_role();
BEGIN
  IF NOT auth_user_can_assign_roles() THEN
    RAISE EXCEPTION 'Only the chair or an administrator can revoke access' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target FROM complex_memberships
  WHERE id = p_membership_id AND complex_id = auth_user_complex_id()
  FOR UPDATE;
  IF target.id IS NULL THEN
    RAISE EXCEPTION 'Membership is not accessible' USING ERRCODE = '42501';
  END IF;
  IF target.user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot revoke your own access' USING ERRCODE = '42501';
  END IF;
  IF target.role = 'admin' AND caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Only an administrator can revoke an administrator' USING ERRCODE = '42501';
  END IF;

  UPDATE complex_memberships SET is_verified = FALSE, updated_at = NOW()
  WHERE id = p_membership_id
  RETURNING * INTO target;

  UPDATE profiles SET verified = FALSE, verified_at = NULL
  WHERE id = target.user_id AND complex_id = target.complex_id;

  DELETE FROM chat_members member
  USING chats chat
  WHERE member.chat_id = chat.id AND member.user_id = target.user_id
    AND chat.complex_id = target.complex_id AND chat.type <> 'direct';

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (target.user_id, 'verification', 'Доступ к ЖК отозван',
    'Управление ЖК отметило, что вы больше не проживаете по этому адресу. Если это ошибка, отправьте заявку на подтверждение снова.',
    jsonb_build_object('membership_id', target.id));

  RETURN target;
END;
$$;

REVOKE ALL ON FUNCTION set_member_role(UUID, TEXT), revoke_member_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_member_role(UUID, TEXT), revoke_member_access(UUID) TO authenticated;
