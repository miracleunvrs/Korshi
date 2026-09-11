-- Complete the AI audit lifecycle without granting clients arbitrary UPDATE
-- access to ai_jobs. The API calls these functions with the user's session.

CREATE OR REPLACE FUNCTION complete_ai_job(
  p_job_id UUID,
  p_provider_response_id TEXT,
  p_result JSONB,
  p_human_review_required BOOLEAN
)
RETURNS ai_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job ai_jobs;
BEGIN
  IF jsonb_typeof(p_result) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'AI result must be a JSON object';
  END IF;

  UPDATE ai_jobs
  SET provider_response_id = NULLIF(trim(p_provider_response_id), ''),
      result = p_result,
      human_review_required = p_human_review_required,
      status = 'completed',
      error_code = NULL,
      completed_at = NOW()
  WHERE id = p_job_id
    AND user_id = auth.uid()
    AND status IN ('pending', 'running')
  RETURNING * INTO job;

  IF job.id IS NULL THEN RAISE EXCEPTION 'AI job is not accessible or already finished'; END IF;
  RETURN job;
END;
$$;

CREATE OR REPLACE FUNCTION fail_ai_job(p_job_id UUID, p_error_code TEXT)
RETURNS ai_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job ai_jobs;
BEGIN
  UPDATE ai_jobs
  SET status = 'failed',
      error_code = left(COALESCE(NULLIF(trim(p_error_code), ''), 'unknown'), 80),
      completed_at = NOW()
  WHERE id = p_job_id
    AND user_id = auth.uid()
    AND status IN ('pending', 'running')
  RETURNING * INTO job;

  IF job.id IS NULL THEN RAISE EXCEPTION 'AI job is not accessible or already finished'; END IF;
  RETURN job;
END;
$$;

REVOKE ALL ON FUNCTION complete_ai_job(UUID, TEXT, JSONB, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION fail_ai_job(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_ai_job(UUID, TEXT, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION fail_ai_job(UUID, TEXT) TO authenticated;
