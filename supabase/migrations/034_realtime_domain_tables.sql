-- Клиент подписан на изменения этих таблиц, но в публикацию realtime была
-- добавлена только часть ленты и чатов (005). Уведомления, статусы заявок,
-- аварийные сообщения и пропуска приходили лишь после перезагрузки страницы.
-- Подписчики по-прежнему получают только строки, разрешённые им RLS.
DO $$
DECLARE table_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN RETURN; END IF;
  FOREACH table_name IN ARRAY ARRAY[
    'notifications', 'service_requests', 'service_request_events', 'house_documents',
    'house_document_acknowledgements', 'official_votes', 'official_vote_ballots',
    'finance_transactions', 'emergency_alerts', 'home_schedule_items', 'amenity_bookings', 'access_passes'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;
