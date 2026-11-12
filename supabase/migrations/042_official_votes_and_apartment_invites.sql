-- Создание голосований и коды-приглашения для квартир.
-- * Официальные голосования нельзя было создать из интерфейса, а число квартир
--   и площадь для кворума пришлось бы вводить вручную. Функция считает их по
--   квартирам ЖК.
-- * Подтверждение проживания по документам медленное и требует ручной
--   проверки. ОСИ может выдать квартире одноразовый код (на бумаге в почтовый
--   ящик или лично): житель вводит его и сразу получает доступ к своему дому.

CREATE OR REPLACE FUNCTION create_official_vote(
  p_title TEXT,
  p_description TEXT,
  p_basis official_vote_basis,
  p_quorum_percent NUMERIC,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ
)
RETURNS official_votes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  complex UUID := auth_user_complex_id();
  units INTEGER;
  total_area NUMERIC;
  vote official_votes;
BEGIN
  IF NOT auth_user_is_management() THEN
    RAISE EXCEPTION 'Only complex management can create votes' USING ERRCODE = '42501';
  END IF;
  IF p_ends_at <= p_starts_at OR p_ends_at <= NOW() THEN
    RAISE EXCEPTION 'Vote must end after it starts and in the future' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(apartment.area_sqm), 0) INTO units, total_area
  FROM apartments apartment
  JOIN entrances entrance ON entrance.id = apartment.entrance_id
  JOIN buildings building ON building.id = entrance.building_id
  WHERE building.complex_id = complex;

  IF p_basis = 'area' AND total_area <= 0 THEN
    RAISE EXCEPTION 'Площади квартир не заполнены: голосование по площади невозможно' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO official_votes (complex_id, created_by, title, description, basis, quorum_percent, eligible_units, eligible_weight, status, starts_at, ends_at)
  VALUES (complex, auth.uid(), trim(p_title), trim(p_description), p_basis, p_quorum_percent,
    GREATEST(units, 1), CASE WHEN p_basis = 'area' THEN total_area ELSE GREATEST(units, 1) END,
    'active', p_starts_at, p_ends_at)
  RETURNING * INTO vote;

  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT profile.id, 'vote', 'Новое голосование собственников', vote.title, jsonb_build_object('vote_id', vote.id)
  FROM profiles profile
  WHERE profile.complex_id = complex AND profile.verified AND profile.id <> auth.uid();

  RETURN vote;
END;
$$;

REVOKE ALL ON FUNCTION create_official_vote(TEXT, TEXT, official_vote_basis, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_official_vote(TEXT, TEXT, official_vote_basis, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

CREATE TABLE apartment_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complex_id UUID NOT NULL REFERENCES complexes(id) ON DELETE CASCADE,
  apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  used_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ
);
CREATE INDEX idx_apartment_invites_complex ON apartment_invites(complex_id, created_at DESC);
ALTER TABLE apartment_invites ENABLE ROW LEVEL SECURITY;
-- Коды видит только управление своего ЖК; выдача и погашение — через функции.
CREATE POLICY "apartment_invites_management_read" ON apartment_invites
  FOR SELECT USING (complex_id = auth_user_complex_id() AND auth_user_is_management());

CREATE OR REPLACE FUNCTION create_apartment_invite(p_apartment_id UUID)
RETURNS apartment_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  random_bytes BYTEA;
  new_code TEXT;
  invite apartment_invites;
BEGIN
  IF NOT auth_user_is_management() THEN
    RAISE EXCEPTION 'Only complex management can issue invites' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM apartments apartment
    JOIN entrances entrance ON entrance.id = apartment.entrance_id
    JOIN buildings building ON building.id = entrance.building_id
    WHERE apartment.id = p_apartment_id AND building.complex_id = auth_user_complex_id()
  ) THEN
    RAISE EXCEPTION 'Apartment is not in this complex' USING ERRCODE = '42501';
  END IF;

  -- 10 символов из 32 (≈50 бит): 256 делится на 32, поэтому выборка равномерна.
  LOOP
    random_bytes := gen_random_bytes(10);
    SELECT string_agg(substr(alphabet, get_byte(random_bytes, position) % 32 + 1, 1), '' ORDER BY position)
      INTO new_code FROM generate_series(0, 9) AS position;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM apartment_invites WHERE code = new_code);
  END LOOP;

  INSERT INTO apartment_invites (complex_id, apartment_id, code, created_by)
  VALUES (auth_user_complex_id(), p_apartment_id, new_code, auth.uid())
  RETURNING * INTO invite;
  RETURN invite;
END;
$$;

-- Погашение возвращает статус вместо исключения: исключение откатило бы и
-- счётчик попыток, и перебор кодов стал бы неограниченным.
CREATE OR REPLACE FUNCTION redeem_apartment_invite(p_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite apartment_invites;
  normalized TEXT := upper(regexp_replace(COALESCE(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthorized'; END IF;
  IF NOT consume_rate_limit('invite:' || auth.uid()::TEXT, 5, 3600) THEN RETURN 'rate_limited'; END IF;

  SELECT * INTO invite FROM apartment_invites WHERE code = normalized FOR UPDATE;
  IF invite.id IS NULL THEN RETURN 'invalid'; END IF;
  IF invite.used_at IS NOT NULL THEN RETURN 'used'; END IF;
  IF invite.expires_at <= NOW() THEN RETURN 'expired'; END IF;

  UPDATE apartment_invites SET used_by = auth.uid(), used_at = NOW() WHERE id = invite.id;

  UPDATE profiles
  SET complex_id = invite.complex_id, apartment_id = invite.apartment_id,
      verified = TRUE, verified_at = NOW(), verified_by = invite.created_by
  WHERE id = auth.uid();

  UPDATE complex_memberships membership
  SET apartment_id = invite.apartment_id, updated_at = NOW()
  WHERE membership.user_id = auth.uid() AND membership.complex_id = invite.complex_id
    AND membership.is_active AND membership.apartment_id IS DISTINCT FROM invite.apartment_id
    AND NOT EXISTS (
      SELECT 1 FROM complex_memberships other
      WHERE other.user_id = membership.user_id AND other.complex_id = membership.complex_id
        AND other.apartment_id = invite.apartment_id AND other.role = membership.role
    );
  PERFORM ensure_profile_membership(auth.uid(), TRUE);

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (auth.uid(), 'verification', 'Проживание подтверждено', 'Код ОСИ принят. Теперь вам доступны чаты и данные дома.',
    jsonb_build_object('invite_id', invite.id));
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION create_apartment_invite(UUID), redeem_apartment_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_apartment_invite(UUID), redeem_apartment_invite(TEXT) TO authenticated;

-- Просроченные заявки тоже отмечаются по расписанию, если доступен pg_cron.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('korshi-mark-overdue-requests', '*/15 * * * *', 'SELECT public.mark_overdue_service_requests()');
  END IF;
END $$;
