-- Хранилище читает загруженный файл обратно (INSERT ... RETURNING), поэтому
-- без правила на чтение загрузка аватара отклонялась. Аватары и так публичны.
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');
