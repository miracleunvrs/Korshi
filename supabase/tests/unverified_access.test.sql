BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures from seed.sql and seeds/diploma.sql.
INSERT INTO messages(chat_id,sender_id,content,type) VALUES ('55555555-5555-5555-5555-555555555554','eeeeeeee-eeee-4eee-8eee-000000000002','Код домофона 4521','text');
INSERT INTO posts(id,author_id,complex_id,type,title,content,territory,status) VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffa1','eeeeeeee-eeee-4eee-8eee-000000000002','11111111-1111-1111-1111-111111111111','post','Уезжаем','Квартира пустует до 20-го','complex','active');
UPDATE profiles SET phone='+77010000002' WHERE id='eeeeeeee-eeee-4eee-8eee-000000000002';

-- A stranger signs up with an existing address and confirms only the e-mail.
INSERT INTO auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data)
VALUES ('eeeeeeee-eeee-4eee-8eee-0000000000aa','authenticated','authenticated','stranger@korshi.test',now(),'{"full_name":"Посторонний","building_number":"2","entrance_number":"2","apartment_number":"90"}');
SELECT is((SELECT complex_id FROM profiles WHERE id='eeeeeeee-eeee-4eee-8eee-0000000000aa'),'11111111-1111-1111-1111-111111111111'::uuid,'A unique address links the profile to its complex');
SELECT is((SELECT count(*) FROM chat_members WHERE user_id='eeeeeeee-eeee-4eee-8eee-0000000000aa'),0::bigint,'Unverified resident is not enrolled in chats');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-0000000000aa',true);
SELECT is((SELECT count(*) FROM messages),0::bigint,'Unverified resident reads no chat messages');
SELECT is((SELECT count(*) FROM chats),0::bigint,'Unverified resident sees no chats');
SELECT is((SELECT count(*) FROM posts),0::bigint,'Unverified resident reads no posts');
SELECT is((SELECT count(*) FROM profiles WHERE id <> auth.uid()),0::bigint,'Unverified resident sees no neighbours');
SELECT is((SELECT count(*) FROM profiles WHERE id = auth.uid()),1::bigint,'Unverified resident still sees their own profile');
SELECT lives_ok($$UPDATE profiles SET full_name='Новое имя' WHERE id=auth.uid()$$,'Unverified resident can edit their own name');
SELECT is((SELECT full_name FROM profiles WHERE id=auth.uid()),'Новое имя','Name change is saved');
SELECT throws_ok($$UPDATE profiles SET complex_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' WHERE id=auth.uid()$$,'42501',NULL,'Resident cannot move themselves to another complex');
INSERT INTO verification_requests(id,user_id,full_name,building_number,entrance_number,apartment_number,document_type,document_path)
VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffa2',auth.uid(),'Посторонний','2',2,'90','passport',auth.uid()::text||'/verification/doc.pdf');

-- After an administrator approves the request, the community opens up.
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000005',true);
SELECT lives_ok($$SELECT review_verification_request('ffffffff-ffff-4fff-8fff-ffffffffffa2', true, NULL)$$,'Administrator approves the resident');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-0000000000aa',true);
SELECT ok((SELECT count(*) FROM chats) > 0,'Verified resident is enrolled in complex chats');
SELECT is((SELECT count(*) FROM posts WHERE id='ffffffff-ffff-4fff-8fff-ffffffffffa1'),1::bigint,'Verified resident reads the feed');
RESET ROLE;

-- An address that exists in two complexes links to neither.
INSERT INTO buildings(id,complex_id,number) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2');
INSERT INTO entrances(id,building_id,number) VALUES ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',2);
INSERT INTO apartments(id,entrance_id,number,floor) VALUES ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1','cccccccc-cccc-4ccc-8ccc-ccccccccccc1','90',5);
INSERT INTO auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data)
VALUES ('eeeeeeee-eeee-4eee-8eee-0000000000ab','authenticated','authenticated','ambiguous@korshi.test',now(),'{"building_number":"2","entrance_number":"2","apartment_number":"90"}');
SELECT is((SELECT complex_id FROM profiles WHERE id='eeeeeeee-eeee-4eee-8eee-0000000000ab'),NULL::uuid,'Ambiguous address is not linked to an arbitrary complex');

SELECT * FROM finish();
ROLLBACK;
