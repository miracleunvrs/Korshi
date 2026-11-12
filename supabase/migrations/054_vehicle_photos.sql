-- Фото автомобиля обязательно: охрана и ОСИ сверяют машину с номером.
-- Файл лежит в папке жителя, поэтому его видят сам житель и администратор.
ALTER TABLE resident_vehicles ADD COLUMN photo_path TEXT;

DELETE FROM resident_vehicles WHERE photo_path IS NULL;
ALTER TABLE resident_vehicles ALTER COLUMN photo_path SET NOT NULL;

DROP POLICY IF EXISTS "vehicles_insert_own" ON resident_vehicles;
CREATE POLICY "vehicles_insert_own" ON resident_vehicles FOR INSERT WITH CHECK (
  resident_id = auth.uid()
  AND complex_id = auth_user_complex_id()
  AND auth_user_verified()
  AND photo_path LIKE auth.uid()::text || '/vehicles/%'
);
