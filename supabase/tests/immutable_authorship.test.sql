BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures: owner 2 and tenant 1 live in complex 1.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);

INSERT INTO classifieds(id,author_id,complex_id,title,category,description)
VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffa0',auth.uid(),'11111111-1111-1111-1111-111111111111','Продам велосипед','sale','Почти новый');

SELECT lives_ok($$UPDATE classifieds SET title='Продам велосипед, торг' WHERE id='ffffffff-ffff-4fff-8fff-ffffffffffa0'$$,'An author edits their classified');
SELECT throws_ok($$UPDATE classifieds SET author_id='eeeeeeee-eeee-4eee-8eee-000000000001' WHERE id='ffffffff-ffff-4fff-8fff-ffffffffffa0'$$,
  '42501',NULL,'A classified cannot be reassigned to a neighbour');

SELECT lives_ok($$INSERT INTO sos_incidents(id,location,status,acknowledged_by) VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffa2','Подъезд 1','acknowledged','eeeeeeee-eeee-4eee-8eee-000000000004')$$,'A resident raises SOS');
SELECT is((SELECT status FROM sos_incidents WHERE id='ffffffff-ffff-4fff-8fff-ffffffffffa2'),'active','A new SOS is always active');
SELECT is((SELECT acknowledged_by FROM sos_incidents WHERE id='ffffffff-ffff-4fff-8fff-ffffffffffa2'),NULL::uuid,'A resident cannot claim staff acknowledged it');

SELECT * FROM finish();
ROLLBACK;
