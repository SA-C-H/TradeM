-- 1. Trading accounts
CREATE TABLE public.trading_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  initial_balance NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accounts" ON public.trading_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own accounts" ON public.trading_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts" ON public.trading_accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts" ON public.trading_accounts
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_trading_accounts_updated_at
  BEFORE UPDATE ON public.trading_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Playbooks
CREATE TABLE public.playbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own playbooks" ON public.playbooks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own playbooks" ON public.playbooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own playbooks" ON public.playbooks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own playbooks" ON public.playbooks
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_playbooks_updated_at
  BEFORE UPDATE ON public.playbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add account_id and playbook_id to trades
ALTER TABLE public.trades
  ADD COLUMN account_id UUID,
  ADD COLUMN playbook_id UUID;

CREATE INDEX idx_trades_account ON public.trades(account_id);
CREATE INDEX idx_trades_playbook ON public.trades(playbook_id);

-- 4. Add account_id to trade_photos
ALTER TABLE public.trade_photos
  ADD COLUMN account_id UUID;

CREATE INDEX idx_trade_photos_account ON public.trade_photos(account_id);

-- 5. Auto-create default trading account on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trading_accounts (user_id, name, currency, is_active)
  VALUES (NEW.id, 'Principal', 'USD', true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_account
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_account();

-- 6. Backfill: create default account for existing users that don't have one
INSERT INTO public.trading_accounts (user_id, name, currency, is_active)
SELECT DISTINCT user_id, 'Principal', 'USD', true
FROM public.trades
WHERE user_id NOT IN (SELECT user_id FROM public.trading_accounts);

INSERT INTO public.trading_accounts (user_id, name, currency, is_active)
SELECT DISTINCT user_id, 'Principal', 'USD', true
FROM public.profiles
WHERE user_id NOT IN (SELECT user_id FROM public.trading_accounts);

-- 7. Backfill account_id on existing trades and photos
UPDATE public.trades t
SET account_id = (SELECT id FROM public.trading_accounts a WHERE a.user_id = t.user_id ORDER BY created_at LIMIT 1)
WHERE account_id IS NULL;

UPDATE public.trade_photos p
SET account_id = (SELECT id FROM public.trading_accounts a WHERE a.user_id = p.user_id ORDER BY created_at LIMIT 1)
WHERE account_id IS NULL;