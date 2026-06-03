import {
  existsSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  mkdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { getRepoRoot, getGitDir } from '../src/git.js';

const MARKER = '# >>> claude-token-tracker >>>';
const HOOK_BLOCK = `${MARKER}
# Roll each developer's local Claude token usage into claude-tokens.json,
# then stage it so it becomes part of this commit.
if [ -f "node_modules/claude-token-tracker/bin/cli.js" ]; then
  node node_modules/claude-token-tracker/bin/cli.js flush --stage --sync || true
elif command -v claude-tokens >/dev/null 2>&1; then
  claude-tokens flush --stage --sync || true
fi
# <<< claude-token-tracker <<<
`;

export function installHook() {
  const root = getRepoRoot();
  if (!root) {
    console.error('Not inside a git repository — cannot install hook.');
    return false;
  }

  const huskyDir = join(root, '.husky');
  let hookPath;
  let isHusky = false;
  if (existsSync(huskyDir)) {
    hookPath = join(huskyDir, 'pre-commit');
    isHusky = true;
  } else {
    const gitDir = getGitDir() || join(root, '.git');
    const hooksDir = join(gitDir, 'hooks');
    if (!existsSync(hooksDir)) mkdirSync(hooksDir, { recursive: true });
    hookPath = join(hooksDir, 'pre-commit');
  }

  let content = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';
  if (content.includes(MARKER)) {
    console.log(`Hook already installed at ${hookPath}`);
    return true;
  }
  if (!content) content = '#!/bin/sh\n';
  if (!content.endsWith('\n')) content += '\n';
  content += '\n' + HOOK_BLOCK;

  writeFileSync(hookPath, content);
  try { chmodSync(hookPath, 0o755); } catch {}
  console.log(`Installed pre-commit hook at ${hookPath}${isHusky ? ' (husky)' : ''}`);
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) installHook();
