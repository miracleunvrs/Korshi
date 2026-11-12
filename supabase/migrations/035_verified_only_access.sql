-- До подтверждения проживания пользователь видел всё закрытое содержимое ЖК:
-- его сразу зачисляли в чаты дома и подъезда, а ленту и профили соседей
-- (с телефонами) пропускала проверка `complex_id = auth_user_complex_id()`.
-- Подтверждение ограничивало только запись. Теперь контекст ЖК есть только у
-- подтверждённого пользователя, а в чаты зачисляют после подтверждения.

-- Контекст ЖК: только подтверждённое активное членство или подтверждённый профиль.
-- Все политики вида `complex_id = auth_user_complex_id()` перестают выдавать
-- строки неподтверждённым пользователям.
CREATE OR REPLACE FUNCTION auth_user_complex_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT membership.complex_id FROM complex_memberships membership
      WHERE membership.user_id = auth.uid() AND membership.is_active AND membership.is_verified LIMIT 1),
    (SELECT profile.complex_id FROM profiles profile WHERE profile.id = auth.uid() AND profile.verified)
  );
$$;

CREATE OR REPLACE FUNCTION auth_user_apartment_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT membership.apartment_id FROM complex_memberships membership
      WHERE membership.user_id = auth.uid() AND membership.is_active AND membership.is_verified LIMIT 1),
    (SELECT profile.apartment_id FROM profiles profile WHERE profile.id = auth.uid() AND profile.verified)
  );
$$;

-- Роль управления даёт только подтверждённое членство.
CREATE OR REPLACE FUNCTION auth_user_membership_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT membership.role FROM complex_memberships membership
      WHERE membership.user_id = auth.uid() AND membership.is_active AND membership.is_verified LIMIT 1),
    CASE (SELECT profile.role::TEXT FROM profiles profile WHERE profile.id = auth.uid() AND profile.verified)
      WHEN 'hoa_official' THEN 'chair' WHEN 'service_provider' THEN 'executor'
      ELSE (SELECT profile.role::TEXT FROM profiles profile WHERE profile.id = auth.uid() AND profile.verified)
    END
  );
$$;

-- Чаты и сообщения доступны только подтверждённым участникам.
CREATE OR REPLACE FUNCTION is_chat_member(p_chat_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT verified FROM profiles WHERE id = auth.uid()), FALSE)
    AND EXISTS (SELECT 1 FROM chat_members WHERE chat_id = p_chat_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION enroll_profile_in_chats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.complex_id IS NULL OR NOT NEW.verified THEN
    RETURN NEW;
  END IF;

  INSERT INTO chat_members (chat_id, user_id)
  SELECT c.id, NEW.id
  FROM chats c
  WHERE c.complex_id = NEW.complex_id
    AND (
      c.type IN ('complex', 'thematic')
      OR (c.type = 'building' AND c.building_id IN (
        SELECT e.building_id FROM apartments a JOIN entrances e ON e.id = a.entrance_id WHERE a.id = NEW.apartment_id
      ))
      OR (c.type = 'entrance' AND c.entrance_id IN (
        SELECT a.entrance_id FROM apartments a WHERE a.id = NEW.apartment_id
      ))
    )
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Зачисление срабатывает и в момент подтверждения.
DROP TRIGGER IF EXISTS on_profile_enroll_in_chats ON profiles;
CREATE TRIGGER on_profile_enroll_in_chats
  AFTER INSERT OR UPDATE OF complex_id, apartment_id, verified ON profiles
  FOR EACH ROW EXECUTE FUNCTION enroll_profile_in_chats();

-- Убираем уже выданное неподтверждённым членство в общих чатах.
DELETE FROM chat_members member
USING chats chat, profiles profile
WHERE member.chat_id = chat.id
  AND profile.id = member.user_id
  AND NOT profile.verified
  AND chat.type <> 'direct';

-- Номера домов уникальны только внутри ЖК. Привязываем профиль к квартире,
-- лишь если адрес совпал ровно с одной квартирой; иначе ЖК определит
-- администратор при подтверждении.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requested_role user_role;
  matched_apartment_id UUID;
  matched_complex_id UUID;
  match_count INTEGER;
BEGIN
  requested_role := CASE
    WHEN NEW.raw_user_meta_data ->> 'role' = 'service_provider' THEN 'service_provider'::user_role
    ELSE 'resident'::user_role
  END;

  SELECT COUNT(*), MIN(a.id::TEXT)::UUID, MIN(b.complex_id::TEXT)::UUID
    INTO match_count, matched_apartment_id, matched_complex_id
  FROM apartments a
  JOIN entrances e ON e.id = a.entrance_id
  JOIN buildings b ON b.id = e.building_id
  WHERE b.number = NEW.raw_user_meta_data ->> 'building_number'
    AND e.number = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'entrance_number', '')::INT, 1)
    AND a.number = NEW.raw_user_meta_data ->> 'apartment_number';

  IF match_count <> 1 THEN
    matched_apartment_id := NULL;
    matched_complex_id := NULL;
  END IF;

  INSERT INTO profiles (id, phone, full_name, avatar_url, role, complex_id, apartment_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, NULLIF(NEW.raw_user_meta_data ->> 'phone', '')),
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    requested_role,
    matched_complex_id,
    matched_apartment_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Правка своего профиля сравнивает адрес с сохранённым в профиле, а не с
-- контекстом ЖК: иначе неподтверждённый пользователь не смог бы изменить даже имя.
CREATE OR REPLACE FUNCTION own_profile_complex_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT complex_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION own_profile_apartment_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT apartment_id FROM profiles WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = auth_user_role()
    AND verified = auth_user_verified()
    AND complex_id IS NOT DISTINCT FROM own_profile_complex_id()
    AND apartment_id IS NOT DISTINCT FROM own_profile_apartment_id()
  );
