-- Trade positions (multiple lots per setup)
CREATE TABLE public.trade_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  lot NUMERIC NOT NULL,
  stop_loss NUMERIC,
  fees NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own positions" ON public.trade_positions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own positions" ON public.trade_positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own positions" ON public.trade_positions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own positions" ON public.trade_positions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_trade_positions_trade ON public.trade_positions(trade_id);
CREATE INDEX idx_trade_positions_user_created ON public.trade_positions(user_id, created_at DESC);
