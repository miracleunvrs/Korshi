-- Аккаунты, созданные до триггера handle_new_user, остались без профиля.
-- Без него не работает ничего, начиная с погашения кода ОСИ.
-- Телефон уникален: если он уже записан у другого профиля, оставляем пустым.
INSERT INTO profiles (id, full_name, phone)
SELECT
  account.id,
  NULLIF(account.raw_user_meta_data ->> 'full_name', ''),
  CASE WHEN NOT EXISTS (SELECT 1 FROM profiles taken WHERE taken.phone = candidate.phone)
    THEN candidate.phone END
FROM auth.users account
CROSS JOIN LATERAL (
  SELECT COALESCE(account.phone, NULLIF(account.raw_user_meta_data ->> 'phone', '')) AS phone
) candidate
WHERE NOT EXISTS (SELECT 1 FROM profiles profile WHERE profile.id = account.id)
ON CONFLICT (id) DO NOTHING;
