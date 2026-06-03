import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function projectsDir() {
  if (process.env.CLAUDE_TOKENS_PROJECTS_DIR) {
    return process.env.CLAUDE_TOKENS_PROJECTS_DIR;
  }
  return join(homedir(), '.claude', 'projects');
}

// Claude Code names each project directory after the working directory it was
// launched from, with non-alphanumeric characters replaced by dashes. This is
// branch-agnostic: every branch of one repo lands in the same directory.
function sanitize(p) {
  return p.replace(/[^a-zA-Z0-9]/g, '-');
}

// Read token usage from Claude Code's local JSONL session logs.
// One record per assistant message that reported a `usage` object — across all
// modes (normal, plan, etc.), since they all write to the same session logs.
export function readClaudeCodeUsage({ repoRoot, all = false } = {}) {
  const dir = projectsDir();
  const out = [];
  if (!existsSync(dir)) return out;

  const prefix = repoRoot ? sanitize(repoRoot) : null;
  let projectDirs;
  try {
    projectDirs = readdirSync(dir);
  } catch {
    return out;
  }

  const matched = projectDirs.filter((name) => {
    if (all || !prefix) return true;
    return name === prefix || name.startsWith(prefix);
  });

  for (const proj of matched) {
    const projPath = join(dir, proj);
    let files;
    try {
      files = readdirSync(projPath).filter((f) => f.endsWith('.jsonl'));
    } catch {
      continue;
    }
    for (const file of files) {
      let content;
      try {
        content = readFileSync(join(projPath, file), 'utf8');
      } catch {
        continue;
      }
      for (const line of content.split('\n')) {
        if (!line.trim()) continue;
        let obj;
        try {
          obj = JSON.parse(line);
        } catch {
          continue;
        }
        const usage = obj?.message?.usage;
        if (!usage) continue;

        // Newer logs split cache creation into 5m / 1h ephemeral buckets.
        const cc = usage.cache_creation || {};
        const cache5m =
          cc.ephemeral_5m_input_tokens != null
            ? cc.ephemeral_5m_input_tokens
            : usage.cache_creation_input_tokens || 0;
        const cache1h = cc.ephemeral_1h_input_tokens || 0;

        const id =
          obj.requestId ||
          obj.uuid ||
          `${obj.timestamp || ''}:${file}:${out.length}`;

        out.push({
          id,
          model: obj?.message?.model || obj.model || '',
          input: usage.input_tokens || 0,
          output: usage.output_tokens || 0,
          cacheCreate: cache5m,
          cacheCreate1h: cache1h,
          cacheRead: usage.cache_read_input_tokens || 0,
        });
      }
    }
  }
  return out;
}
