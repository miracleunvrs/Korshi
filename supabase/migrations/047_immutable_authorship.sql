-- Авторство.
-- Политика изменения объявлений проверяла только ЖК, но не автора: житель мог
-- переписать своё объявление на соседа и опубликовать что угодно от его имени.
-- Теперь автор и ЖК объявления не меняются.
-- SOS-вызов житель мог сразу создать «принятым» с подставленным сотрудником.

CREATE OR REPLACE FUNCTION keep_record_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  author_column TEXT := TG_ARGV[0];
BEGIN
  IF to_jsonb(NEW) -> author_column IS DISTINCT FROM to_jsonb(OLD) -> author_column
     OR NEW.complex_id IS DISTINCT FROM OLD.complex_id THEN
    RAISE EXCEPTION 'Автора и ЖК записи изменить нельзя' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classifieds_keep_author ON classifieds;
CREATE TRIGGER classifieds_keep_author BEFORE UPDATE ON classifieds
  FOR EACH ROW EXECUTE FUNCTION keep_record_author('author_id');

CREATE OR REPLACE FUNCTION sos_incident_resident_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT auth_user_is_security() THEN
    NEW.status := 'active';
    NEW.acknowledged_by := NULL;
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sos_incident_resident_insert ON sos_incidents;
CREATE TRIGGER sos_incident_resident_insert BEFORE INSERT ON sos_incidents
  FOR EACH ROW EXECUTE FUNCTION sos_incident_resident_insert();
