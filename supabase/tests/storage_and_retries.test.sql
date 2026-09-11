BEGIN;
SELECT no_plan();
INSERT INTO house_documents(id,complex_id,published_by,title,file_path,file_name,mime_type,size_bytes)
VALUES('ffffffff-ffff-4fff-8fff-fffffffffff4','11111111-1111-1111-1111-111111111111','eeeeeeee-eeee-4eee-8eee-000000000003','Закрытый учебный документ','eeeeeeee-eeee-4eee-8eee-000000000003/documents/ffffffff-ffff-4fff-8fff-fffffffffff4/test.pdf','test.pdf','application/pdf',100);
INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('house-media','eeeeeeee-eeee-4eee-8eee-000000000003/documents/ffffffff-ffff-4fff-8fff-fffffffffff4/test.pdf','eeeeeeee-eeee-4eee-8eee-000000000003');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000006',true);
SELECT is((SELECT count(*) FROM house_documents WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff4'),0::bigint,'Other complex cannot read document metadata');
SELECT is((SELECT count(*) FROM storage.objects WHERE name LIKE '%ffffffff-ffff-4fff-8fff-fffffffffff4%'),0::bigint,'Other complex cannot read document file');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
SELECT is((SELECT count(*) FROM house_documents WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff4'),1::bigint,'Resident can read their complex document');
SELECT is((SELECT count(*) FROM storage.objects WHERE name LIKE '%ffffffff-ffff-4fff-8fff-fffffffffff4%'),1::bigint,'Resident can read permitted document file');

SELECT lives_ok($$SELECT execute_platform_mutation('ffffffff-ffff-4fff-8fff-fffffffffff5','11111111-1111-1111-1111-111111111111','{"operation":"insert","table":"access_passes","payload":{"guest_name":"Проверка повтора","kind":"single","valid_until":"2030-01-01T12:00:00Z"}}')$$,'First mutation succeeds');
SELECT lives_ok($$SELECT execute_platform_mutation('ffffffff-ffff-4fff-8fff-fffffffffff5','11111111-1111-1111-1111-111111111111','{"operation":"insert","table":"access_passes","payload":{"guest_name":"Проверка повтора","kind":"single","valid_until":"2030-01-01T12:00:00Z"}}')$$,'Retry returns committed receipt');
SELECT is((SELECT count(*) FROM access_passes WHERE guest_name='Проверка повтора'),1::bigint,'Lost response retry creates exactly one pass');
SELECT throws_ok($$SELECT execute_platform_mutation('ffffffff-ffff-4fff-8fff-fffffffffff5','11111111-1111-1111-1111-111111111111','{"operation":"insert","table":"access_passes","payload":{"guest_name":"Другой запрос","kind":"single","valid_until":"2030-01-01T12:00:00Z"}}')$$,'23505',NULL,'Idempotency key cannot be reused for another action');
SELECT throws_ok($$SELECT execute_platform_mutation('ffffffff-ffff-4fff-8fff-fffffffffff6','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"operation":"insert","table":"access_passes","payload":{"guest_name":"Чужой ЖК"}}')$$,'42501',NULL,'Queued action is bound to active complex');
SELECT throws_ok($$SELECT execute_platform_mutation('ffffffff-ffff-4fff-8fff-fffffffffff7','11111111-1111-1111-1111-111111111111','{"operation":"update","table":"complex_settings","match":{"complex_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"},"payload":{"name":"Подмена"}}')$$,'42501',NULL,'Executor preserves RLS on updates');
SELECT is((SELECT count(*) FROM client_mutation_receipts WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff7'),0::bigint,'Failed mutation rolls back receipt');
SELECT * FROM finish();
ROLLBACK;
