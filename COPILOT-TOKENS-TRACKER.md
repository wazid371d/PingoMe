# 🤖 Team Copilot Chat Token Tracking

A comprehensive system to track **VS Code Copilot Chat tokens** across your entire team, per developer, per branch, and globally.

## How It Works

```
VS Code Copilot Chat
     ↓
Developer uses AI in chat
     ↓
Manually/Auto logs tokens
     ↓
copilot-tokens-tracker.js records
     ↓
.copilot-tokens/global-tokens.json (shared)
     ↓
Git hooks sync globally on push
     ↓
Team can see who used what tokens
```

## Quick Start

### 1️⃣ Set Up Git Hooks (One-time Setup)

```bash
# Copy git hook files to .git/hooks
cp .git-hooks-post-commit .git/hooks/post-commit
cp .git-hooks-pre-push .git/hooks/pre-push

# Make them executable
chmod +x .git/hooks/post-commit
chmod +x .git/hooks/pre-push

# Or do it manually:
# 1. Create .git/hooks/post-commit and copy the content from .git-hooks-post-commit
# 2. Create .git/hooks/pre-push and copy the content from .git-hooks-pre-push
# 3. chmod +x both files
```

### 2️⃣ Log Copilot Chat Token Usage

Every time you use VS Code Copilot Chat for development, log the tokens:

```bash
# Log tokens for this conversation
npm run copilot:log 150 haiku "Code review via Copilot Chat"

# Or use node directly with more options
node copilot-tokens-tracker.js log <tokens> [model] [description]
```

**Parameters:**
- `tokens` - Number of tokens used (estimate or from Copilot interface)
- `model` - Model used: `haiku`, `sonnet`, or `opus` (default: haiku)
- `description` - What the tokens were used for (default: "Copilot Chat usage")

### 3️⃣ Check Status

**Your personal status:**
```bash
npm run copilot:my-status
```

**Entire team status:**
```bash
npm run copilot:status
```

### 4️⃣ Generate Reports

**Generate full team report:**
```bash
npm run copilot:report
```

This creates ``.copilot-tokens/team-report.json`` with:
- Total tokens and cost across team
- Per-developer breakdown
- Per-branch breakdown
- Recent entries

**Export data:**
```bash
npm run copilot:export json    # JSON format
npm run copilot:export csv     # CSV format
```

## Data Structure

### `.copilot-tokens/global-tokens.json`
Shared globally via git. Contains:
- Total tokens and cost
- Per-developer tracking (name, email, tokens, cost, usage count)
- Per-branch tracking
- Last update timestamp

**Example:**
```json
{
  "project": "pingome",
  "totalTokens": 850,
  "totalCost": 0.00425,
  "developers": {
    "dev@example.com": {
      "name": "Alice Dev",
      "tokens": 450,
      "cost": 0.00225,
      "usageCount": 3,
      "lastUsed": "2026-06-03T10:30:00.000Z"
    }
  },
  "branches": {
    "main": {
      "tokens": 450,
      "developers": { ... }
    },
    "feature/new-ui": {
      "tokens": 400,
      "developers": { ... }
    }
  }
}
```

### `.copilot-tokens/local-tokens.json`
Local file with all individual token log entries

### `.copilot-tokens/team-report.json`
Generated report with detailed breakdown

## Workflow for Teams

### Developer A - Working on Feature Branch

```bash
# On branch feature/dashboard
git checkout -b feature/dashboard

# Use Copilot Chat... (estimate: 100 tokens)

# Log the usage
npm run copilot:log 100 haiku "Designed dashboard layout with Copilot Chat"

# Check your status
npm run copilot:my-status

# Commit and push (git hooks auto-sync token data)
git add .
git commit -m "feat: dashboard layout"
git push  # Pre-push hook syncs tokens to global tracking
```

### Developer B - Checking Team Progress

```bash
# Latest code with token data
git pull  # Includes updated .copilot-tokens/

# See team status
npm run copilot:status

# Generate report
npm run copilot:report

# View team report
cat .copilot-tokens/team-report.json
```

## Pricing Reference

**Costs per million tokens:**

| Model | Input | Output |
|-------|-------|--------|
| Haiku | $0.80 | $4.00 |
| Sonnet | $3.00 | $15.00 |
| Opus | $15.00 | $75.00 |

*(Note: These are estimates - actual costs may vary)*

## Key Features

✅ **Per-Developer Tracking**
- See who used how many tokens
- Individual cost breakdowns
- Usage frequency

✅ **Per-Branch Tracking**
- Track tokens by feature branch
- See which branches cost the most
- Team contribution per branch

✅ **Global Sync**
- Git hooks auto-commit token data
- All team members see updated tracking
- Transparent team metrics

✅ **Detailed Reports**
- Team-wide cost analysis
- Developer rankings
- Branch comparison
- Recent activity log

✅ **Multiple Formats**
- JSON for integration
- CSV for spreadsheets
- Human-readable status output

## Commands Reference

```bash
# Log usage
npm run copilot:log 150 haiku "Code review"
npm run copilot:log 200 sonnet "Complex algorithm design"

# Check status
npm run copilot:my-status          # Your personal usage
npm run copilot:status             # Entire team usage

# Generate reports
npm run copilot:report             # Full team report
npm run copilot:export json        # Export as JSON
npm run copilot:export csv         # Export as CSV

# Clear data (if needed)
node copilot-tokens-tracker.js clear
```

## Best Practices

1. **Log Immediately** - Log tokens right after your Copilot Chat session
2. **Descriptive Notes** - Include what you used Copilot for
3. **Commit Regularly** - Push changes so team can see updated tracking
4. **Check Reports** - Review team reports to understand usage patterns
5. **Share Insights** - Use data to discuss team productivity

## Gitignore

The `.copilot-tokens/` directory is tracked in git so all team members can see it. If you want to keep it private (not recommended for team tracking), add to `.gitignore`:

```
.copilot-tokens/
```

## Troubleshooting

### "git config user.name not set"
Configure git:
```bash
git config user.name "Your Name"
git config user.email "your@email.com"
```

### "Permission denied" on git hooks
Make hooks executable:
```bash
chmod +x .git/hooks/post-commit
chmod +x .git/hooks/pre-push
```

### "No token data yet"
You haven't logged any tokens. Use:
```bash
npm run copilot:log 100 haiku "Test entry"
```

### ".copilot-tokens/ already exists from other branch"
This is normal and expected. Git will merge the data:
```bash
git pull  # Get latest token data from other branches
npm run copilot:status  # See combined data
```

## Integration with CI/CD

You can integrate token reports into your CI/CD pipeline:

```bash
# In your CI workflow
npm run copilot:report

# Upload report
curl -X POST https://your-api.com/reports \
  -F "file=@.copilot-tokens/team-report.json"
```

## Privacy Notes

- Tokens are tracked **per individual** with git email
- Branch and commit data are stored
- Timestamps show when tokens were logged
- All data is in `.copilot-tokens/` directory (git-tracked)
- Suggested: Make `.copilot-tokens/` a protected branch requiring approval

## Questions?

- Check `.copilot-tokens/global-tokens.json` for current data
- Run `npm run copilot:report` to see detailed breakdown
- Review `copilot-tokens-tracker.js` source for implementation details

---

**Happy Copilot-ing! 🚀**
