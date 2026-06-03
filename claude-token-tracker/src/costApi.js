// Authoritative dollar cost from the Anthropic Usage & Cost Admin API.
// Requires an Admin API key (starts with "sk-ant-admin..."), read from the
// ANTHROPIC_ADMIN_KEY environment variable — never stored in the repo.
//
// Endpoint paths/params are configurable because the Cost endpoints are in beta
// and the schema may change. Override via env if Anthropic adjusts them:
//   ANTHROPIC_API_BASE (default https://api.anthropic.com)
//   ANTHROPIC_COST_PATH (default /v1/organizations/cost_report)

const API_VERSION = '2023-06-01';

export async function fetchCostReport({
  adminKey,
  startingAt,
  endingAt,
  workspaceId,
  groupBy = [],
} = {}) {
  if (!adminKey) {
    throw new Error(
      'No admin key. Set ANTHROPIC_ADMIN_KEY (sk-ant-admin...) in your environment.'
    );
  }
  const base = process.env.ANTHROPIC_API_BASE || 'https://api.anthropic.com';
  const path =
    process.env.ANTHROPIC_COST_PATH || '/v1/organizations/cost_report';
  const url = new URL(base + path);
  url.searchParams.set('starting_at', startingAt);
  url.searchParams.set('ending_at', endingAt);
  for (const g of groupBy) url.searchParams.append('group_by[]', g);
  if (workspaceId) url.searchParams.append('workspace_ids[]', workspaceId);

  const res = await fetch(url, {
    headers: {
      'anthropic-version': API_VERSION,
      'x-api-key': adminKey,
      'content-type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Cost API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// The cost response groups amounts in nested buckets. Schema can shift, so sum
// defensively: find every numeric `amount` (with sibling `currency`) anywhere
// in the payload.
export function sumCost(payload) {
  let total = 0;
  let currency = 'USD';
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    for (const [k, v] of Object.entries(node)) {
      if (k === 'amount' && typeof v === 'number') {
        total += v;
        if (typeof node.currency === 'string') currency = node.currency;
      } else if (k === 'currency' && typeof v === 'string') {
        currency = v;
      } else {
        walk(v);
      }
    }
  };
  walk(payload);
  return { total, currency };
}
