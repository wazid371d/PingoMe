import { join } from 'node:path';
import { getRepoRoot, getGitDir } from './git.js';
import { loadLocal, saveLocal, emptyBucket, addToBucket } from './localStore.js';
import { readClaudeCodeUsage } from './claudeCodeReader.js';
import { loadPricing, normalizeModel, computeTokens, computeCost } from './pricing.js';

export const CONFIG_FILE = 'claude-tokens.json';
export const PRICING_FILE = 'claude-tokens.pricing.json';
export const LOCAL_FILE = '.claude-tokens-local.json';

export function paths() {
  const root = getRepoRoot() || process.cwd();
  const gitDir = getGitDir() || join(root, '.git');
  return {
    root,
    gitDir,
    config: join(root, CONFIG_FILE), // shared, committed
    local: join(gitDir, LOCAL_FILE), // private, never committed
  };
}

// Pull any new Claude Code usage into the developer's local pending buckets,
// classified by model family. Returns what was added and the running pending.
export function syncFromClaudeCode({ all = false } = {}) {
  const { root, local } = paths();
  const pricing = loadPricing(root);
  const store = loadLocal(local);

  const records = readClaudeCodeUsage({ repoRoot: root, all });
  const added = {};
  for (const r of records) {
    if (store.seen[r.id]) continue;
    store.seen[r.id] = 1;
    const family = normalizeModel(r.model, pricing);
    store.pending.perModel[family] = store.pending.perModel[family] || emptyBucket();
    added[family] = added[family] || emptyBucket();
    addToBucket(store.pending.perModel[family], r);
    addToBucket(added[family], r);
  }
  saveLocal(local, store);

  return {
    addedTokens: computeTokens(added),
    addedCost: computeCost(added, pricing),
    pendingTokens: computeTokens(store.pending.perModel),
    pendingCost: computeCost(store.pending.perModel, pricing),
  };
}
