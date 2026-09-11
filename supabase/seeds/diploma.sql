-- Synthetic accounts for local development and diploma demonstrations only.
-- Loaded by local `supabase db reset`. Never apply this file to production.
INSERT INTO complexes(id,name,address,city) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Тестовый второй ЖК','Учебная улица, 2','Алматы');
INSERT INTO buildings(id,complex_id,number) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Тест-2');
INSERT INTO entrances(id,building_id,number) VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1);
INSERT INTO apartments(id,entrance_id,number,floor) VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc','1',1);
INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
VALUES ('00000000-0000-0000-0000-000000000000','eeeeeeee-eeee-4eee-8eee-000000000001','authenticated','authenticated','resident@korshi.test',crypt('Korshi-local-2027!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Тест resident"}',now(),now(),'','','','');
INSERT INTO auth.identities (id,user_id,provider_id,identity_data,provider,created_at,updated_at)
VALUES (gen_random_uuid(),'eeeeeeee-eeee-4eee-8eee-000000000001','eeeeeeee-eeee-4eee-8eee-000000000001','{"sub":"eeeeeeee-eeee-4eee-8eee-000000000001","email":"resident@korshi.test"}','email',now(),now());
UPDATE profiles SET role='resident', verified=true, complex_id='11111111-1111-1111-1111-111111111111', apartment_id='44444444-4444-4444-4444-444444444401' WHERE id='eeeeeeee-eeee-4eee-8eee-000000000001';
INSERT INTO complex_memberships(user_id,complex_id,apartment_id,role,is_verified,is_active) VALUES ('eeeeeeee-eeee-4eee-8eee-000000000001','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444401','tenant',true,true);
INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
VALUES ('00000000-0000-0000-0000-000000000000','eeeeeeee-eeee-4eee-8eee-000000000002','authenticated','authenticated','owner@korshi.test',crypt('Korshi-local-2027!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Тест owner"}',now(),now(),'','','','');
INSERT INTO auth.identities (id,user_id,provider_id,identity_data,provider,created_at,updated_at)
VALUES (gen_random_uuid(),'eeeeeeee-eeee-4eee-8eee-000000000002','eeeeeeee-eeee-4eee-8eee-000000000002','{"sub":"eeeeeeee-eeee-4eee-8eee-000000000002","email":"owner@korshi.test"}','email',now(),now());
UPDATE profiles SET role='resident', verified=true, complex_id='11111111-1111-1111-1111-111111111111', apartment_id='44444444-4444-4444-4444-444444444402' WHERE id='eeeeeeee-eeee-4eee-8eee-000000000002';
INSERT INTO complex_memberships(user_id,complex_id,apartment_id,role,is_verified,is_active) VALUES ('eeeeeeee-eeee-4eee-8eee-000000000002','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444402','owner',true,true);
INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
VALUES ('00000000-0000-0000-0000-000000000000','eeeeeeee-eeee-4eee-8eee-000000000003','authenticated','authenticated','chair@korshi.test',crypt('Korshi-local-2027!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Тест chair"}',now(),now(),'','','','');
INSERT INTO auth.identities (id,user_id,provider_id,identity_data,provider,created_at,updated_at)
VALUES (gen_random_uuid(),'eeeeeeee-eeee-4eee-8eee-000000000003','eeeeeeee-eeee-4eee-8eee-000000000003','{"sub":"eeeeeeee-eeee-4eee-8eee-000000000003","email":"chair@korshi.test"}','email',now(),now());
UPDATE profiles SET role='hoa_official', verified=true, complex_id='11111111-1111-1111-1111-111111111111', apartment_id='44444444-4444-4444-4444-444444444403' WHERE id='eeeeeeee-eeee-4eee-8eee-000000000003';
INSERT INTO complex_memberships(user_id,complex_id,apartment_id,role,is_verified,is_active) VALUES ('eeeeeeee-eeee-4eee-8eee-000000000003','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444403','chair',true,true);
INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
VALUES ('00000000-0000-0000-0000-000000000000','eeeeeeee-eeee-4eee-8eee-000000000004','authenticated','authenticated','dispatcher@korshi.test',crypt('Korshi-local-2027!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Тест dispatcher"}',now(),now(),'','','','');
INSERT INTO auth.identities (id,user_id,provider_id,identity_data,provider,created_at,updated_at)
VALUES (gen_random_uuid(),'eeeeeeee-eeee-4eee-8eee-000000000004','eeeeeeee-eeee-4eee-8eee-000000000004','{"sub":"eeeeeeee-eeee-4eee-8eee-000000000004","email":"dispatcher@korshi.test"}','email',now(),now());
UPDATE profiles SET role='resident', verified=true, complex_id='11111111-1111-1111-1111-111111111111', apartment_id='44444444-4444-4444-4444-444444444404' WHERE id='eeeeeeee-eeee-4eee-8eee-000000000004';
INSERT INTO complex_memberships(user_id,complex_id,apartment_id,role,is_verified,is_active) VALUES ('eeeeeeee-eeee-4eee-8eee-000000000004','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444404','dispatcher',true,true);
INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
VALUES ('00000000-0000-0000-0000-000000000000','eeeeeeee-eeee-4eee-8eee-000000000005','authenticated','authenticated','admin@korshi.test',crypt('Korshi-local-2027!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Тест admin"}',now(),now(),'','','','');
INSERT INTO auth.identities (id,user_id,provider_id,identity_data,provider,created_at,updated_at)
VALUES (gen_random_uuid(),'eeeeeeee-eeee-4eee-8eee-000000000005','eeeeeeee-eeee-4eee-8eee-000000000005','{"sub":"eeeeeeee-eeee-4eee-8eee-000000000005","email":"admin@korshi.test"}','email',now(),now());
UPDATE profiles SET role='admin', verified=true, complex_id='11111111-1111-1111-1111-111111111111', apartment_id='44444444-4444-4444-4444-444444444405' WHERE id='eeeeeeee-eeee-4eee-8eee-000000000005';
INSERT INTO complex_memberships(user_id,complex_id,apartment_id,role,is_verified,is_active) VALUES ('eeeeeeee-eeee-4eee-8eee-000000000005','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444405','admin',true,true);
INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
VALUES ('00000000-0000-0000-0000-000000000000','eeeeeeee-eeee-4eee-8eee-000000000006','authenticated','authenticated','outsider@korshi.test',crypt('Korshi-local-2027!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Тест outsider"}',now(),now(),'','','','');
INSERT INTO auth.identities (id,user_id,provider_id,identity_data,provider,created_at,updated_at)
VALUES (gen_random_uuid(),'eeeeeeee-eeee-4eee-8eee-000000000006','eeeeeeee-eeee-4eee-8eee-000000000006','{"sub":"eeeeeeee-eeee-4eee-8eee-000000000006","email":"outsider@korshi.test"}','email',now(),now());
UPDATE profiles SET role='resident', verified=true, complex_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', apartment_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd' WHERE id='eeeeeeee-eeee-4eee-8eee-000000000006';
INSERT INTO complex_memberships(user_id,complex_id,apartment_id,role,is_verified,is_active) VALUES ('eeeeeeee-eeee-4eee-8eee-000000000006','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd','owner',true,true);
INSERT INTO official_votes(id,complex_id,title,description,created_by,status,starts_at,ends_at)
VALUES ('ffffffff-ffff-4fff-8fff-fffffffffff1','11111111-1111-1111-1111-111111111111','Учебное голосование о благоустройстве','Синтетические данные для проверки одного голоса от квартиры.','eeeeeeee-eeee-4eee-8eee-000000000003','active',now()-interval '1 day',now()+interval '30 days');
INSERT INTO amenity_resources(id,complex_id,name,description,location) VALUES ('ffffffff-ffff-4fff-8fff-fffffffffff2','11111111-1111-1111-1111-111111111111','Учебная переговорная','Для тестирования бронирований','Дом 1');
