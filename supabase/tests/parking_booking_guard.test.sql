BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures: a guest and a resident spot in complex 1; user 2 is a verified owner there.
INSERT INTO parking_spots(id,complex_id,label,zone,kind) VALUES
  ('ffffffff-ffff-4fff-8fff-ffffffffff80','11111111-1111-1111-1111-111111111111','G-1','Гостевая','guest'),
  ('ffffffff-ffff-4fff-8fff-ffffffffff81','11111111-1111-1111-1111-111111111111','R-1','Жилая','resident');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);

SELECT throws_ok($$INSERT INTO parking_bookings(parking_spot_id,vehicle_plate,starts_at,ends_at)
  VALUES ('ffffffff-ffff-4fff-8fff-ffffffffff81','A123BC',now()+interval '1 hour',now()+interval '1 year')$$,
  '42501',NULL,'A resident cannot write bookings directly');
SELECT throws_ok($$SELECT book_guest_parking('ffffffff-ffff-4fff-8fff-ffffffffff80','A123BC',now()+interval '1 hour',now()+interval '10 days')$$,
  NULL,NULL,'A guest spot cannot be held for days');
SELECT throws_ok($$SELECT book_guest_parking('ffffffff-ffff-4fff-8fff-ffffffffff81','A123BC',now()+interval '1 hour',now()+interval '3 hours')$$,
  NULL,NULL,'A resident''s spot is not bookable');
SELECT lives_ok($$SELECT book_guest_parking('ffffffff-ffff-4fff-8fff-ffffffffff80','A123BC',now()+interval '1 hour',now()+interval '3 hours')$$,
  'A short guest booking is accepted');
SELECT throws_ok($$SELECT book_guest_parking('ffffffff-ffff-4fff-8fff-ffffffffff80','B456DE',now()+interval '2 hours',now()+interval '4 hours')$$,
  NULL,NULL,'An overlapping booking is refused');

SELECT throws_ok($$UPDATE parking_bookings SET ends_at = ends_at + interval '30 days' WHERE vehicle_plate='A123BC'$$,
  '42501',NULL,'A resident cannot stretch their booking');
SELECT lives_ok($$UPDATE parking_bookings SET status='cancelled' WHERE vehicle_plate='A123BC'$$,'A resident can cancel their booking');
SELECT is((SELECT status FROM parking_bookings WHERE vehicle_plate='A123BC'),'cancelled','The booking is cancelled');
SELECT throws_ok($$UPDATE parking_bookings SET status='confirmed' WHERE vehicle_plate='A123BC'$$,
  '42501',NULL,'A cancelled booking cannot be revived over someone else''s');

SELECT * FROM finish();
ROLLBACK;
