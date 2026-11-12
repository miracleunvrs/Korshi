-- Проверка жителей.
-- * Роль admin читала и удаляла файлы любого ЖК, включая паспорта из заявок.
-- * Председатель видел вкладку проверки, но политики пускали только admin.
-- * Житель, чей адрес при регистрации не совпал с квартирой, не попадал ни к
--   одному проверяющему и не мог сменить адрес.
-- Проверяет управление своего ЖК; при одобрении адрес из заявки становится
-- адресом профиля.

CREATE OR REPLACE FUNCTION auth_user_can_verify()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(auth_user_verified() AND auth_user_role() IN ('admin', 'hoa_official'), FALSE);
$$;

-- Проверяющий видит заявителей своего ЖК, а также ещё не привязанных
-- пользователей, указавших дом его ЖК.
CREATE OR REPLACE FUNCTION can_review_applicant(p_user_id UUID, p_building_number TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth_user_can_verify() AND EXISTS (
    SELECT 1 FROM profiles applicant
    WHERE applicant.id = p_user_id
      AND (
        applicant.complex_id = auth_user_complex_id()
        OR (applicant.complex_id IS NULL AND EXISTS (
          SELECT 1 FROM buildings building
          WHERE building.complex_id = auth_user_complex_id() AND building.number = p_building_number
        ))
      )
  );
$$;

DROP POLICY IF EXISTS "verification_requests_select_self_or_admin" ON verification_requests;
CREATE POLICY "verification_requests_select_self_or_reviewer" ON verification_requests
  FOR SELECT USING (user_id = auth.uid() OR can_review_applicant(user_id, building_number));

-- Решение принимается только через review_verification_request.
DROP POLICY IF EXISTS "verification_requests_update_admin" ON verification_requests;

CREATE OR REPLACE FUNCTION review_verification_request(
  p_request_id UUID,
  p_approved BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS verification_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row verification_requests;
  reviewer UUID := auth.uid();
  reviewer_complex UUID := auth_user_complex_id();
  target_apartment UUID;
BEGIN
  IF reviewer IS NULL OR NOT auth_user_can_verify() THEN
    RAISE EXCEPTION 'Only complex management can review verification requests' USING ERRCODE = '42501';
  END IF;

  SELECT vr.* INTO request_row
  FROM verification_requests vr
  WHERE vr.id = p_request_id AND can_review_applicant(vr.user_id, vr.building_number)
  FOR UPDATE;

  IF request_row.id IS NULL OR request_row.status <> 'pending'::verification_request_status THEN
    RAISE EXCEPTION 'Verification request is not pending or not accessible';
  END IF;

  IF p_approved THEN
    SELECT apartment.id INTO target_apartment
    FROM apartments apartment
    JOIN entrances entrance ON entrance.id = apartment.entrance_id
    JOIN buildings building ON building.id = entrance.building_id
    WHERE building.complex_id = reviewer_complex
      AND building.number = request_row.building_number
      AND entrance.number = request_row.entrance_number
      AND apartment.number = request_row.apartment_number;
    IF target_apartment IS NULL THEN
      RAISE EXCEPTION 'Квартира из заявки не найдена в этом ЖК' USING ERRCODE = 'P0001';
    END IF;

    -- Профиль обновляется до заявки: триггер одобрения создаёт членство по
    -- уже подтверждённому адресу.
    UPDATE profiles
    SET verified = TRUE, verified_at = NOW(), verified_by = reviewer,
        complex_id = reviewer_complex, apartment_id = target_apartment
    WHERE id = request_row.user_id;

    UPDATE complex_memberships membership
    SET apartment_id = target_apartment, updated_at = NOW()
    WHERE membership.user_id = request_row.user_id
      AND membership.complex_id = reviewer_complex
      AND membership.is_active
      AND membership.apartment_id IS DISTINCT FROM target_apartment
      AND NOT EXISTS (
        SELECT 1 FROM complex_memberships other
        WHERE other.user_id = membership.user_id AND other.complex_id = membership.complex_id
          AND other.apartment_id = target_apartment AND other.role = membership.role
      );
  END IF;

  UPDATE verification_requests
  SET status = CASE WHEN p_approved THEN 'approved'::verification_request_status ELSE 'rejected'::verification_request_status END,
      reviewed_by = reviewer,
      review_reason = CASE WHEN p_approved THEN NULL ELSE NULLIF(p_reason, '') END
  WHERE id = request_row.id
  RETURNING * INTO request_row;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    request_row.user_id,
    'verification',
    CASE WHEN p_approved THEN 'Статус подтверждён' ELSE 'Заявка отклонена' END,
    CASE WHEN p_approved THEN 'Теперь вам доступны функции подтверждённого жителя.'
         ELSE COALESCE(NULLIF(p_reason, ''), 'Проверьте данные и отправьте заявку повторно.') END,
    jsonb_build_object('request_id', request_row.id, 'status', request_row.status)
  );

  RETURN request_row;
END;
$$;

REVOKE ALL ON FUNCTION review_verification_request(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION review_verification_request(UUID, BOOLEAN, TEXT) TO authenticated;

-- Хранилище: свои файлы; документы заявки — проверяющему ЖК заявителя;
-- медиа постов — подтверждённым жителям того же ЖК; вложения чатов —
-- участникам чата. Отдельные политики для заявок и документов дома остаются.
DROP POLICY IF EXISTS "house_media_read_scoped" ON storage.objects;
CREATE POLICY "house_media_read_scoped" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'house-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR (
        (storage.foldername(name))[2] = 'verification'
        AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
        AND EXISTS (
          SELECT 1 FROM verification_requests request
          WHERE request.user_id = ((storage.foldername(name))[1])::UUID
            AND request.document_path = name
            AND can_review_applicant(request.user_id, request.building_number)
        )
      )
      OR (
        (storage.foldername(name))[2] = 'posts'
        AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
        AND EXISTS (
          SELECT 1 FROM profiles owner_profile
          WHERE owner_profile.id = ((storage.foldername(name))[1])::UUID
            AND owner_profile.complex_id = auth_user_complex_id()
        )
      )
      OR (
        (storage.foldername(name))[2] = 'chats'
        AND (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
        AND is_chat_member(((storage.foldername(name))[3])::UUID)
      )
    )
  );

-- Удалять можно только свои файлы.
DROP POLICY IF EXISTS "house_media_delete_own_or_admin" ON storage.objects;
CREATE POLICY "house_media_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'house-media' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
