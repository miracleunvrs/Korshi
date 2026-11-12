-- Координаты ЖК для карты на схеме парковки.
ALTER TABLE complexes
  ADD COLUMN latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  ADD COLUMN longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180);
