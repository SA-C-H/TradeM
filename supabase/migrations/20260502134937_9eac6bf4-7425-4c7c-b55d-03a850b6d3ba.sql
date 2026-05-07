CREATE OR REPLACE FUNCTION public.compute_trade_rr()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  risk_dist numeric;
  reward_dist numeric;
BEGIN
  -- Realized RR if we have a result and a risk amount
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

DROP TRIGGER IF EXISTS trg_trades_compute_rr ON public.trades;
CREATE TRIGGER trg_trades_compute_rr
BEFORE INSERT OR UPDATE OF entry_price, stop_loss, take_profit, result, risk_amount
ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.compute_trade_rr();

-- Backfill existing rows
UPDATE public.trades
SET rr_ratio = CASE
  WHEN result IS NOT NULL AND risk_amount IS NOT NULL AND risk_amount > 0
    THEN round((result / risk_amount)::numeric, 2)
  WHEN entry_price IS NOT NULL AND stop_loss IS NOT NULL AND take_profit IS NOT NULL AND abs(entry_price - stop_loss) > 0
    THEN round((abs(take_profit - entry_price) / abs(entry_price - stop_loss))::numeric, 2)
  ELSE 0
END;