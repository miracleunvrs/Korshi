-- Фоновые задачи и доставка.
-- * close_expired_official_votes никто не вызывал: голосования навсегда
--   оставались active, пропуска после срока — действующими.
-- * Массовая рассылка из админки сохранялась со статусом pending, но её никто
--   не обрабатывал — жители ничего не получали.
-- * Исполнитель не узнавал о назначенной ему заявке, диспетчер — о новой.

CREATE OR REPLACE FUNCTION expire_access_passes()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected INTEGER;
BEGIN
  UPDATE access_passes SET status = 'expired' WHERE status = 'active' AND valid_until <= NOW();
  GET DIAGNOSTICS affected = ROW_COUNT;
  UPDATE parking_bookings SET status = 'completed' WHERE status = 'confirmed' AND ends_at <= NOW();
  RETURN affected;
END; $$;

REVOKE ALL ON FUNCTION expire_access_passes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION expire_access_passes() TO service_role;

-- Расписание: pg_cron есть в Supabase; локальные окружения без него пропускают шаг.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.schedule('korshi-close-expired-votes', '*/5 * * * *', 'SELECT public.close_expired_official_votes()');
    PERFORM cron.schedule('korshi-expire-passes', '*/5 * * * *', 'SELECT public.expire_access_passes()');
  END IF;
END $$;

-- Рассылка доставляется в приложение сразу при создании.
CREATE OR REPLACE FUNCTION deliver_notification_broadcast()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> 'pending' OR NEW.scheduled_at > NOW() OR NOT ('in_app' = ANY(NEW.channels)) THEN
    RETURN NEW;
  END IF;
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT profile.id, 'broadcast', NEW.title, NEW.body, jsonb_build_object('broadcast_id', NEW.id)
  FROM profiles profile
  WHERE profile.complex_id = NEW.complex_id AND profile.verified AND profile.id <> NEW.created_by;
  NEW.status := 'sent';
  RETURN NEW;
END; $$;

CREATE TRIGGER deliver_notification_broadcast_before_insert
  BEFORE INSERT ON notification_broadcasts
  FOR EACH ROW EXECUTE FUNCTION deliver_notification_broadcast();

-- Новая заявка: ОСИ и диспетчеры ЖК.
CREATE OR REPLACE FUNCTION notify_management_on_service_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT DISTINCT profile.id,
         'service_request',
         CASE WHEN NEW.priority = 'emergency' THEN 'Аварийная заявка жителя' ELSE 'Новая заявка жителя' END,
         NEW.title || ' · ' || NEW.location,
         jsonb_build_object('service_request_id', NEW.id, 'status', NEW.status)
  FROM profiles profile
  WHERE profile.complex_id = NEW.complex_id
    AND profile.verified
    AND profile.id <> NEW.created_by
    AND (
      profile.role IN ('hoa_official', 'admin')
      OR EXISTS (
        SELECT 1 FROM complex_memberships membership
        WHERE membership.user_id = profile.id AND membership.complex_id = NEW.complex_id
          AND membership.is_active AND membership.is_verified AND membership.role = 'dispatcher'
      )
    );
  RETURN NEW;
END; $$;

-- Назначенный исполнитель получает уведомление.
CREATE OR REPLACE FUNCTION notify_assignee_on_service_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id <> NEW.created_by THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (NEW.assignee_id, 'service_request', 'Вам назначена заявка', NEW.title || ' · ' || NEW.location,
      jsonb_build_object('service_request_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_assignee_after_service_request_update
  AFTER UPDATE OF assignee_id ON service_requests
  FOR EACH ROW EXECUTE FUNCTION notify_assignee_on_service_request();

-- Хронология аварии и взносы тоже обновляются в реальном времени.
DO $$
DECLARE table_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN RETURN; END IF;
  FOREACH table_name IN ARRAY ARRAY['emergency_updates', 'fundraiser_payments'] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;
