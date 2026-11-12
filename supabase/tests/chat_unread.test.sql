BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures: complex chat 551 contains the verified seed residents.
INSERT INTO messages(chat_id,sender_id,content,type,created_at) VALUES
  ('55555555-5555-5555-5555-555555555551','eeeeeeee-eeee-4eee-8eee-000000000002','Первое',  'text', now() - interval '2 minutes'),
  ('55555555-5555-5555-5555-555555555551','eeeeeeee-eeee-4eee-8eee-000000000002','Второе',  'text', now() - interval '1 minute');
SELECT is((SELECT count(*) FROM notifications WHERE data->>'chat_id'='55555555-5555-5555-5555-555555555551'),0::bigint,'Group chat messages do not flood notifications');

UPDATE chat_members SET joined_at = now() - interval '1 hour' WHERE user_id = 'eeeeeeee-eeee-4eee-8eee-000000000001';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
SELECT is((SELECT unread_count FROM chat_summaries() WHERE chat_id='55555555-5555-5555-5555-555555555551'),2::bigint,'Unread count covers messages since joining');
SELECT is((SELECT last_message FROM chat_summaries() WHERE chat_id='55555555-5555-5555-5555-555555555551'),'Второе','Summary shows the latest message');
SELECT lives_ok($$SELECT mark_chat_read('55555555-5555-5555-5555-555555555551')$$,'Resident marks the chat read');
SELECT is((SELECT unread_count FROM chat_summaries() WHERE chat_id='55555555-5555-5555-5555-555555555551'),0::bigint,'Reading the chat clears the counter');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
SELECT lives_ok($$SELECT create_direct_chat('eeeeeeee-eeee-4eee-8eee-000000000001')$$,'Neighbours open a direct chat');
INSERT INTO messages(chat_id,sender_id,content,type) SELECT id, auth.uid(), 'Привет', 'text' FROM chats WHERE type='direct' LIMIT 1;
RESET ROLE;
SELECT is((SELECT count(*) FROM notifications WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000001' AND type='message'),1::bigint,'Direct messages still notify the recipient');

SELECT * FROM finish();
ROLLBACK;
