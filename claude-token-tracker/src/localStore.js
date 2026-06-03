import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export function emptyBucket() {
  return { input: 0, output: 0, cacheCreate: 0, cacheCreate1h: 0, cacheRead: 0 };
}

export function addToBucket(target, rec) {
  target.input += rec.input || 0;
  target.output += rec.output || 0;
  target.cacheCreate += rec.cacheCreate || 0;
  target.cacheCreate1h += rec.cacheCreate1h || 0;
  target.cacheRead += rec.cacheRead || 0;
}

// Lives inside .git/, so it is never committed. Holds usage captured but not
// yet rolled into the shared config, plus the set of already-counted message
// ids so repeated syncs never double count.
export function loadLocal(path) {
  const base = { seen: {}, pending: { perModel: {} } };
  if (!existsSync(path)) return base;
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return base;
  }
  data.seen = data.seen || {};
  data.pending = data.pending || { perModel: {} };
  data.pending.perModel = data.pending.perModel || {};
  return data;
}

export function saveLocal(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
