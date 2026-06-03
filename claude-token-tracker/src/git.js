import { execFileSync } from 'node:child_process';

export function git(args, opts = {}) {
  return execFileSync('git', args, { encoding: 'utf8', ...opts }).trim();
}

export function getRepoRoot() {
  try {
    return git(['rev-parse', '--show-toplevel']);
  } catch {
    return null;
  }
}

export function getGitDir() {
  try {
    return git(['rev-parse', '--absolute-git-dir']);
  } catch {
    return null;
  }
}

// Identify the developer making the commit. Prefer git email (stable, unique).
export function getDeveloperId() {
  let email = '';
  let name = '';
  try { email = git(['config', 'user.email']); } catch {}
  try { name = git(['config', 'user.name']); } catch {}
  const id = email || name || process.env.USER || process.env.USERNAME || 'unknown';
  return { id, name: name || id, email };
}

export function getHeadCommit() {
  try { return git(['rev-parse', '--short', 'HEAD']); } catch { return null; }
}

export function stageFile(relPath) {
  git(['add', '--', relPath]);
}
