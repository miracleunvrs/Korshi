BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures from seeds/diploma.sql: user 2 is a verified owner, 6 lives in another complex.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
SELECT lives_ok($$SELECT create_service_request(
  '{"id":"ffffffff-ffff-4fff-8fff-ffffffffff70","category":"repair","title":"Течёт кран","description":"Вода течёт из крана в подвале","location":"Дом 1","priority":"important"}'::jsonb,
  '[{"path":"eeeeeeee-eeee-4eee-8eee-000000000002/requests/ffffffff-ffff-4fff-8fff-ffffffffff70/a.mp4","file_name":"a.mp4","mime_type":"video/mp4","size_bytes":1000},
    {"path":"eeeeeeee-eeee-4eee-8eee-000000000002/requests/ffffffff-ffff-4fff-8fff-ffffffffff70/b.jpg","file_name":"b.jpg","mime_type":"image/jpeg","size_bytes":2000}]'::jsonb)$$,
  'Request with a video and a photo is created');
SELECT is((SELECT count(*) FROM service_request_attachments WHERE request_id='ffffffff-ffff-4fff-8fff-ffffffffff70'),2::bigint,'Both attachments are stored with the request');
SELECT is((SELECT create_service_request('{"id":"ffffffff-ffff-4fff-8fff-ffffffffff70","category":"repair","title":"Течёт кран","description":"Вода течёт из крана в подвале","location":"Дом 1"}'::jsonb)),'ffffffff-ffff-4fff-8fff-ffffffffff70'::uuid,'Retry after a lost response returns the same request');
SELECT is((SELECT count(*) FROM service_requests WHERE title='Течёт кран'),1::bigint,'Retry does not create a duplicate');

SELECT throws_ok($$SELECT create_service_request(
  '{"id":"ffffffff-ffff-4fff-8fff-ffffffffff71","category":"repair","title":"Сломан лифт","description":"Лифт стоит на пятом этаже","location":"Дом 1"}'::jsonb,
  '[{"path":"eeeeeeee-eeee-4eee-8eee-000000000002/requests/ffffffff-ffff-4fff-8fff-ffffffffff71/bad.exe","file_name":"bad.exe","mime_type":"application/x-msdownload","size_bytes":10}]'::jsonb)$$,
  '23514',NULL,'Unsupported attachment type fails the whole request');
SELECT is((SELECT count(*) FROM service_requests WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff71'),0::bigint,'A failed attachment leaves no half-created request');
SELECT throws_ok($$SELECT create_service_request(
  '{"id":"ffffffff-ffff-4fff-8fff-ffffffffff72","category":"repair","title":"Сломан лифт","description":"Лифт стоит на пятом этаже","location":"Дом 1"}'::jsonb,
  '[{"path":"eeeeeeee-eeee-4eee-8eee-000000000006/requests/x/a.jpg","file_name":"a.jpg","mime_type":"image/jpeg","size_bytes":10}]'::jsonb)$$,
  '42501',NULL,'Foreign file paths cannot be attached');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000006',true);
SELECT throws_ok($$SELECT create_service_request('{"id":"ffffffff-ffff-4fff-8fff-ffffffffff70","category":"repair","title":"Чужая","description":"Попытка подменить заявку","location":"Дом 1"}'::jsonb)$$,
  NULL,NULL,'Another user cannot reuse an existing request id');

SELECT * FROM finish();
ROLLBACK;
