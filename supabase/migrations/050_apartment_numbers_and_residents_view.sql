-- Квартиры и жильцы.
-- Номер квартиры был уникален только внутри подъезда, а дома нумеруются
-- сквозь все подъезды: в одном доме могли появиться две «квартиры 15».
-- Теперь номер уникален в пределах дома.
-- Представление apartment_residents собирает квартиру и её жильцов в одну
-- таблицу для админки и выгрузок.

CREATE OR REPLACE FUNCTION apartment_number_unique_in_building()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_building UUID;
BEGIN
  SELECT building_id INTO target_building FROM entrances WHERE id = NEW.entrance_id;
  PERFORM pg_advisory_xact_lock(hashtext('apartment_number:' || target_building::text));

  IF EXISTS (
    SELECT 1
    FROM apartments apartment
    JOIN entrances entrance ON entrance.id = apartment.entrance_id
    WHERE entrance.building_id = target_building
      AND apartment.number = NEW.number
      AND apartment.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Квартира % уже есть в этом доме', NEW.number USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apartment_number_unique_in_building ON apartments;
CREATE TRIGGER apartment_number_unique_in_building
  BEFORE INSERT OR UPDATE OF number, entrance_id ON apartments
  FOR EACH ROW EXECUTE FUNCTION apartment_number_unique_in_building();

CREATE OR REPLACE VIEW apartment_residents
WITH (security_invoker = true)
AS
SELECT
  building.complex_id,
  building.number AS building_number,
  entrance.number AS entrance_number,
  apartment.id AS apartment_id,
  apartment.number AS apartment_number,
  apartment.floor,
  membership.user_id AS resident_id,
  profile.full_name AS resident_name,
  profile.phone AS resident_phone,
  membership.role AS resident_role,
  membership.is_verified AS resident_verified
FROM apartments apartment
JOIN entrances entrance ON entrance.id = apartment.entrance_id
JOIN buildings building ON building.id = entrance.building_id
LEFT JOIN complex_memberships membership
  ON membership.apartment_id = apartment.id AND membership.is_active
LEFT JOIN profiles profile ON profile.id = membership.user_id;

REVOKE ALL ON apartment_residents FROM anon;
GRANT SELECT ON apartment_residents TO authenticated;
