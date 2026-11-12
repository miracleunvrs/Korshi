-- Официальный контент ОСИ.
-- Создать официальный пост житель не мог, но мог отредактировать свой обычный
-- пост: `is_official = true` или тип official_news — и получить бейдж ОСИ.
-- Тип official_* при создании тоже не проверялся. Теперь официальные отметка и
-- типы доступны только управлению (председатель или администратор) — и при
-- создании, и при изменении. Сборы тоже может запускать любое управление, как
-- и обещает интерфейс.

CREATE OR REPLACE FUNCTION auth_user_is_management()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(auth_user_verified() AND auth_user_role() IN ('hoa_official', 'admin'), FALSE);
$$;

CREATE OR REPLACE FUNCTION post_is_official_content(p_is_official BOOLEAN, p_type post_type)
RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE AS $$
  SELECT COALESCE(p_is_official, FALSE) OR p_type IN ('official_news', 'official_poll', 'fundraiser');
$$;

DROP POLICY IF EXISTS "posts_insert_verified" ON posts;
CREATE POLICY "posts_insert_verified" ON posts
  FOR INSERT WITH CHECK (
    auth_user_verified() = TRUE
    AND complex_id = auth_user_complex_id()
    AND author_id = auth.uid()
    AND (NOT post_is_official_content(is_official, type) OR auth_user_is_management())
  );

DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE USING (
    complex_id = auth_user_complex_id()
    AND (author_id = auth.uid() OR auth_user_is_management())
  )
  WITH CHECK (
    complex_id = auth_user_complex_id()
    AND (author_id = auth.uid() OR auth_user_is_management())
    AND (NOT post_is_official_content(is_official, type) OR auth_user_is_management())
  );

DROP POLICY IF EXISTS "fundraisers_insert_hoa" ON fundraisers;
CREATE POLICY "fundraisers_insert_hoa" ON fundraisers
  FOR INSERT WITH CHECK (
    auth_user_is_management()
    AND target_amount > 0
    AND post_id IN (SELECT p.id FROM posts p WHERE p.author_id = auth.uid() AND p.complex_id = auth_user_complex_id())
  );

DROP POLICY IF EXISTS "fundraisers_update_hoa" ON fundraisers;
CREATE POLICY "fundraisers_update_hoa" ON fundraisers
  FOR UPDATE USING (
    auth_user_is_management()
    AND post_id IN (SELECT p.id FROM posts p WHERE p.complex_id = auth_user_complex_id())
  )
  WITH CHECK (post_id IN (SELECT p.id FROM posts p WHERE p.complex_id = auth_user_complex_id()));
