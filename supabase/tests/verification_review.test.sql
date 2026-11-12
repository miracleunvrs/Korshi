BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures from seed.sql and seeds/diploma.sql.
INSERT INTO storage.buckets(id,name) VALUES ('house-media','house-media') ON CONFLICT DO NOTHING;
INSERT INTO storage.objects(bucket_id,name) VALUES
  ('house-media','eeeeeeee-eeee-4eee-8eee-000000000006/verification/passport.jpg'),
  ('house-media','eeeeeeee-eeee-4eee-8eee-000000000002/chats/55555555-5555-5555-5555-555555555551/photo.jpg');
INSERT INTO verification_requests(id,user_id,full_name,building_number,entrance_number,apartment_number,document_type,document_path)
VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffc0','eeeeeeee-eeee-4eee-8eee-000000000006','Житель второго ЖК','Тест-2',1,'1','passport','eeeeeeee-eeee-4eee-8eee-000000000006/verification/passport.jpg');

-- A newcomer whose address did not match at signup, and one with a typo.
INSERT INTO auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data) VALUES
  ('eeeeeeee-eeee-4eee-8eee-0000000000c1','authenticated','authenticated','newcomer@korshi.test',now(),'{"full_name":"Новосёл"}'),
  ('eeeeeeee-eeee-4eee-8eee-0000000000c2','authenticated','authenticated','typo@korshi.test',now(),'{"full_name":"Опечатка"}');
INSERT INTO storage.objects(bucket_id,name) VALUES ('house-media','eeeeeeee-eeee-4eee-8eee-0000000000c1/verification/lease.pdf');
INSERT INTO verification_requests(id,user_id,full_name,building_number,entrance_number,apartment_number,document_type,document_path) VALUES
  ('ffffffff-ffff-4fff-8fff-ffffffffffc1','eeeeeeee-eeee-4eee-8eee-0000000000c1','Новосёл','2',2,'90','lease','eeeeeeee-eeee-4eee-8eee-0000000000c1/verification/lease.pdf'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffc2','eeeeeeee-eeee-4eee-8eee-0000000000c2','Опечатка','2',2,'999','lease','x/lease.pdf');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000005',true);
SELECT is((SELECT count(*) FROM storage.objects WHERE name LIKE 'eeeeeeee-eeee-4eee-8eee-000000000006/%'),0::bigint,'Administrator cannot read documents of another complex');
SELECT is((SELECT count(*) FROM verification_requests WHERE id='ffffffff-ffff-4fff-8fff-ffffffffffc0'),0::bigint,'Administrator cannot see requests of another complex');
SELECT is((SELECT count(*) FROM verification_requests WHERE id='ffffffff-ffff-4fff-8fff-ffffffffffc1'),1::bigint,'Unlinked applicant naming a building of this complex is visible');
SELECT is((SELECT count(*) FROM storage.objects WHERE name='eeeeeeee-eeee-4eee-8eee-0000000000c1/verification/lease.pdf'),1::bigint,'Reviewer can open the applicant document');
-- Hosted Supabase also blocks direct SQL deletes from storage; either way the file must stay.
DO $$ BEGIN
  DELETE FROM storage.objects WHERE name='eeeeeeee-eeee-4eee-8eee-0000000000c1/verification/lease.pdf';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT is((SELECT count(*) FROM storage.objects WHERE name='eeeeeeee-eeee-4eee-8eee-0000000000c1/verification/lease.pdf'),1::bigint,'Reviewer cannot delete applicant files');

-- The chair reviews as well as the administrator.
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000003',true);
SELECT throws_ok($$SELECT review_verification_request('ffffffff-ffff-4fff-8fff-ffffffffffc2', true, NULL)$$,'P0001',NULL,'Approval fails when the apartment does not exist');
SELECT lives_ok($$SELECT review_verification_request('ffffffff-ffff-4fff-8fff-ffffffffffc2', false, 'Нет такой квартиры')$$,'Chair can reject a request');
SELECT lives_ok($$SELECT review_verification_request('ffffffff-ffff-4fff-8fff-ffffffffffc1', true, NULL)$$,'Chair approves the newcomer');
RESET ROLE;
SELECT is((SELECT complex_id::text || ':' || apartment_id::text || ':' || verified FROM profiles WHERE id='eeeeeeee-eeee-4eee-8eee-0000000000c1'),'11111111-1111-1111-1111-111111111111:44444444-4444-4444-4444-444444444406:true','Approval links the profile to the requested apartment');
SELECT is((SELECT role || ':' || is_verified || ':' || is_active FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-0000000000c1'),'owner:true:true','Approval creates a verified membership');
SELECT ok((SELECT count(*) FROM chat_members WHERE user_id='eeeeeeee-eeee-4eee-8eee-0000000000c1') > 0,'Approval enrolls the resident in chats');
SELECT is((SELECT review_reason FROM verification_requests WHERE id='ffffffff-ffff-4fff-8fff-ffffffffffc2'),'Нет такой квартиры','Rejection reason is kept');

-- Residents cannot review; chat attachments follow chat membership.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
SELECT throws_ok($$SELECT review_verification_request('ffffffff-ffff-4fff-8fff-ffffffffffc0', true, NULL)$$,'42501',NULL,'Residents cannot review requests');
SELECT is((SELECT count(*) FROM storage.objects WHERE name LIKE '%/chats/55555555-5555-5555-5555-555555555551/%'),1::bigint,'Chat member opens an attachment sent by a neighbour');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000006',true);
SELECT is((SELECT count(*) FROM storage.objects WHERE name LIKE '%/chats/55555555-5555-5555-5555-555555555551/%'),0::bigint,'Outsiders cannot open chat attachments');

SELECT * FROM finish();
ROLLBACK;
