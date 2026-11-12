-- На квартиру разрешался один бюллетень, но его вес считался как площадь × доля
-- проголосовавшего: при двух собственниках по 0,5 половина площади выпадала
-- из подсчёта, а второй собственник голосовать не мог.
-- Теперь при голосовании по площади каждый собственник голосует своей долей, а
-- сумма весов по квартире не превышает её площадь. Без указанной доли бюллетень
-- по-прежнему представляет всю квартиру. При основе «одна квартира — один
-- голос» остаётся один бюллетень на квартиру.
ALTER TABLE official_vote_ballots DROP CONSTRAINT IF EXISTS official_vote_ballots_vote_id_apartment_id_key;
ALTER TABLE official_vote_ballots ADD CONSTRAINT official_vote_ballots_vote_voter_apartment_key UNIQUE (vote_id, voter_id, apartment_id);
CREATE INDEX idx_official_vote_ballots_apartment ON official_vote_ballots(vote_id, apartment_id);

CREATE OR REPLACE FUNCTION cast_official_vote(p_vote_id UUID, p_choice official_vote_choice)
RETURNS official_vote_ballots LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  vote_row official_votes;
  membership_row complex_memberships;
  apartment_area NUMERIC;
  used_weight NUMERIC;
  cast_ballots INTEGER;
  ballot_weight NUMERIC;
  ballot official_vote_ballots;
BEGIN
  SELECT * INTO membership_row FROM complex_memberships WHERE user_id = auth.uid() AND is_active AND is_verified AND role = 'owner' AND apartment_id IS NOT NULL LIMIT 1;
  IF membership_row.id IS NULL THEN RAISE EXCEPTION 'Verified owner membership is required'; END IF;
  -- Блокировка голосования сериализует бюллетени, поэтому проверка остатка веса надёжна.
  SELECT * INTO vote_row FROM official_votes WHERE id = p_vote_id FOR UPDATE;
  IF vote_row.id IS NULL OR vote_row.complex_id <> membership_row.complex_id OR vote_row.status <> 'active' OR NOW() NOT BETWEEN vote_row.starts_at AND vote_row.ends_at THEN RAISE EXCEPTION 'Vote is not active or accessible'; END IF;

  SELECT COALESCE(NULLIF(area_sqm, 0), 1) INTO apartment_area FROM apartments WHERE id = membership_row.apartment_id;
  SELECT COALESCE(SUM(weight), 0), COUNT(*) INTO used_weight, cast_ballots
  FROM official_vote_ballots WHERE vote_id = vote_row.id AND apartment_id = membership_row.apartment_id;

  IF vote_row.basis = 'area' THEN
    ballot_weight := ROUND(LEAST(apartment_area * COALESCE(membership_row.ownership_share, 1), apartment_area - used_weight), 4);
  ELSE
    ballot_weight := CASE WHEN cast_ballots = 0 THEN 1 ELSE 0 END;
  END IF;
  IF ballot_weight <= 0 THEN
    RAISE EXCEPTION 'Apartment vote is already cast' USING ERRCODE = '23505';
  END IF;

  INSERT INTO official_vote_ballots(vote_id, voter_id, apartment_id, choice, weight)
  VALUES (vote_row.id, auth.uid(), membership_row.apartment_id, p_choice, ballot_weight)
  RETURNING * INTO ballot;
  RETURN ballot;
END; $$;
