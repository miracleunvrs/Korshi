-- Сборы средств.
-- Кнопка «Оплатить» ничего не списывала: житель вводил любую сумму, она сразу
-- считалась подтверждённой и попадала в прогресс сбора. Теперь это заявление о
-- переводе: сумма ждёт проверки управлением ЖК и входит в прогресс только после
-- подтверждения поступления.

ALTER TABLE fundraiser_payments
  ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  ADD COLUMN reviewed_by UUID REFERENCES profiles(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ;

-- Прежние записи никто не проверял: отправляем их на проверку и пересчитываем
-- собранное только по подтверждённым поступлениям.
UPDATE fundraiser_payments SET status = 'pending', confirmed_at = NULL;
UPDATE fundraisers SET current_amount = 0;

CREATE INDEX idx_fundraiser_payments_pending ON fundraiser_payments(fundraiser_id) WHERE status = 'pending';

-- Плательщик видит свои заявления, жители — подтверждённые неанонимные
-- взносы, управление ЖК — все взносы своего ЖК (иначе анонимный перевод
-- нельзя было бы сверить с выпиской).
DROP POLICY IF EXISTS "fundraiser_payments_select" ON fundraiser_payments;
CREATE POLICY "fundraiser_payments_select" ON fundraiser_payments
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM fundraisers fundraiser JOIN posts post ON post.id = fundraiser.post_id
      WHERE fundraiser.id = fundraiser_payments.fundraiser_id
        AND post.complex_id = auth_user_complex_id()
        AND (auth_user_is_management() OR (fundraiser_payments.status = 'confirmed' AND NOT fundraiser_payments.is_anonymous))
    )
  );

CREATE OR REPLACE FUNCTION record_fundraiser_payment(
  p_fundraiser_id UUID,
  p_amount NUMERIC,
  p_comment TEXT DEFAULT NULL,
  p_is_anonymous BOOLEAN DEFAULT FALSE
)
RETURNS fundraiser_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment fundraiser_payments;
  fundraiser fundraisers;
BEGIN
  IF auth.uid() IS NULL OR auth_user_verified() <> TRUE
     OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000000 THEN
    RAISE EXCEPTION 'Invalid payment';
  END IF;

  SELECT f.* INTO fundraiser
  FROM fundraisers f
  JOIN posts p ON p.id = f.post_id
  WHERE f.id = p_fundraiser_id AND p.complex_id = auth_user_complex_id();

  IF fundraiser.id IS NULL OR fundraiser.status <> 'active'
     OR (fundraiser.ends_at IS NOT NULL AND fundraiser.ends_at < NOW()) THEN
    RAISE EXCEPTION 'Fundraiser is not active';
  END IF;

  INSERT INTO fundraiser_payments (fundraiser_id, user_id, amount, comment, is_anonymous, status)
  VALUES (p_fundraiser_id, auth.uid(), p_amount, NULLIF(trim(p_comment), ''), p_is_anonymous, 'pending')
  RETURNING * INTO payment;

  RETURN payment;
END;
$$;

CREATE OR REPLACE FUNCTION review_fundraiser_payment(p_payment_id UUID, p_confirmed BOOLEAN)
RETURNS fundraiser_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment fundraiser_payments;
  fundraiser_title TEXT;
BEGIN
  IF NOT auth_user_is_management() THEN
    RAISE EXCEPTION 'Only complex management can review payments' USING ERRCODE = '42501';
  END IF;

  SELECT payment_row.* INTO payment
  FROM fundraiser_payments payment_row
  JOIN fundraisers fundraiser ON fundraiser.id = payment_row.fundraiser_id
  JOIN posts post ON post.id = fundraiser.post_id
  WHERE payment_row.id = p_payment_id AND post.complex_id = auth_user_complex_id()
  FOR UPDATE OF payment_row;

  IF payment.id IS NULL OR payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment is not pending or not accessible';
  END IF;

  UPDATE fundraiser_payments
  SET status = CASE WHEN p_confirmed THEN 'confirmed' ELSE 'rejected' END,
      confirmed_at = CASE WHEN p_confirmed THEN NOW() ELSE NULL END,
      reviewed_by = auth.uid(),
      reviewed_at = NOW()
  WHERE id = p_payment_id
  RETURNING * INTO payment;

  IF p_confirmed THEN
    UPDATE fundraisers SET current_amount = current_amount + payment.amount WHERE id = payment.fundraiser_id;
  END IF;

  IF payment.user_id IS NOT NULL THEN
    SELECT post.title INTO fundraiser_title
    FROM fundraisers fundraiser JOIN posts post ON post.id = fundraiser.post_id
    WHERE fundraiser.id = payment.fundraiser_id;
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      payment.user_id,
      'system',
      CASE WHEN p_confirmed THEN 'Взнос подтверждён' ELSE 'Взнос не найден в поступлениях' END,
      CASE WHEN p_confirmed
        THEN 'ОСИ подтвердило поступление ' || payment.amount::TEXT || ' ₸ по сбору «' || COALESCE(fundraiser_title, 'Сбор') || '».'
        ELSE 'ОСИ не нашло перевод на ' || payment.amount::TEXT || ' ₸ по сбору «' || COALESCE(fundraiser_title, 'Сбор') || '». Свяжитесь с управлением.'
      END,
      jsonb_build_object('fundraiser_id', payment.fundraiser_id, 'payment_id', payment.id, 'status', payment.status)
    );
  END IF;

  RETURN payment;
END;
$$;

REVOKE ALL ON FUNCTION review_fundraiser_payment(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION review_fundraiser_payment(UUID, BOOLEAN) TO authenticated;
