BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixture: an unverified newcomer.
INSERT INTO auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data) VALUES
  ('eeeeeeee-eeee-4eee-8eee-0000000000d1','authenticated','authenticated','guard@korshi.test',now(),'{"full_name":"Новосёл"}');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-0000000000d1',true);

SELECT throws_ok($$INSERT INTO verification_requests(user_id,full_name,building_number,entrance_number,apartment_number,document_type,document_path,status)
  VALUES ('eeeeeeee-eeee-4eee-8eee-0000000000d1','Новосёл','2',1,'5','lease','eeeeeeee-eeee-4eee-8eee-0000000000d1/verification/a.pdf','approved')$$,
  '42501',NULL,'A resident cannot submit an already approved request');
SELECT throws_ok($$INSERT INTO verification_requests(user_id,full_name,building_number,entrance_number,apartment_number,document_type,document_path,reviewed_by)
  VALUES ('eeeeeeee-eeee-4eee-8eee-0000000000d1','Новосёл','2',1,'5','lease','eeeeeeee-eeee-4eee-8eee-0000000000d1/verification/a.pdf','eeeeeeee-eeee-4eee-8eee-000000000001')$$,
  '42501',NULL,'A resident cannot name a reviewer');
SELECT throws_ok($$INSERT INTO verification_requests(user_id,full_name,building_number,entrance_number,apartment_number,document_type,document_path)
  VALUES ('eeeeeeee-eeee-4eee-8eee-0000000000d1','Новосёл','2',1,'5','lease','eeeeeeee-eeee-4eee-8eee-000000000002/chats/x/a.jpg')$$,
  '42501',NULL,'The document must be in the applicant''s verification folder');

SELECT lives_ok($$INSERT INTO verification_requests(user_id,full_name,building_number,entrance_number,apartment_number,document_type,document_path)
  VALUES ('eeeeeeee-eeee-4eee-8eee-0000000000d1','Новосёл','2',1,'5','lease','eeeeeeee-eeee-4eee-8eee-0000000000d1/verification/a.pdf')$$,
  'A pending request with an own document is accepted');
SELECT throws_ok($$INSERT INTO verification_requests(user_id,full_name,building_number,entrance_number,apartment_number,document_type,document_path)
  VALUES ('eeeeeeee-eeee-4eee-8eee-0000000000d1','Новосёл','2',1,'5','lease','eeeeeeee-eeee-4eee-8eee-0000000000d1/verification/b.pdf')$$,
  'P0001',NULL,'A second request waits for the first decision');

RESET ROLE;
UPDATE verification_requests SET status='rejected' WHERE user_id='eeeeeeee-eeee-4eee-8eee-0000000000d1';
SET LOCAL ROLE authenticated;
SELECT lives_ok($$INSERT INTO verification_requests(user_id,full_name,building_number,entrance_number,apartment_number,document_type,document_path)
  VALUES ('eeeeeeee-eeee-4eee-8eee-0000000000d1','Новосёл','2',1,'5','lease','eeeeeeee-eeee-4eee-8eee-0000000000d1/verification/c.pdf')$$,
  'After a rejection the resident can apply again');

SELECT * FROM finish();
ROLLBACK;
