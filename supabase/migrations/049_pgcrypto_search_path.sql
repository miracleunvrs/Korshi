-- В Supabase pgcrypto установлен в схему extensions, а функции 042 и 046 искали
-- gen_random_bytes только в public: выдача кода квартиры и создание пропуска
-- жителем падали с «function gen_random_bytes(integer) does not exist».

ALTER FUNCTION create_apartment_invite(UUID) SET search_path = public, extensions;
ALTER FUNCTION access_pass_resident_guard() SET search_path = public, extensions;
