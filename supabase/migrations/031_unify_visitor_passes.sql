-- Гостевые пропуска из «Сервисов» (visitor_passes) и из «Доступа»
-- (access_passes) жили в двух таблицах и не видели друг друга. Единственным
-- источником становится access_passes: у неё есть журнал проходов, лимит
-- использований и роли охраны.
INSERT INTO access_passes (id, complex_id, resident_id, guest_name, kind, access_code, vehicle_plate, valid_from, valid_until, max_uses, status, created_at)
SELECT legacy.id, legacy.complex_id, legacy.resident_id, legacy.guest_name,
  CASE legacy.kind::TEXT WHEN 'guest' THEN 'single' ELSE legacy.kind::TEXT END,
  legacy.access_code, legacy.vehicle_plate, legacy.valid_from, legacy.valid_until,
  CASE WHEN legacy.kind::TEXT = 'vehicle' THEN NULL ELSE 1 END,
  legacy.status::TEXT, legacy.created_at
FROM visitor_passes legacy
ON CONFLICT DO NOTHING;

-- Старая таблица остаётся только для чтения: новые пропуска в неё не попадают.
DROP POLICY IF EXISTS "passes_insert_own" ON visitor_passes;
DROP POLICY IF EXISTS "passes_update_own" ON visitor_passes;
