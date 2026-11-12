-- Чистка схемы.
-- 1. Таблицы, которые не использует ни сайт, ни приложение, ни одна функция
--    или триггер базы. Все пустые. Пропуска гостей живут в access_passes,
--    visitor_passes — старая копия.
-- 2. Функции без фиксированного search_path.
-- 3. SECURITY DEFINER-функции были доступны гостям через /rest/v1/rpc.
--    Триггерные функции закрыты для всех: их не нужно вызывать напрямую.
--    У остальных доступ отнимается только у гостей; права вошедших не
--    меняются, служебные функции остаются закрытыми. Исключение — функции
--    из правил RLS: их вызывает сама проверка доступа на гостевых запросах.
-- 4. Индексы на внешние ключи, у которых их не было.

ALTER TABLE house_documents DROP COLUMN IF EXISTS folder_id;

DROP TABLE IF EXISTS
  payment_receipts,
  resident_payments,
  resident_invoices,
  official_vote_documents,
  official_vote_protocols,
  house_document_folders,
  document_chunks,
  integration_webhook_events,
  moderation_logs,
  notification_delivery_outbox,
  role_permissions,
  service_providers,
  visitor_passes
CASCADE;

ALTER FUNCTION trigger_set_updated_at() SET search_path = public;
ALTER FUNCTION validate_poll_vote() SET search_path = public;
ALTER FUNCTION auth_user_role() SET search_path = public;
ALTER FUNCTION auth_user_verified() SET search_path = public;
ALTER FUNCTION post_is_official_content(BOOLEAN, post_type) SET search_path = public;

DO $$
DECLARE
  fn RECORD;
  policy_sql TEXT;
BEGIN
  SELECT string_agg(coalesce(qual, '') || ' ' || coalesce(with_check, ''), ' ')
  INTO policy_sql
  FROM pg_policies;

  FOR fn IN
    SELECT p.oid::regprocedure AS signature, p.proname, p.prorettype = 'trigger'::regtype AS is_trigger
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
  LOOP
    IF fn.is_trigger THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
    ELSIF policy_sql !~ ('\m' || fn.proname || '\M') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn.signature);
    END IF;
  END LOOP;
END;
$$;

DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT c.conrelid::regclass AS rel, c.conrelid::regclass::text AS rel_name, a.attname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.connamespace = 'public'::regnamespace
      AND array_length(c.conkey, 1) = 1
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1]
      )
  LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (%I)',
      left('idx_' || replace(fk.rel_name, 'public.', '') || '_' || fk.attname, 63), fk.rel, fk.attname);
  END LOOP;
END;
$$;
