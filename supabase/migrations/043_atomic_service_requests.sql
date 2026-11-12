-- Создание заявки.
-- Клиент вставлял заявку, затем перечитывал её и отдельно записывал вложения.
-- Если второй или третий шаг падал, заявка уже существовала, а пользователь
-- видел ошибку и отправлял её снова — появлялся дубль без фото. Чаще всего
-- падали видео: хранилище их принимает (022), а таблица вложений — нет.
-- Теперь заявка и вложения создаются одной транзакцией, а повтор с тем же id
-- возвращает уже созданную заявку.

ALTER TABLE service_request_attachments DROP CONSTRAINT IF EXISTS service_request_attachments_mime_type_check;
ALTER TABLE service_request_attachments ADD CONSTRAINT service_request_attachments_mime_type_check
  CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm', 'video/quicktime'));

CREATE OR REPLACE FUNCTION create_service_request(p_request JSONB, p_attachments JSONB DEFAULT '[]'::JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  request_id UUID := COALESCE(NULLIF(p_request->>'id', '')::UUID, gen_random_uuid());
  attachment JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(COALESCE(p_attachments, '[]'::JSONB)) <> 'array' OR jsonb_array_length(COALESCE(p_attachments, '[]'::JSONB)) > 4 THEN
    RAISE EXCEPTION 'Invalid attachments' USING ERRCODE = '22023';
  END IF;

  -- Повтор после потерянного ответа: заявка этого пользователя уже создана.
  IF EXISTS (SELECT 1 FROM service_requests WHERE id = request_id AND created_by = auth.uid()) THEN
    RETURN request_id;
  END IF;

  INSERT INTO service_requests (id, created_by, complex_id, category, title, description, location, priority, public_for_complex)
  VALUES (
    request_id,
    auth.uid(),
    auth_user_complex_id(),
    (p_request->>'category')::service_request_category,
    p_request->>'title',
    p_request->>'description',
    p_request->>'location',
    COALESCE(NULLIF(p_request->>'priority', ''), 'normal')::service_request_priority,
    COALESCE((p_request->>'public_for_complex')::BOOLEAN, FALSE)
  );

  FOR attachment IN SELECT value FROM jsonb_array_elements(COALESCE(p_attachments, '[]'::JSONB)) LOOP
    -- Файл должен лежать в папке этой заявки и принадлежать автору.
    IF attachment->>'path' NOT LIKE auth.uid()::TEXT || '/requests/' || request_id::TEXT || '/%' THEN
      RAISE EXCEPTION 'Attachment path does not belong to this request' USING ERRCODE = '42501';
    END IF;
    INSERT INTO service_request_attachments (request_id, uploader_id, path, file_name, mime_type, size_bytes, kind)
    VALUES (request_id, auth.uid(), attachment->>'path', attachment->>'file_name', attachment->>'mime_type',
      (attachment->>'size_bytes')::BIGINT, 'evidence');
  END LOOP;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION create_service_request(JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_service_request(JSONB, JSONB) TO authenticated;
