-- Роль и подтверждение жили в двух местах: profiles (старые политики и клиент)
-- и complex_memberships (новые политики, голосование, смена ЖК). Членство
-- создавалось только разовым переносом в 017, поэтому зарегистрировавшиеся
-- позже жители не имели его вовсе и не могли голосовать.
-- Источник истины — активное членство; profiles.role остаётся его зеркалом
-- для старых читателей.

CREATE OR REPLACE FUNCTION legacy_role_for_membership(p_role TEXT)
RETURNS user_role LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT (CASE p_role
    WHEN 'chair' THEN 'hoa_official'
    WHEN 'admin' THEN 'admin'
    WHEN 'executor' THEN 'service_provider'
    ELSE 'resident'
  END)::user_role;
$$;

-- То же соответствие, что и при переносе в 017.
CREATE OR REPLACE FUNCTION membership_role_for_legacy(p_role user_role)
RETURNS TEXT LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_role::TEXT
    WHEN 'hoa_official' THEN 'chair'
    WHEN 'service_provider' THEN 'executor'
    WHEN 'admin' THEN 'admin'
    ELSE 'owner'
  END;
$$;

-- Разовое выравнивание существующих данных (до создания триггеров).
INSERT INTO complex_memberships (user_id, complex_id, apartment_id, role, is_verified, is_active)
SELECT profile.id, profile.complex_id, profile.apartment_id, membership_role_for_legacy(profile.role), profile.verified,
  NOT EXISTS (SELECT 1 FROM complex_memberships active WHERE active.user_id = profile.id AND active.is_active)
FROM profiles profile
WHERE profile.complex_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM complex_memberships membership
    WHERE membership.user_id = profile.id AND membership.complex_id = profile.complex_id
  )
ON CONFLICT DO NOTHING;

UPDATE complex_memberships membership
SET is_verified = TRUE, updated_at = NOW()
FROM profiles profile
WHERE membership.user_id = profile.id
  AND membership.complex_id = profile.complex_id
  AND membership.apartment_id IS NOT DISTINCT FROM profile.apartment_id
  AND profile.verified
  AND NOT membership.is_verified;

-- Расхождения ролей никого не понижают: повышенная роль с любой стороны
-- переносится на другую.
UPDATE complex_memberships membership
SET role = membership_role_for_legacy(profile.role), updated_at = NOW()
FROM profiles profile
WHERE membership.user_id = profile.id
  AND membership.complex_id = profile.complex_id
  AND membership.is_active
  AND profile.role <> 'resident'
  AND legacy_role_for_membership(membership.role) = 'resident'
  AND NOT EXISTS (
    SELECT 1 FROM complex_memberships duplicate
    WHERE duplicate.user_id = membership.user_id
      AND duplicate.complex_id = membership.complex_id
      AND duplicate.apartment_id IS NOT DISTINCT FROM membership.apartment_id
      AND duplicate.role = membership_role_for_legacy(profile.role)
  );

UPDATE profiles profile
SET role = legacy_role_for_membership(membership.role), updated_at = NOW()
FROM complex_memberships membership
WHERE membership.user_id = profile.id
  AND membership.complex_id = profile.complex_id
  AND membership.is_active
  AND profile.role = 'resident'
  AND legacy_role_for_membership(membership.role) <> 'resident';

-- Создаёт членство для ЖК из профиля либо подтверждает уже существующее.
CREATE OR REPLACE FUNCTION ensure_profile_membership(p_user_id UUID, p_verified BOOLEAN DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  profile_row profiles;
  confirmed BOOLEAN;
BEGIN
  SELECT * INTO profile_row FROM profiles WHERE id = p_user_id;
  IF profile_row.id IS NULL OR profile_row.complex_id IS NULL THEN RETURN; END IF;
  confirmed := COALESCE(p_verified, profile_row.verified);

  IF EXISTS (
    SELECT 1 FROM complex_memberships
    WHERE user_id = p_user_id AND complex_id = profile_row.complex_id
  ) THEN
    IF confirmed THEN
      UPDATE complex_memberships
      SET is_verified = TRUE, updated_at = NOW()
      WHERE user_id = p_user_id
        AND complex_id = profile_row.complex_id
        AND apartment_id IS NOT DISTINCT FROM profile_row.apartment_id
        AND NOT is_verified;
    END IF;
    RETURN;
  END IF;

  INSERT INTO complex_memberships (user_id, complex_id, apartment_id, role, is_verified, is_active)
  VALUES (
    p_user_id, profile_row.complex_id, profile_row.apartment_id,
    membership_role_for_legacy(profile_row.role), confirmed,
    NOT EXISTS (SELECT 1 FROM complex_memberships WHERE user_id = p_user_id AND is_active)
  )
  ON CONFLICT DO NOTHING;
END;
$$;
-- Только для триггеров: прямой вызов позволил бы подтвердить самого себя.
REVOKE ALL ON FUNCTION ensure_profile_membership(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION membership_on_profile_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM ensure_profile_membership(NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER membership_on_profile_created AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION membership_on_profile_created();

-- Одобрение заявки обновляет заявку раньше профиля, поэтому факт подтверждения
-- передаётся явно.
CREATE OR REPLACE FUNCTION membership_on_verification_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM ensure_profile_membership(NEW.user_id, TRUE);
  RETURN NEW;
END;
$$;
CREATE TRIGGER membership_on_verification_approved AFTER UPDATE OF status ON verification_requests
  FOR EACH ROW WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION membership_on_verification_approved();

-- Активное членство задаёт роль профиля: при смене ЖК права старого ЖК не
-- переезжают вместе с пользователем.
CREATE OR REPLACE FUNCTION profile_role_from_active_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE profiles
    SET role = legacy_role_for_membership(NEW.role), updated_at = NOW()
    WHERE id = NEW.user_id AND role IS DISTINCT FROM legacy_role_for_membership(NEW.role);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profile_role_from_active_membership AFTER INSERT OR UPDATE OF role, is_active ON complex_memberships
  FOR EACH ROW EXECUTE FUNCTION profile_role_from_active_membership();

-- Прямая правка profiles.role (SQL, панель) переносится в активное членство.
-- Условие не трогает членство, чья роль уже соответствует профилю, поэтому
-- tenant/family не превращаются в owner и триггеры не зацикливаются.
CREATE OR REPLACE FUNCTION membership_role_from_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE complex_memberships
  SET role = membership_role_for_legacy(NEW.role), updated_at = NOW()
  WHERE user_id = NEW.id
    AND complex_id = NEW.complex_id
    AND is_active
    AND legacy_role_for_membership(role) IS DISTINCT FROM NEW.role;
  RETURN NEW;
END;
$$;
CREATE TRIGGER membership_role_from_profile AFTER UPDATE OF role ON profiles
  FOR EACH ROW WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION membership_role_from_profile();
