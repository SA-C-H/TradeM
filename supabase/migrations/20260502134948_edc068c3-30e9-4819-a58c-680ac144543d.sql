CREATE OR REPLACE FUNCTION public.compute_trade_rr()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  risk_dist numeric;
  reward_dist numeric;
BEGIN
  IF NEW.result IS NOT NULL AND NEW.risk_amount IS NOT NULL AND NEW.risk_amount > 0 THEN
    NEW.rr_ratio := round((NEW.result / NEW.risk_amount)::numeric, 2);
  ELSIF NEW.entry_price IS NOT NULL AND NEW.stop_loss IS NOT NULL AND NEW.take_profit IS NOT NULL THEN
    risk_dist := abs(NEW.entry_price - NEW.stop_loss);
    reward_dist := abs(NEW.take_profit - NEW.entry_price);
    IF risk_dist > 0 THEN
      NEW.rr_ratio := round((reward_dist / risk_dist)::numeric, 2);
    ELSE
      NEW.rr_ratio := 0;
    END IF;
  ELSE
    NEW.rr_ratio := 0;
  END IF;
  RETURN NEW;
END;
$$;