BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

SELECT is(to_regclass('public.visitor_passes'),NULL,'The old visitor pass table is gone');
SELECT is(to_regclass('public.resident_payments'),NULL,'Unused payment tables are gone');

SELECT ok(NOT has_function_privilege('anon','public.create_apartment_invite(uuid)','EXECUTE'),
  'Guests cannot call RPCs');
SELECT ok(has_function_privilege('authenticated','public.create_apartment_invite(uuid)','EXECUTE'),
  'Signed-in users still can');
SELECT ok(NOT has_function_privilege('authenticated','public.handle_new_user()','EXECUTE'),
  'Trigger functions are not callable over RPC');
SELECT ok(has_function_privilege('anon','public.auth_user_complex_id()','EXECUTE'),
  'Policy helpers stay callable so guest queries are filtered, not failed');

SELECT is((
  SELECT count(*)::int FROM pg_constraint c
  WHERE c.contype='f' AND c.connamespace='public'::regnamespace AND array_length(c.conkey,1)=1
    AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.conrelid AND i.indkey[0]=c.conkey[1])
),0,'Every foreign key has an index');

SELECT * FROM finish();
ROLLBACK;
