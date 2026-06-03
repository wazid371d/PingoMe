import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { emptyBucket, addToBucket } from './localStore.js';
import { computeCost, computeTokens } from './pricing.js';

export function defaultConfig(project) {
  return {
    project: project || 'unknown',
    currency: 'USD',
    budgetMonthlyUSD: 0,
    totals: { tokens: 0, costUSD: 0, perModel: {} },
    developers: {},
    updatedAt: new Date().toISOString(),
  };
}

export function loadConfig(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

// Merge a developer's pending per-model usage into their entry.
export function addUsage(config, dev, perModel) {
  const entry = config.developers[dev.id] || {
    name: dev.name,
    email: dev.email,
    perModel: {},
    tokens: 0,
    costUSD: 0,
    commits: 0,
  };
  entry.name = dev.name || entry.name;
  entry.email = dev.email || entry.email;
  for (const [family, b] of Object.entries(perModel)) {
    entry.perModel[family] = entry.perModel[family] || emptyBucket();
    addToBucket(entry.perModel[family], b);
  }
  entry.commits += 1;
  entry.lastUpdated = new Date().toISOString();
  config.developers[dev.id] = entry;
  return config;
}

// Token counts are the immutable ground truth; cost is always recomputed from
// the current pricing table, so editing prices re-prices everything on save.
function sumPerModel(target, perModel) {
  for (const [family, b] of Object.entries(perModel || {})) {
    target[family] = target[family] || emptyBucket();
    addToBucket(target[family], b);
  }
}

export function recompute(config, pricing) {
  const projectPerModel = {};
  for (const entry of Object.values(config.developers)) {
    entry.tokens = computeTokens(entry.perModel);
    entry.costUSD = round(computeCost(entry.perModel, pricing));
    sumPerModel(projectPerModel, entry.perModel);
  }
  config.totals = {
    tokens: computeTokens(projectPerModel),
    costUSD: round(computeCost(projectPerModel, pricing)),
    perModel: projectPerModel,
  };
  return config;
}

export function saveConfig(path, config, pricing) {
  recompute(config, pricing);
  config.updatedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
}

function round(n) {
  return Math.round(n * 1e6) / 1e6;
}
