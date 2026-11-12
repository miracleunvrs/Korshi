-- Гостевая парковка.
-- Проверки пересечения, типа места и времени были только в book_guest_parking,
-- но политика вставки пускала жителя писать в parking_bookings напрямую: можно
-- было занять уже забронированное место, место жителя или гостевое место на
-- год. Обновлением своей брони можно было сдвинуть её время поверх чужой.
-- Теперь бронь создаётся только функцией, житель может лишь отменить свою, а
-- срок брони ограничен.

DROP POLICY IF EXISTS "parking_bookings_own" ON parking_bookings;

CREATE OR REPLACE FUNCTION parking_booking_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Управление и фоновые задачи (без пользователя) меняют бронь свободно.
  IF auth.uid() IS NULL OR (auth_user_can_manage() AND OLD.complex_id = auth_user_complex_id()) THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'cancelled' OR OLD.status <> 'confirmed'
     OR (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
    RAISE EXCEPTION 'Бронь можно только отменить' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parking_booking_update_guard ON parking_bookings;
CREATE TRIGGER parking_booking_update_guard BEFORE UPDATE ON parking_bookings
  FOR EACH ROW EXECUTE FUNCTION parking_booking_update_guard();

CREATE OR REPLACE FUNCTION book_guest_parking(p_spot_id UUID, p_vehicle_plate TEXT, p_starts_at TIMESTAMPTZ, p_ends_at TIMESTAMPTZ)
RETURNS parking_bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE spot parking_spots; booking parking_bookings;
BEGIN
  SELECT * INTO spot FROM parking_spots WHERE id = p_spot_id AND complex_id = auth_user_complex_id() AND kind IN ('guest','accessible') FOR UPDATE;
  IF spot.id IS NULL OR COALESCE(NOT auth_user_verified(), TRUE) OR p_starts_at < NOW() OR p_ends_at <= p_starts_at THEN RAISE EXCEPTION 'Invalid parking booking'; END IF;
  IF p_ends_at - p_starts_at > INTERVAL '72 hours' THEN RAISE EXCEPTION 'Гостевое место можно забронировать не больше чем на 72 часа'; END IF;
  IF p_starts_at > NOW() + INTERVAL '30 days' THEN RAISE EXCEPTION 'Бронировать можно не раньше чем за 30 дней'; END IF;
  IF length(trim(COALESCE(p_vehicle_plate, ''))) NOT BETWEEN 2 AND 16 THEN RAISE EXCEPTION 'Укажите госномер автомобиля'; END IF;
  IF EXISTS (SELECT 1 FROM parking_bookings existing WHERE existing.parking_spot_id = p_spot_id AND existing.status = 'confirmed' AND tstzrange(existing.starts_at, existing.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')) THEN RAISE EXCEPTION 'Parking spot is already booked'; END IF;
  INSERT INTO parking_bookings(parking_spot_id, vehicle_plate, starts_at, ends_at) VALUES (p_spot_id, upper(trim(p_vehicle_plate)), p_starts_at, p_ends_at) RETURNING * INTO booking;
  RETURN booking;
END; $$;
REVOKE ALL ON FUNCTION book_guest_parking(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION book_guest_parking(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
