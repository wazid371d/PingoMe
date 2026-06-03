# claude-token-tracker

Capture every Claude Code token your team spends on a project — in **any mode
(ask / agent / plan), on any branch, whether or not the work is committed** —
turn it into **dollars**, and aggregate it into a shared per-project total for
cost/budget tracking.

## The two layers

Capturing *all* spend and *attributing* it to people/projects are different jobs,
so this tool does both:

1. **Local capture (per developer, per model, with notional cost).**
   Claude Code writes complete per-turn usage to `~/.claude/projects/<dir>/*.jsonl`
   — every mode, keyed on the working directory, so it's branch-agnostic. The tool
   reads new entries, classifies them by model, and converts tokens to dollars
   using an **editable price table**. This is rolled into the shared
   `claude-tokens.json` at each commit, giving you per-developer attribution.

2. **Authoritative cost (the budget ground truth).**
   `claude-tokens cost` queries the **Anthropic Usage & Cost Admin API** for the
   real billed dollars on your org/workspace. Because you're on pay-as-you-go,
   this is the number finance should trust. Scope one Anthropic **workspace per
   project** and the API gives you that project's true spend, independent of git.

Use layer 1 for "who spent what" and live feedback; use layer 2 for invoice-grade
budget numbers.

## Install & set up

```bash
npm install --save-dev claude-token-tracker
npx claude-tokens init        # config + editable pricing file + pre-commit hook
git add claude-tokens.json claude-tokens.pricing.json && git commit -m "chore: token tracking"
```

Each teammate runs `npx claude-tokens init` once after cloning (git installs hooks
locally; husky is auto-detected and shared if present).

## Daily use

Capture is automatic at commit (the hook runs `flush --sync --stage`, which pulls
in **all** usage since your last commit — including pure exploration that changed
no files). For live, pre-commit visibility, run a watcher while you work:

```bash
npx claude-tokens watch              # syncs every 60s; prints tokens + $ as you go
npx claude-tokens watch --interval=30
npx claude-tokens status             # pending + your total + project total
npx claude-tokens report             # full per-developer / per-model / budget view
```

## Budget & reconciliation

```bash
npx claude-tokens budget 500                 # set a $500 monthly budget
export ANTHROPIC_ADMIN_KEY=sk-ant-admin-...  # admin key (org admins only)
npx claude-tokens cost --since=2026-06-01 --until=2026-07-01 --workspace=<wsid>
```

`report` shows local notional spend vs budget; `cost` shows the authoritative API
figure to true it up. The admin key is read only from the environment and is
**never** written to the repo.

## Commands

| Command | Purpose |
|---|---|
| `init` | Create config + pricing file, install hook |
| `sync` | Pull new Claude Code usage into your pending count |
| `watch [--interval=N]` | Continuously sync (live capture while you work) |
| `flush [--stage] [--sync]` | Roll pending usage into the shared config (hook uses this) |
| `status` | Your pending + committed totals, project total |
| `report` | Per-developer + per-model breakdown, budget status |
| `budget <usd>` | Set the monthly budget |
| `cost [--since --until --workspace]` | Authoritative $ from the Admin Cost API |
| `install-hook` | Reinstall the pre-commit hook |

## Pricing (`claude-tokens.pricing.json`)

USD per **million** tokens; edit any time — token counts are stored as immutable
ground truth and cost is recomputed from this table on every read, so a price
change re-prices history automatically.

```json
{
  "_default": "sonnet",
  "opus":   { "input": 5, "output": 25, "cacheWrite": 6.25, "cacheRead": 0.5 },
  "sonnet": { "input": 3, "output": 15, "cacheWrite": 3.75, "cacheRead": 0.3 },
  "haiku":  { "input": 1, "output": 5,  "cacheWrite": 1.25, "cacheRead": 0.1 }
}
```
(Defaults reflect Anthropic's May 2026 API rates: Haiku 4.5 $1/$5, Sonnet 4.6
$3/$15, Opus 4.7 $5/$25, cache read ≈ 0.1× input, cache write ≈ 1.25× input.)

## Config shape (`claude-tokens.json`, committed)

```json
{
  "project": "my-project",
  "currency": "USD",
  "budgetMonthlyUSD": 500,
  "totals": { "tokens": 793000, "costUSD": 1.84, "perModel": { "...": {} } },
  "developers": {
    "alice@team.com": {
      "tokens": 193000, "costUSD": 0.84, "commits": 1,
      "perModel": { "sonnet": { "input": 100000, "output": 20000, "cacheRead": 50000 } }
    }
  }
}
```

## Honest limitations

- **Notional vs authoritative.** Layer 1's dollars are an estimate from the price
  table. Real billing (cache-tier nuances, batch/priority discounts, tokenizer
  differences between model versions) lives in the Cost API — `cost` is the truth.
- **Cost API latency.** Anthropic's cost data refreshes roughly every 4 hours and
  can be revised for up to ~30 days as late events reconcile; it's not real-time,
  and the cost endpoints are in beta (this client parses defensively and lets you
  override the endpoint path via `ANTHROPIC_COST_PATH` / `ANTHROPIC_API_BASE`).
- **Per-user attribution via the API** requires an Enterprise plan; otherwise
  attribute per workspace/API key. Layer 1 gives per-developer breakdown locally
  regardless.
- **Commit-gated roll-up.** Local usage reaches the *shared* total only at commit.
  Exploration on a branch that's never committed stays in that developer's local
  pending and never reaches the team file — for a complete commit-independent
  figure, rely on the Cost API.
- **Branch attribution** is approximate: usage is credited to the developer, not
  split per branch (project = repo, which already spans all branches).
- **Claude Code log format** can change between versions; the reader is defensive
  about missing fields and reads `message.usage` (input/output/cache).
