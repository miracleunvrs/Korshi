-- Заявки на подтверждение.
-- Политика вставки проверяла только user_id, поэтому житель мог сам записать
-- заявку со статусом «одобрено», указать любого проверяющего и причину, а
-- также отправлять заявки без ограничений. Теперь житель создаёт только новую
-- заявку на проверку со своим документом и не больше одной одновременно.

DROP POLICY IF EXISTS "verification_requests_insert_self" ON verification_requests;
CREATE POLICY "verification_requests_insert_self" ON verification_requests
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'::verification_request_status
    AND reviewed_by IS NULL
    AND review_reason IS NULL
    AND document_path LIKE auth.uid()::TEXT || '/verification/%'
  );

CREATE OR REPLACE FUNCTION verification_request_single_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('verification_request:' || NEW.user_id::TEXT));
  IF EXISTS (
    SELECT 1 FROM verification_requests
    WHERE user_id = NEW.user_id AND status = 'pending'::verification_request_status
  ) THEN
    RAISE EXCEPTION 'У вас уже есть заявка на проверке. Дождитесь решения управления.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verification_request_single_pending ON verification_requests;
CREATE TRIGGER verification_request_single_pending BEFORE INSERT ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION verification_request_single_pending();
