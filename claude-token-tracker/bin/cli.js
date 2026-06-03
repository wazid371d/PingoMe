#!/usr/bin/env node
import { existsSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import {
  paths,
  syncFromClaudeCode,
  CONFIG_FILE,
  PRICING_FILE,
} from '../src/tracker.js';
import { loadLocal, saveLocal, emptyBucket } from '../src/localStore.js';
import {
  loadConfig,
  saveConfig,
  defaultConfig,
  addUsage,
  recompute,
} from '../src/config.js';
import { loadPricing, computeTokens, computeCost, DEFAULT_PRICING } from '../src/pricing.js';
import { getDeveloperId, stageFile } from '../src/git.js';
import { installHook } from '../scripts/installHook.js';
import { fetchCostReport, sumCost } from '../src/costApi.js';

// ---- arg parsing (supports --flag and --key=value) ----
const argv = process.argv.slice(2);
const cmd = argv[0];
const positionals = [];
const opts = {};
for (const a of argv.slice(1)) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    opts[k] = v === undefined ? true : v;
  } else {
    positionals.push(a);
  }
}
const has = (k) => k in opts;

const usd = (n) => `$${Number(n).toFixed(4)}`;
const num = (n) => Number(n).toLocaleString('en-US');

const HELP = `claude-token-tracker — capture Claude Code usage, compute cost, aggregate per project

Usage: claude-tokens <command> [options]

Commands:
  init               Create config + pricing file + install the pre-commit hook
  sync               Pull new Claude Code usage into your pending count
  watch              Continuously sync every --interval seconds (default 60)
  flush              Roll your pending usage into the shared config
  status             Your pending + committed totals and project totals
  report             Full per-developer / per-model breakdown + budget
  budget <usd>       Set the project monthly budget (USD)
  cost               Authoritative $ from the Anthropic Admin Cost API
  install-hook       (Re)install the git pre-commit hook

Options:
  --stage            After flush, git-add the config (used by the hook)
  --sync             Sync before flushing
  --all              Count all Claude Code projects, not just this repo
  --interval=N       Seconds between syncs in watch mode
  --since=YYYY-MM-DD --until=YYYY-MM-DD   Window for 'cost'
  --workspace=ID     Anthropic workspace id to scope 'cost' to this project
`;

function doInit() {
  const { config: configPath, root } = paths();
  if (!existsSync(configPath)) {
    saveConfig(configPath, defaultConfig(basename(root)), loadPricing(root));
    console.log(`Created ${CONFIG_FILE}`);
  } else {
    console.log(`${CONFIG_FILE} already exists`);
  }
  const pricingPath = `${root}/${PRICING_FILE}`;
  if (!existsSync(pricingPath)) {
    writeFileSync(pricingPath, JSON.stringify(DEFAULT_PRICING, null, 2) + '\n');
    console.log(`Created ${PRICING_FILE} (edit to keep rates current)`);
  }
  installHook();
  console.log('\nSetup complete. Commit claude-tokens.json and claude-tokens.pricing.json.');
  console.log('Tip: run `claude-tokens watch` while you work for live capture.');
}

function doSync() {
  const r = syncFromClaudeCode({ all: has('all') });
  console.log(
    `Synced +${num(r.addedTokens)} tokens (~${usd(r.addedCost)}). ` +
      `Pending: ${num(r.pendingTokens)} (~${usd(r.pendingCost)})`
  );
}

function doWatch() {
  const interval = Math.max(5, parseInt(opts.interval || '60', 10)) * 1000;
  console.log(`Watching Claude Code usage every ${interval / 1000}s. Ctrl+C to stop.`);
  const tick = () => {
    try {
      const r = syncFromClaudeCode({ all: has('all') });
      if (r.addedTokens > 0) {
        console.log(
          `[${new Date().toLocaleTimeString()}] +${num(r.addedTokens)} tokens ` +
            `(~${usd(r.addedCost)}) — pending ${num(r.pendingTokens)} (~${usd(r.pendingCost)})`
        );
      }
    } catch (e) {
      console.error('sync error:', e.message);
    }
  };
  tick();
  setInterval(tick, interval);
}

function doFlush() {
  const { config: configPath, local, root } = paths();
  try {
    if (has('sync')) syncFromClaudeCode({ all: has('all') });
    const pricing = loadPricing(root);
    const store = loadLocal(local);
    const pendingTokens = computeTokens(store.pending.perModel);
    if (pendingTokens <= 0) return; // nothing to record; never block the commit

    const config = loadConfig(configPath) || defaultConfig(basename(root));
    const dev = getDeveloperId();
    addUsage(config, dev, store.pending.perModel);
    saveConfig(configPath, config, pricing);

    if (has('stage')) stageFile(CONFIG_FILE);

    const pendingCost = computeCost(store.pending.perModel, pricing);
    store.pending = { perModel: {} };
    saveLocal(local, store);

    console.log(
      `[claude-tokens] +${num(pendingTokens)} tokens (~${usd(pendingCost)}) for ${dev.id} ` +
        `— project total ${num(config.totals.tokens)} (~${usd(config.totals.costUSD)})`
    );
  } catch (err) {
    console.error('[claude-tokens] flush skipped:', err.message);
  }
}

