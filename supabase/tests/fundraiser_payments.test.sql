BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures from seeds/diploma.sql: user 2 is a resident, 3 the chair.
INSERT INTO posts(id,author_id,complex_id,type,title,content,territory,status,is_official)
VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffe1','eeeeeeee-eeee-4eee-8eee-000000000003','11111111-1111-1111-1111-111111111111','fundraiser','Сбор на лифт','Ремонт','complex','active',true);
INSERT INTO fundraisers(id,post_id,target_amount,status) VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffe2','ffffffff-ffff-4fff-8fff-ffffffffffe1',100000,'active');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
SELECT is((SELECT status FROM record_fundraiser_payment('ffffffff-ffff-4fff-8fff-ffffffffffe2', 5000, NULL, true)),'pending','A declared transfer waits for confirmation');
SELECT is((SELECT current_amount FROM fundraisers WHERE id='ffffffff-ffff-4fff-8fff-ffffffffffe2'),0::numeric,'Unconfirmed transfer does not count towards the total');
SELECT throws_ok($$SELECT record_fundraiser_payment('ffffffff-ffff-4fff-8fff-ffffffffffe2', 99000000000)$$,NULL,NULL,'Absurd amounts are rejected');
SELECT throws_ok($$SELECT review_fundraiser_payment((SELECT id FROM fundraiser_payments WHERE user_id=auth.uid() LIMIT 1), true)$$,'42501',NULL,'Payer cannot confirm their own transfer');
SELECT is((SELECT count(*) FROM fundraiser_payments WHERE user_id=auth.uid()),1::bigint,'Payer sees their own anonymous declaration');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
SELECT is((SELECT count(*) FROM fundraiser_payments),0::bigint,'Neighbours do not see pending or anonymous transfers');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000003',true);
SELECT is((SELECT count(*) FROM fundraiser_payments WHERE status='pending'),1::bigint,'Management sees the pending anonymous transfer');
SELECT lives_ok($$SELECT review_fundraiser_payment((SELECT id FROM fundraiser_payments WHERE status='pending' LIMIT 1), true)$$,'Chair confirms the transfer');
SELECT is((SELECT current_amount FROM fundraisers WHERE id='ffffffff-ffff-4fff-8fff-ffffffffffe2'),5000::numeric,'Confirmed transfer counts towards the total');
SELECT throws_ok($$SELECT review_fundraiser_payment((SELECT id FROM fundraiser_payments LIMIT 1), true)$$,NULL,NULL,'A transfer cannot be confirmed twice');
RESET ROLE;
SELECT is((SELECT count(*) FROM notifications WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000002' AND title='Взнос подтверждён'),1::bigint,'Payer is notified about the confirmation');

SELECT * FROM finish();
ROLLBACK;
