BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- A building with two entrances numbered through: 1 in the first, 2 in the second.
INSERT INTO complexes(id,name) VALUES ('aaaaaaaa-0000-4000-8000-000000000050','Test complex');
INSERT INTO buildings(id,complex_id,number) VALUES ('aaaaaaaa-0000-4000-8000-000000000051','aaaaaaaa-0000-4000-8000-000000000050','1');
INSERT INTO entrances(id,building_id,number) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000052','aaaaaaaa-0000-4000-8000-000000000051',1),
  ('aaaaaaaa-0000-4000-8000-000000000053','aaaaaaaa-0000-4000-8000-000000000051',2);
INSERT INTO apartments(id,entrance_id,number) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000054','aaaaaaaa-0000-4000-8000-000000000052','1');

SELECT lives_ok($$INSERT INTO apartments(entrance_id,number) VALUES ('aaaaaaaa-0000-4000-8000-000000000053','2')$$,
  'Next number goes to the next entrance');
SELECT throws_ok($$INSERT INTO apartments(entrance_id,number) VALUES ('aaaaaaaa-0000-4000-8000-000000000053','1')$$,
  '23505',NULL,'An apartment number cannot repeat in another entrance of the same building');
SELECT throws_ok($$UPDATE apartments SET number='1' WHERE entrance_id='aaaaaaaa-0000-4000-8000-000000000053'$$,
  '23505',NULL,'Renumbering cannot create a duplicate');

SELECT is((SELECT count(*)::int FROM apartment_residents WHERE complex_id='aaaaaaaa-0000-4000-8000-000000000050'),2,
  'Empty apartments still appear in the residents table');
SELECT is((SELECT entrance_number FROM apartment_residents WHERE complex_id='aaaaaaaa-0000-4000-8000-000000000050' AND apartment_number='2'),2,
  'The table shows the entrance of each apartment');

SELECT * FROM finish();
ROLLBACK;
