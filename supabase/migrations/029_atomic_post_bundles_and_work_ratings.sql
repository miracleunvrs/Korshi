-- Residents may correct their own rating while the related work remains
-- completed and visible in their active complex.
CREATE POLICY work_ratings_update_own
ON public.work_ratings
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.work_orders work
    WHERE work.id = work_order_id
      AND work.complex_id = public.auth_user_complex_id()
      AND work.status = 'completed'
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.work_orders work
    WHERE work.id = work_order_id
      AND work.complex_id = public.auth_user_complex_id()
      AND work.status = 'completed'
  )
);

-- A post and all of its optional children are one user-visible operation.
-- Any invalid or unauthorized child raises and rolls the whole statement back.
CREATE FUNCTION public.create_post_bundle(
  p_post JSONB,
  p_attachments JSONB DEFAULT '[]'::JSONB,
  p_poll JSONB DEFAULT NULL,
  p_initiative JSONB DEFAULT NULL,
  p_fundraiser JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  post_id UUID := COALESCE(NULLIF(p_post->>'id', '')::UUID, gen_random_uuid());
  poll_id UUID;
  attachment JSONB;
  option_row JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_post) IS DISTINCT FROM 'object'
     OR jsonb_typeof(COALESCE(p_attachments, '[]'::JSONB)) IS DISTINCT FROM 'array'
     OR (p_poll IS NOT NULL AND jsonb_typeof(p_poll) IS DISTINCT FROM 'object')
     OR (p_initiative IS NOT NULL AND jsonb_typeof(p_initiative) IS DISTINCT FROM 'object')
     OR (p_fundraiser IS NOT NULL AND jsonb_typeof(p_fundraiser) IS DISTINCT FROM 'object') THEN
    RAISE EXCEPTION 'Invalid post bundle' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.posts (
    id,
    author_id,
    complex_id,
    building_id,
    entrance_id,
    type,
    title,
    content,
    status,
    is_official,
    territory,
    price,
    currency
  )
  VALUES (
    post_id,
    auth.uid(),
    public.auth_user_complex_id(),
    NULLIF(p_post->>'building_id', '')::UUID,
    NULLIF(p_post->>'entrance_id', '')::UUID,
    COALESCE(NULLIF(p_post->>'type', '')::post_type, 'post'::post_type),
    NULLIF(p_post->>'title', ''),
    p_post->>'content',
    COALESCE(NULLIF(p_post->>'status', '')::post_status, 'active'::post_status),
    COALESCE((p_post->>'is_official')::BOOLEAN, FALSE),
    COALESCE(NULLIF(p_post->>'territory', '')::territory_type, 'complex'::territory_type),
    NULLIF(p_post->>'price', '')::NUMERIC,
    COALESCE(NULLIF(p_post->>'currency', ''), 'KZT')
  );

  FOR attachment IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_attachments, '[]'::JSONB))
  LOOP
    INSERT INTO public.post_attachments (post_id, url, type, name, size)
    VALUES (
      post_id,
      attachment->>'url',
      COALESCE(NULLIF(attachment->>'type', '')::attachment_type, 'image'::attachment_type),
      NULLIF(attachment->>'name', ''),
      NULLIF(attachment->>'size', '')::BIGINT
    );
  END LOOP;

  IF p_poll IS NOT NULL THEN
    IF jsonb_typeof(COALESCE(p_poll->'options', '[]'::JSONB)) IS DISTINCT FROM 'array'
       OR jsonb_array_length(COALESCE(p_poll->'options', '[]'::JSONB)) < 2 THEN
      RAISE EXCEPTION 'Poll requires at least two options' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.polls (post_id, is_multiple, ends_at)
    VALUES (
      post_id,
      COALESCE((p_poll->>'is_multiple')::BOOLEAN, FALSE),
      NULLIF(p_poll->>'ends_at', '')::TIMESTAMPTZ
    )
    RETURNING id INTO poll_id;

    FOR option_row IN
      SELECT value FROM jsonb_array_elements(p_poll->'options')
    LOOP
      INSERT INTO public.poll_options (poll_id, text, position)
      VALUES (
        poll_id,
        option_row->>'text',
        COALESCE((option_row->>'position')::SMALLINT, 0)
      );
    END LOOP;
  END IF;

  IF p_initiative IS NOT NULL THEN
    INSERT INTO public.initiatives (post_id, stage, goal)
    VALUES (
      post_id,
      COALESCE(NULLIF(p_initiative->>'stage', '')::initiative_stage, 'proposal'::initiative_stage),
      NULLIF(p_initiative->>'goal', '')
    );
  END IF;

  IF p_fundraiser IS NOT NULL THEN
    INSERT INTO public.fundraisers (
      id,
      post_id,
      initiative_id,
      target_amount,
      currency,
      payment_url,
      qr_url,
      ends_at,
      status
    )
    VALUES (
      COALESCE(NULLIF(p_fundraiser->>'id', '')::UUID, gen_random_uuid()),
      post_id,
      NULLIF(p_fundraiser->>'initiative_id', '')::UUID,
      (p_fundraiser->>'target_amount')::NUMERIC,
      COALESCE(NULLIF(p_fundraiser->>'currency', ''), 'KZT'),
      NULLIF(p_fundraiser->>'payment_url', ''),
      NULLIF(p_fundraiser->>'qr_url', ''),
      NULLIF(p_fundraiser->>'ends_at', '')::TIMESTAMPTZ,
      COALESCE(NULLIF(p_fundraiser->>'status', '')::fundraiser_status, 'active'::fundraiser_status)
    );
  END IF;

  RETURN post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_post_bundle(JSONB, JSONB, JSONB, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_post_bundle(JSONB, JSONB, JSONB, JSONB, JSONB) TO authenticated;
