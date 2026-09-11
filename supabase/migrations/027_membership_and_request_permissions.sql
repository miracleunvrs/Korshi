-- Membership roles are changed by management only. Residents switch context
-- exclusively through the verified, atomic switch_active_membership RPC.
DROP POLICY IF EXISTS memberships_switch_own ON public.complex_memberships;

CREATE OR REPLACE FUNCTION can_view_service_request(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM service_requests request
    WHERE request.id = p_request_id
      AND (
        request.created_by = auth.uid()
        OR request.assignee_id = auth.uid()
        OR (
          request.complex_id = auth_user_complex_id()
          AND (
            auth_user_can_manage()
            OR (request.public_for_complex AND auth_user_verified())
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION update_service_request_status(
  p_request_id UUID,
  p_status service_request_status,
  p_note TEXT DEFAULT NULL,
  p_assignee_id UUID DEFAULT NULL,
  p_assignee_name TEXT DEFAULT NULL,
  p_sla_due_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS service_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row service_requests;
  previous_status service_request_status;
BEGIN
  SELECT * INTO request_row FROM service_requests WHERE id = p_request_id FOR UPDATE;
  IF request_row.id IS NULL OR request_row.complex_id <> auth_user_complex_id() THEN
    RAISE EXCEPTION 'Service request is not accessible';
  END IF;
  IF COALESCE(NOT auth_user_can_manage(), TRUE)
     AND request_row.assignee_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only management or assigned provider can update status';
  END IF;
  IF p_assignee_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM profiles assignee
    WHERE assignee.id = p_assignee_id
      AND assignee.complex_id = request_row.complex_id
      AND assignee.role IN ('service_provider', 'hoa_official', 'admin')
  ) THEN
    RAISE EXCEPTION 'Assignee must be an eligible member of the same complex';
  END IF;
  IF COALESCE(NOT auth_user_can_manage(), TRUE)
     AND (p_assignee_id IS NOT NULL OR NULLIF(trim(p_assignee_name), '') IS NOT NULL OR p_sla_due_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Only management can change assignment or SLA';
  END IF;

  previous_status := request_row.status;
  UPDATE service_requests
  SET status = p_status,
      assignee_id = COALESCE(p_assignee_id, assignee_id),
      assignee_name = COALESCE(NULLIF(trim(p_assignee_name), ''), assignee_name),
      sla_due_at = COALESCE(p_sla_due_at, sla_due_at),
      resolution_note = CASE WHEN p_status = 'resolved' THEN COALESCE(NULLIF(trim(p_note), ''), resolution_note) ELSE resolution_note END,
      resolved_at = CASE WHEN p_status = 'resolved' THEN NOW() ELSE resolved_at END,
      closed_at = CASE WHEN p_status = 'closed' THEN NOW() ELSE closed_at END
  WHERE id = p_request_id
  RETURNING * INTO request_row;

  INSERT INTO service_request_events (request_id, actor_id, kind, message, metadata)
  VALUES (
    p_request_id,
    auth.uid(),
    CASE WHEN p_status = 'resolved' THEN 'resolution'::service_request_event_kind ELSE 'status_changed'::service_request_event_kind END,
    NULLIF(trim(p_note), ''),
    jsonb_build_object('from', previous_status, 'to', p_status, 'assignee_name', p_assignee_name)
  );
  RETURN request_row;
END;
$$;


DROP POLICY IF EXISTS service_requests_update_management ON public.service_requests;
-- Status changes go through the RPC so history and notification remain consistent.
-- No direct UPDATE grant via RLS for client roles.
DROP POLICY IF EXISTS service_requests_insert_verified ON public.service_requests;
CREATE POLICY service_requests_insert_verified ON public.service_requests FOR INSERT TO authenticated WITH CHECK (
  created_by=(SELECT auth.uid()) AND complex_id=(SELECT public.auth_user_complex_id())
  AND (SELECT public.auth_user_verified()) AND status='submitted' AND rating IS NULL
  AND assignee_id IS NULL AND assignee_name IS NULL AND resolved_at IS NULL AND closed_at IS NULL
);
