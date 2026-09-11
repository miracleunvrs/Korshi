-- Atomic idempotency receipts. The executor is SECURITY INVOKER: every operation
-- still goes through the original RLS/RPC authorization checks.
CREATE TABLE public.client_mutation_receipts (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  complex_id uuid NOT NULL REFERENCES public.complexes(id) ON DELETE CASCADE,
  input jsonb NOT NULL,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
ALTER TABLE public.client_mutation_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY receipts_own ON public.client_mutation_receipts TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) );
CREATE INDEX client_mutation_receipts_created_idx ON public.client_mutation_receipts(created_at);

CREATE FUNCTION public.execute_platform_mutation(p_id uuid, p_complex_id uuid, p_mutation jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  op text := p_mutation->>'operation';
  target text := p_mutation->>'table';
  payload jsonb := coalesce(p_mutation->'payload','{}'::jsonb);
  filters jsonb := coalesce(p_mutation->'match','{}'::jsonb);
  receipt public.client_mutation_receipts;
  output jsonb;
  columns_sql text;
  values_sql text;
  assignments_sql text;
  affected integer;
  conflict_columns text;
BEGIN
  IF auth.uid() IS NULL OR p_complex_id IS DISTINCT FROM public.auth_user_complex_id() THEN
    RAISE EXCEPTION 'Session or active complex changed' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.client_mutation_receipts(user_id,id,complex_id,input)
    VALUES(auth.uid(),p_id,p_complex_id,p_mutation) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN
    SELECT * INTO receipt FROM public.client_mutation_receipts WHERE user_id=auth.uid() AND id=p_id;
    IF receipt.input IS DISTINCT FROM p_mutation OR receipt.complex_id IS DISTINCT FROM p_complex_id THEN
      RAISE EXCEPTION 'Idempotency key reused for a different action' USING ERRCODE='23505';
    END IF;
    RETURN receipt.result;
  END IF;
  IF op = 'rpc' THEN
    CASE target
      WHEN 'switch_active_membership' THEN output := to_jsonb(public.switch_active_membership((payload->>'p_membership_id')::uuid));
      WHEN 'book_guest_parking' THEN output := to_jsonb(public.book_guest_parking((payload->>'p_spot_id')::uuid,payload->>'p_vehicle_plate',(payload->>'p_starts_at')::timestamptz,(payload->>'p_ends_at')::timestamptz));
      WHEN 'merge_service_requests' THEN PERFORM public.merge_service_requests((payload->>'p_primary_id')::uuid,(payload->>'p_duplicate_id')::uuid); output := 'null'::jsonb;
      WHEN 'rsvp_community_event' THEN output := to_jsonb(public.rsvp_community_event((payload->>'p_event_id')::uuid,payload->>'p_choice'));
      ELSE RAISE EXCEPTION 'Unsupported platform RPC';
    END CASE;
  ELSE
    IF target IS NULL OR target <> ALL(ARRAY['access_passes','parking_bookings','parking_reports','work_order_checklist_items','work_ratings','community_club_members','community_notices','marketplace_favorites','classifieds','marketplace_reports','marketplace_reviews','notification_preferences','notification_preference_events','complex_settings','sos_incidents','family_invitations','analytics_events','ai_feedback','notification_broadcasts']) THEN
      RAISE EXCEPTION 'Unsupported platform table';
    END IF;
    IF jsonb_typeof(payload) <> 'object' OR jsonb_typeof(filters) <> 'object' THEN RAISE EXCEPTION 'Invalid payload'; END IF;
    SELECT string_agg(format('%I',key),', ' ORDER BY key),string_agg(format('r.%I',key),', ' ORDER BY key),string_agg(format('%I = r.%I',key,key),', ' ORDER BY key)
      INTO columns_sql,values_sql,assignments_sql FROM jsonb_object_keys(payload) AS key;
    IF op IN ('insert','upsert') THEN
      conflict_columns := CASE target WHEN 'notification_preferences' THEN 'user_id, complex_id' WHEN 'complex_settings' THEN 'complex_id' WHEN 'work_ratings' THEN 'work_order_id, user_id' ELSE 'id' END;
      EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) r %s RETURNING to_jsonb(%I.*)',target,columns_sql,values_sql,target,
        CASE WHEN op='upsert' THEN format('ON CONFLICT (%s) DO UPDATE SET %s',conflict_columns,(SELECT string_agg(format('%I=EXCLUDED.%I',key,key),', ') FROM jsonb_object_keys(payload) AS key)) ELSE '' END,target)
        INTO output USING payload;
    ELSIF op IN ('update','delete') THEN
      IF p_mutation->>'recordId' IS NOT NULL THEN filters := filters || jsonb_build_object('id',p_mutation->>'recordId'); END IF;
      IF filters='{}'::jsonb THEN RAISE EXCEPTION 'Mutation requires a filter'; END IF;
      IF op='delete' THEN
        EXECUTE format('WITH changed AS (DELETE FROM public.%I t WHERE to_jsonb(t) @> $1 RETURNING to_jsonb(t) AS row) SELECT jsonb_agg(row) FROM changed',target) INTO output USING filters;
      ELSE
        EXECUTE format('WITH changed AS (UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I,$1) r WHERE to_jsonb(t) @> $2 RETURNING to_jsonb(t) AS row) SELECT jsonb_agg(row) FROM changed',target,assignments_sql,target) INTO output USING payload,filters;
      END IF;
      IF output IS NULL THEN RAISE EXCEPTION 'Record is inaccessible or no longer exists' USING ERRCODE='42501'; END IF;
    ELSE RAISE EXCEPTION 'Unsupported platform operation'; END IF;
  END IF;
  UPDATE public.client_mutation_receipts SET result=output WHERE user_id=auth.uid() AND id=p_id;
  RETURN output;
END;
$$;
REVOKE ALL ON FUNCTION public.execute_platform_mutation(uuid,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_platform_mutation(uuid,uuid,jsonb) TO authenticated;
