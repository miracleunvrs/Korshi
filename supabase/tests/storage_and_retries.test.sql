BEGIN;
SELECT no_plan();
INSERT INTO house_documents(id,complex_id,published_by,title,file_path,file_name,mime_type,size_bytes)
VALUES('ffffffff-ffff-4fff-8fff-fffffffffff4','11111111-1111-1111-1111-111111111111','eeeeeeee-eeee-4eee-8eee-000000000003','Закрытый учебный документ','eeeeeeee-eeee-4eee-8eee-000000000003/documents/ffffffff-ffff-4fff-8fff-fffffffffff4/test.pdf','test.pdf','application/pdf',100);
INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('house-media','eeeeeeee-eeee-4eee-8eee-000000000003/documents/ffffffff-ffff-4fff-8fff-fffffffffff4/test.pdf','eeeeeeee-eeee-4eee-8eee-000000000003');
INSERT INTO work_orders(id,complex_id,created_by,kind,title,location,starts_at,status)
VALUES('ffffffff-ffff-4fff-8fff-ffffffffff10','11111111-1111-1111-1111-111111111111','eeeeeeee-eeee-4eee-8eee-000000000003','repair','Проверка оценки','Дом 1',now(),'completed');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000006',true);
SELECT is((SELECT count(*) FROM house_documents WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff4'),0::bigint,'Other complex cannot read document metadata');
SELECT is((SELECT count(*) FROM storage.objects WHERE name LIKE '%ffffffff-ffff-4fff-8fff-fffffffffff4%'),0::bigint,'Other complex cannot read document file');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
SELECT is((SELECT count(*) FROM house_documents WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff4'),1::bigint,'Resident can read their complex document');
SELECT is((SELECT count(*) FROM storage.objects WHERE name LIKE '%ffffffff-ffff-4fff-8fff-fffffffffff4%'),1::bigint,'Resident can read permitted document file');

SELECT lives_ok($$SELECT execute_platform_mutation('ffffffff-ffff-4fff-8fff-fffffffffff5','11111111-1111-1111-1111-111111111111',('{"operation":"insert","table":"access_passes","payload":{"guest_name":"Проверка повтора","kind":"single","valid_until":"'||to_char(now()+interval '30 days','YYYY-MM-DD')||'"}}')::jsonb)$$,'First mutation succeeds');
SELECT lives_ok($$SELECT execute_platform_mutation('ffffffff-ffff-4fff-8fff-fffffffffff5','11111111-1111-1111-1111-111111111111',('{"operation":"insert","table":"access_passes","payload":{"guest_name":"Проверка повтора","kind":"single","valid_until":"'||to_char(now()+interval '30 days','YYYY-MM-DD')||'"}}')::jsonb)$$,'Retry returns committed receipt');
SELECT is((SELECT count(*) FROM access_passes WHERE guest_name='Проверка повтора'),1::bigint,'Lost response retry creates exactly one pass');
SELECT throws_ok($$SELECT execute_platform_mutation('ffffffff-ffff-4fff-8fff-fffffffffff5','11111111-1111-1111-1111-111111111111',('{"operation":"insert","table":"access_passes","payload":{"guest_name":"Другой запрос","kind":"single","valid_until":"'||to_char(now()+interval '30 days','YYYY-MM-DD')||'"}}')::jsonb)$$,'23505',NULL,'Idempotency key cannot be reused for another action');
SELECT throws_ok($$SELECT execute_platform_mutation('ffffffff-ffff-4fff-8fff-fffffffffff6','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"operation":"insert","table":"access_passes","payload":{"guest_name":"Чужой ЖК"}}')$$,'42501',NULL,'Queued action is bound to active complex');
SELECT throws_ok($$SELECT execute_platform_mutation('ffffffff-ffff-4fff-8fff-fffffffffff7','11111111-1111-1111-1111-111111111111','{"operation":"update","table":"complex_settings","match":{"complex_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"},"payload":{"name":"Подмена"}}')$$,'42501',NULL,'Executor preserves RLS on updates');
SELECT is((SELECT count(*) FROM client_mutation_receipts WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff7'),0::bigint,'Failed mutation rolls back receipt');

SELECT lives_ok($$SELECT execute_platform_mutation('ffffffff-ffff-4fff-8fff-ffffffffff11','11111111-1111-1111-1111-111111111111','{"operation":"upsert","table":"work_ratings","payload":{"work_order_id":"ffffffff-ffff-4fff-8fff-ffffffffff10","rating":3}}')$$,'Resident can rate completed work');
SELECT lives_ok($$SELECT execute_platform_mutation('ffffffff-ffff-4fff-8fff-ffffffffff12','11111111-1111-1111-1111-111111111111','{"operation":"upsert","table":"work_ratings","payload":{"work_order_id":"ffffffff-ffff-4fff-8fff-ffffffffff10","rating":4}}')$$,'Resident can change own work rating');
SELECT is((SELECT rating FROM work_ratings WHERE work_order_id='ffffffff-ffff-4fff-8fff-ffffffffff10' AND user_id=auth.uid()),4::smallint,'Updated work rating is retained');

SELECT throws_ok($$SELECT create_post_bundle(
  '{"id":"ffffffff-ffff-4fff-8fff-ffffffffff20","type":"post","content":"Проверка отката публикации","territory":"complex"}',
  '[{"url":"invalid.bin","type":"unsupported"}]',
  NULL,
  NULL,
  NULL
)$$,'22P02',NULL,'Invalid child row rejects the whole post bundle');
SELECT is((SELECT count(*) FROM posts WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff20'),0::bigint,'Rejected post bundle leaves no partial parent post');

SELECT lives_ok($$SELECT create_post_bundle(
  '{"id":"ffffffff-ffff-4fff-8fff-ffffffffff21","type":"poll","title":"Проверка атомарного опроса","content":"Выберите вариант","territory":"complex"}',
  '[]',
  '{"is_multiple":false,"options":[{"text":"Да"},{"text":"Нет"}]}',
  NULL,
  NULL
)$$,'Valid post bundle is created atomically');
SELECT is((SELECT count(*) FROM polls p JOIN poll_options o ON o.poll_id=p.id WHERE p.post_id='ffffffff-ffff-4fff-8fff-ffffffffff21'),2::bigint,'Atomic poll contains both options');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000003',true);
SELECT throws_ok($$SELECT create_post_bundle(
  '{"id":"ffffffff-ffff-4fff-8fff-ffffffffff22","type":"fundraiser","title":"Проверка отката сбора","content":"Некорректная сумма","territory":"complex","is_official":true}',
  '[]',
  NULL,
  NULL,
  '{"target_amount":-1,"currency":"KZT","status":"active"}'
)$$,NULL,NULL,'Invalid fundraiser rejects the whole post bundle');
SELECT is((SELECT count(*) FROM posts WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff22'),0::bigint,'Rejected fundraiser leaves no partial parent post');
SELECT * FROM finish();
ROLLBACK;