function doStatus() {
  const { config: configPath, local, root } = paths();
  const pricing = loadPricing(root);
  const store = loadLocal(local);
  const config = loadConfig(configPath);
  const dev = getDeveloperId();
  console.log(`Developer:  ${dev.id}`);
  console.log(
    `Pending:    ${num(computeTokens(store.pending.perModel))} tokens ` +
      `(~${usd(computeCost(store.pending.perModel, pricing))})`
  );
  if (config) {
    const me = config.developers[dev.id];
    console.log(`You so far: ${num(me?.tokens || 0)} tokens (~${usd(me?.costUSD || 0)})`);
    console.log(`Project:    ${num(config.totals.tokens)} tokens (~${usd(config.totals.costUSD)})`);
  } else {
    console.log('No shared config yet — run: claude-tokens init');
  }
}

function doReport() {
  const { config: configPath, root } = paths();
  const pricing = loadPricing(root);
  const config = loadConfig(configPath);
  if (!config) {
    console.log('No data yet — run: claude-tokens init');
    return;
  }
  recompute(config, pricing);

  console.log(`Project:       ${config.project}`);
  console.log(`Total spend:   ${usd(config.totals.costUSD)}  (${num(config.totals.tokens)} tokens)`);
  if (config.budgetMonthlyUSD > 0) {
    const pct = (config.totals.costUSD / config.budgetMonthlyUSD) * 100;
    console.log(
      `Budget:        ${usd(config.totals.costUSD)} of ${usd(config.budgetMonthlyUSD)} ` +
        `(${pct.toFixed(1)}%)${pct >= 100 ? '  *** OVER BUDGET ***' : ''}`
    );
  }
  console.log(`Updated:       ${config.updatedAt}\n`);

  console.log('By model:');
  for (const [family, b] of Object.entries(config.totals.perModel)) {
    console.log(
      `  ${family.padEnd(8)} ${num(computeTokens({ x: b }))} tokens  ` +
        `~${usd(computeCost({ [family]: b }, pricing))}`
    );
  }

  const rows = Object.entries(config.developers)
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => b.costUSD - a.costUSD);
  const w = Math.max(9, ...rows.map((r) => r.id.length));
  console.log(`\n${'Developer'.padEnd(w)}  ${'Tokens'.padStart(13)}  ${'Cost'.padStart(11)}  ${'Commits'.padStart(7)}`);
  console.log('-'.repeat(w + 38));
  for (const r of rows) {
    console.log(
      `${r.id.padEnd(w)}  ${num(r.tokens).padStart(13)}  ${usd(r.costUSD).padStart(11)}  ${String(r.commits || 0).padStart(7)}`
    );
  }
}

function doBudget() {
  const amount = parseFloat(positionals[0]);
  if (!Number.isFinite(amount) || amount < 0) {
    console.error('Usage: claude-tokens budget <usd amount>');
    process.exit(1);
  }
  const { config: configPath, root } = paths();
  const config = loadConfig(configPath) || defaultConfig(basename(root));
  config.budgetMonthlyUSD = amount;
  saveConfig(configPath, config, loadPricing(root));
  console.log(`Monthly budget set to ${usd(amount)}.`);
}

async function doCost() {
  const adminKey = process.env.ANTHROPIC_ADMIN_KEY;
  const now = new Date();
  const since = opts.since || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const until = opts.until || now.toISOString().slice(0, 10);
  const startingAt = `${since}T00:00:00Z`;
  const endingAt = `${until}T00:00:00Z`;
  try {
    const payload = await fetchCostReport({
      adminKey,
      startingAt,
      endingAt,
      workspaceId: opts.workspace,
      groupBy: ['workspace_id'],
    });
    const { total, currency } = sumCost(payload);
    console.log(`Authoritative Anthropic cost ${since} → ${until}: ${currency} ${total.toFixed(2)}`);

    const { config: configPath, root } = paths();
    const config = loadConfig(configPath);
    if (config) {
      console.log(`Local notional total (all time): ${usd(config.totals.costUSD)}`);
      console.log('(Windows differ — the API figure is the billing ground truth.)');
    }
  } catch (e) {
    console.error('cost lookup failed:', e.message);
    process.exit(1);
  }
}

switch (cmd) {
  case 'init': doInit(); break;
  case 'sync': doSync(); break;
  case 'watch': doWatch(); break;
  case 'flush': doFlush(); break;
  case 'status': doStatus(); break;
  case 'report': doReport(); break;
  case 'budget': doBudget(); break;
  case 'cost': await doCost(); break;
  case 'install-hook': installHook(); break;
  case undefined:
  case 'help':
  case '--help':
    console.log(HELP);
    break;
  default:
    console.error(`Unknown command: ${cmd}\n`);
    console.log(HELP);
    process.exit(1);
}
