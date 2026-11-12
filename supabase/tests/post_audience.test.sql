BEGIN;
SELECT no_plan();
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);

SELECT lives_ok($$SELECT create_post_bundle(
  '{"id":"ffffffff-ffff-4fff-8fff-ffffffffff31","type":"post","content":"Только дом 1","territory":"building","building_id":"22222222-2222-2222-2222-222222222221","entrance_id":null}'
)$$,'Mobile building payload creates a post');
SELECT lives_ok($$SELECT create_post_bundle(
  '{"id":"ffffffff-ffff-4fff-8fff-ffffffffff32","type":"post","content":"Только подъезд 1","territory":"entrance","building_id":"22222222-2222-2222-2222-222222222221","entrance_id":"33333333-3333-3333-3333-333333333331"}'
)$$,'Mobile entrance payload creates a post');
SELECT is((SELECT count(*) FROM posts WHERE id IN ('ffffffff-ffff-4fff-8fff-ffffffffff31','ffffffff-ffff-4fff-8fff-ffffffffff32')),2::bigint,'Author can read both posts');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
SELECT is((SELECT count(*) FROM posts WHERE id IN ('ffffffff-ffff-4fff-8fff-ffffffffff31','ffffffff-ffff-4fff-8fff-ffffffffff32')),2::bigint,'Different resident in same entrance can read both posts');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000004',true);
SELECT is((SELECT count(*) FROM posts WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff31'),1::bigint,'Resident in another entrance can read building post');
SELECT is((SELECT count(*) FROM posts WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff32'),0::bigint,'Resident in another entrance cannot read entrance post');

-- Move the ordinary resident fixture within this rollback-only transaction.
RESET ROLE;
UPDATE profiles SET apartment_id='44444444-4444-4444-4444-444444444405'
WHERE id='eeeeeeee-eeee-4eee-8eee-000000000002';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
SELECT is((SELECT count(*) FROM posts WHERE id IN ('ffffffff-ffff-4fff-8fff-ffffffffff31','ffffffff-ffff-4fff-8fff-ffffffffff32')),0::bigint,'Ordinary resident in another building cannot read either post');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000006',true);
SELECT is((SELECT count(*) FROM posts WHERE id IN ('ffffffff-ffff-4fff-8fff-ffffffffff31','ffffffff-ffff-4fff-8fff-ffffffffff32')),0::bigint,'Other complex cannot read either post');
SELECT * FROM finish();
ROLLBACK;
