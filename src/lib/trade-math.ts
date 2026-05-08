export type TradeDirection = 'long' | 'short';

type ParsedInstrument =
  | { kind: 'xauusd' }
  | { kind: 'fx'; base: string; quote: string }
  | { kind: 'unknown' };

function normalizeSymbol(input: string): string {
  return (input ?? '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z/]/g, '');
}

export function parseInstrument(instrument: string): ParsedInstrument {
  const s = normalizeSymbol(instrument);

  if (s.includes('XAU') || s.includes('GOLD')) return { kind: 'xauusd' };

  // Accept "EURUSD" or "EUR/USD"
  const compact = s.replace(/\//g, '');
  if (compact.length === 6) {
    const base = compact.slice(0, 3);
    const quote = compact.slice(3, 6);
    return { kind: 'fx', base, quote };
  }

  return { kind: 'unknown' };
}

function fxUsdPerQuote(quote: string, price: number | null, quoteToUsd: number | null): number | null {
  if (quote === 'USD') return 1;
  if (quoteToUsd != null && quoteToUsd > 0) return quoteToUsd;
  // If quote isn't USD and user didn't provide quote->USD, try to infer when base is USD: USDXXX
  // In that case quote is XXX and USD/XXX = price, so XXX/USD = 1/price.
  if (price != null && price > 0) return 1 / price;
  return null;
}

export function usdMultiplierPerPriceMove(opts: {
  instrument: string;
  priceForConversion: number | null;
  quoteToUsd: number | null; // for cross pairs where quote isn't USD
  xauContractSizeOz?: number; // default 100
}): number | null {
  const parsed = parseInstrument(opts.instrument);

  if (parsed.kind === 'xauusd') {
    const contract = opts.xauContractSizeOz ?? 100;
    return contract;
  }

  if (parsed.kind === 'fx') {
    const contract = 100_000; // 1.00 lot
    const { base, quote } = parsed;
    if (quote === 'USD') return contract;

    if (base === 'USD') {
      // diff is in quote currency; convert to USD via division by price (USD/quote)
      if (opts.priceForConversion == null || opts.priceForConversion <= 0) return null;
      return contract / opts.priceForConversion;
    }

    const usdPerQuote = fxUsdPerQuote(quote, null, opts.quoteToUsd);
    if (usdPerQuote == null) return null;
    return contract * usdPerQuote;
  }

  return null;
}

export function computePositionRiskUsd(opts: {
  instrument: string;
  direction: TradeDirection;
  entry: number | null;
  stop: number | null;
  lot: number | null;
  quoteToUsd: number | null;
  xauContractSizeOz?: number;
}): number | null {
  const { entry, stop, lot } = opts;
  if (entry == null || stop == null || lot == null) return null;
  if (lot <= 0) return null;

  const dist = Math.abs(entry - stop);
  const mult = usdMultiplierPerPriceMove({
    instrument: opts.instrument,
    priceForConversion: entry,
    quoteToUsd: opts.quoteToUsd,
    xauContractSizeOz: opts.xauContractSizeOz,
  });
  if (mult == null) return null;

  return dist * lot * mult;
}

export function computePositionPnlUsd(opts: {
  instrument: string;
  direction: TradeDirection;
  entry: number | null;
  exit: number | null;
  lot: number | null;
  fees: number | null;
  quoteToUsd: number | null;
  xauContractSizeOz?: number;
}): number | null {
  const { entry, exit, lot } = opts;
  if (entry == null || exit == null || lot == null) return null;
  if (lot <= 0) return null;

  const diff = opts.direction === 'long' ? (exit - entry) : (entry - exit);
  const mult = usdMultiplierPerPriceMove({
    instrument: opts.instrument,
    priceForConversion: exit,
    quoteToUsd: opts.quoteToUsd,
    xauContractSizeOz: opts.xauContractSizeOz,
  });
  if (mult == null) return null;

  const gross = diff * lot * mult;
  const fees = opts.fees ?? 0;
  return gross - fees;
}

