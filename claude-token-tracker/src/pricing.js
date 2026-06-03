import { readFileSync, existsSync } from 'node:fs';

// Default rates in USD per MILLION tokens. Verified against Anthropic's public
// API pricing (May 2026). These are EDITABLE: drop a claude-tokens.pricing.json
// in the repo root to override, so price changes never require a code change.
//   cacheWrite = 5-minute cache write (~1.25x input). 1-hour writes (~2x) are
//   priced separately when the logs expose the breakdown.
//   cacheRead  = ~0.1x input.
export const DEFAULT_PRICING = {
  _perMillion: true,
  _default: 'sonnet', // used when a log entry's model can't be classified
  opus: { input: 5, output: 25, cacheWrite: 6.25, cacheWrite1h: 10, cacheRead: 0.5 },
  sonnet: { input: 3, output: 15, cacheWrite: 3.75, cacheWrite1h: 6, cacheRead: 0.3 },
  haiku: { input: 1, output: 5, cacheWrite: 1.25, cacheWrite1h: 2, cacheRead: 0.1 },
};

export function loadPricing(repoRoot) {
  const path = repoRoot ? `${repoRoot}/claude-tokens.pricing.json` : null;
  if (path && existsSync(path)) {
    try {
      const override = JSON.parse(readFileSync(path, 'utf8'));
      return { ...DEFAULT_PRICING, ...override };
    } catch {
      /* fall through to defaults on parse error */
    }
  }
  return DEFAULT_PRICING;
}

// Map a raw Claude Code model string to a price family.
export function normalizeModel(raw, pricing = DEFAULT_PRICING) {
  const m = String(raw || '').toLowerCase();
  if (m.includes('opus')) return 'opus';
  if (m.includes('haiku')) return 'haiku';
  if (m.includes('sonnet')) return 'sonnet';
  return pricing._default || 'sonnet';
}

// A per-model bucket: { input, output, cacheCreate, cacheCreate1h, cacheRead }.
export function bucketTokens(b) {
  return (
    (b.input || 0) +
    (b.output || 0) +
    (b.cacheCreate || 0) +
    (b.cacheCreate1h || 0) +
    (b.cacheRead || 0)
  );
}

// Cost of one bucket for a given family, in USD.
function bucketCost(family, b, pricing) {
  const p = pricing[family] || pricing[pricing._default || 'sonnet'];
  if (!p) return 0;
  return (
    ((b.input || 0) * p.input +
      (b.output || 0) * p.output +
      (b.cacheCreate || 0) * p.cacheWrite +
      (b.cacheCreate1h || 0) * (p.cacheWrite1h ?? p.cacheWrite) +
      (b.cacheRead || 0) * p.cacheRead) /
    1_000_000
  );
}

// perModel = { opus: {bucket}, sonnet: {bucket}, ... }
export function computeCost(perModel, pricing = DEFAULT_PRICING) {
  let cost = 0;
  for (const [family, b] of Object.entries(perModel || {})) {
    cost += bucketCost(family, b, pricing);
  }
  return cost;
}

export function computeTokens(perModel) {
  let t = 0;
  for (const b of Object.values(perModel || {})) t += bucketTokens(b);
  return t;
}
