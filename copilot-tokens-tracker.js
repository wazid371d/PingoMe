#!/usr/bin/env node

/**
 * Copilot Chat Token Tracker for Teams
 * Tracks VS Code Copilot Chat tokens per developer, per branch, and globally
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const TRACKER_DIR = path.join(process.cwd(), '.copilot-tokens');
const GLOBAL_TRACKER_FILE = path.join(TRACKER_DIR, 'global-tokens.json');
const LOCAL_TRACKER_FILE = path.join(TRACKER_DIR, 'local-tokens.json');
const TEAM_REPORT_FILE = path.join(TRACKER_DIR, 'team-report.json');

// Ensure tracker directory exists
function ensureTrackerDir() {
  if (!fs.existsSync(TRACKER_DIR)) {
    fs.mkdirSync(TRACKER_DIR, { recursive: true });
  }
}

// Get current git branch
function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

// Get current developer (git user)
function getCurrentDeveloper() {
  try {
    const name = execSync('git config user.name').toString().trim();
    const email = execSync('git config user.email').toString().trim();
    return { name, email };
  } catch {
    return { name: os.userInfo().username, email: 'unknown@example.com' };
  }
}

// Get current git commit
function getCurrentCommit() {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

// Initialize or load global tokens file
function loadGlobalTokens() {
  ensureTrackerDir();
  if (fs.existsSync(GLOBAL_TRACKER_FILE)) {
    return JSON.parse(fs.readFileSync(GLOBAL_TRACKER_FILE, 'utf8'));
  }
  return {
    project: require(path.join(process.cwd(), 'package.json')).name,
    createdAt: new Date().toISOString(),
    developers: {},
    branches: {},
    totalTokens: 0,
    totalCost: 0,
  };
}

// Initialize or load local tokens file
function loadLocalTokens() {
  ensureTrackerDir();
  if (fs.existsSync(LOCAL_TRACKER_FILE)) {
    return JSON.parse(fs.readFileSync(LOCAL_TRACKER_FILE, 'utf8'));
  }
  return {
    createdAt: new Date().toISOString(),
    entries: [],
  };
}

// Log token usage
function logTokenUsage(tokens, model = 'haiku', description = 'Copilot Chat usage') {
  const developer = getCurrentDeveloper();
  const branch = getCurrentBranch();
  const commit = getCurrentCommit();
  
  // Pricing per model (per million tokens)
  const pricing = {
    'haiku': { input: 0.80, output: 4.00 },
    'sonnet': { input: 3.00, output: 15.00 },
    'opus': { input: 15.00, output: 75.00 },
  };

  const modelPrice = pricing[model] || pricing['haiku'];
  const cost = (tokens / 1000000) * (modelPrice.input + modelPrice.output) / 2;

  const entry = {
    timestamp: new Date().toISOString(),
    developer: developer.name,
    email: developer.email,
    branch,
    commit,
    tokens,
    cost: parseFloat(cost.toFixed(6)),
    model,
    description,
  };

  // Add to local tokens
  const localTokens = loadLocalTokens();
  localTokens.entries.push(entry);
  fs.writeFileSync(LOCAL_TRACKER_FILE, JSON.stringify(localTokens, null, 2));

  // Update global tokens
  const globalTokens = loadGlobalTokens();
  
  // Track per developer
  if (!globalTokens.developers[developer.email]) {
    globalTokens.developers[developer.email] = {
      name: developer.name,
      tokens: 0,
      cost: 0,
      usageCount: 0,
      lastUsed: null,
    };
  }
  globalTokens.developers[developer.email].tokens += tokens;
  globalTokens.developers[developer.email].cost += cost;
  globalTokens.developers[developer.email].usageCount += 1;
  globalTokens.developers[developer.email].lastUsed = entry.timestamp;

  // Track per branch
  if (!globalTokens.branches[branch]) {
    globalTokens.branches[branch] = {
      tokens: 0,
      cost: 0,
      developers: {},
    };
  }
  globalTokens.branches[branch].tokens += tokens;
  globalTokens.branches[branch].cost += cost;

  if (!globalTokens.branches[branch].developers[developer.email]) {
    globalTokens.branches[branch].developers[developer.email] = {
      name: developer.name,
      tokens: 0,
      cost: 0,
    };
  }
  globalTokens.branches[branch].developers[developer.email].tokens += tokens;
  globalTokens.branches[branch].developers[developer.email].cost += cost;

  // Update totals
  globalTokens.totalTokens += tokens;
  globalTokens.totalCost += cost;
  globalTokens.lastUpdated = entry.timestamp;

  fs.writeFileSync(GLOBAL_TRACKER_FILE, JSON.stringify(globalTokens, null, 2));

  return entry;
}

// Generate team report
function generateTeamReport() {
  const globalTokens = loadGlobalTokens();
  const localTokens = loadLocalTokens();

  const report = {
    generatedAt: new Date().toISOString(),
    project: globalTokens.project,
    summary: {
      totalTokens: globalTokens.totalTokens,
      totalCost: parseFloat(globalTokens.totalCost.toFixed(6)),
      totalDevelopers: Object.keys(globalTokens.developers).length,
      totalBranches: Object.keys(globalTokens.branches).length,
      totalEntries: localTokens.entries.length,
    },
    byDeveloper: Object.entries(globalTokens.developers).map(([email, data]) => ({
      email,
      name: data.name,
      tokens: data.tokens,
      cost: parseFloat(data.cost.toFixed(6)),
      usageCount: data.usageCount,
      averageTokensPerUsage: Math.round(data.tokens / data.usageCount),
      lastUsed: data.lastUsed,
    })),
    byBranch: Object.entries(globalTokens.branches).map(([branch, data]) => ({
      branch,
      tokens: data.tokens,
      cost: parseFloat(data.cost.toFixed(6)),
      developers: Object.entries(data.developers).map(([email, devData]) => ({
        email,
        name: devData.name,
        tokens: devData.tokens,
        cost: parseFloat(devData.cost.toFixed(6)),
      })),
    })),
    recentEntries: localTokens.entries.slice(-10).reverse(),
  };

  fs.writeFileSync(TEAM_REPORT_FILE, JSON.stringify(report, null, 2));
  return report;
}

// Show team status
function showTeamStatus() {
  const globalTokens = loadGlobalTokens();

  console.log('\n📊 Copilot Chat Token Tracker - Team Status\n');
  console.log(`Project: ${globalTokens.project}`);
  console.log(`Total Tokens: ${globalTokens.totalTokens}`);
  console.log(`Total Cost: $${globalTokens.totalCost.toFixed(6)}`);
  console.log(`Developers: ${Object.keys(globalTokens.developers).length}`);
  console.log(`Branches: ${Object.keys(globalTokens.branches).length}`);
  console.log('\n👥 By Developer:\n');

  Object.entries(globalTokens.developers).forEach(([email, data]) => {
    console.log(`  ${data.name} (${email})`);
    console.log(`    Tokens: ${data.tokens} | Cost: $${data.cost.toFixed(6)} | Uses: ${data.usageCount}`);
  });

  console.log('\n🌳 By Branch:\n');

  Object.entries(globalTokens.branches).forEach(([branch, data]) => {
    console.log(`  ${branch}`);
    console.log(`    Tokens: ${data.tokens} | Cost: $${data.cost.toFixed(6)}`);
  });

  console.log('\n');
}

// Show individual developer status
function showDeveloperStatus() {
  const developer = getCurrentDeveloper();
  const globalTokens = loadGlobalTokens();
  const devData = globalTokens.developers[developer.email];

  if (!devData) {
    console.log(`\nNo token data for ${developer.name} yet.\n`);
    return;
  }

  console.log(`\n👤 ${developer.name} (${developer.email})`);
  console.log(`   Tokens: ${devData.tokens}`);
  console.log(`   Cost: $${devData.cost.toFixed(6)}`);
  console.log(`   Usage Count: ${devData.usageCount}`);
  console.log(`   Last Used: ${devData.lastUsed}\n`);
}

// CLI
const command = process.argv[2];

switch (command) {
  case 'log':
    const tokens = parseInt(process.argv[3] || '50', 10);
    const model = process.argv[4] || 'haiku';
    const description = process.argv[5] || 'Copilot Chat usage';
    const entry = logTokenUsage(tokens, model, description);
    console.log(`\n✅ Logged ${tokens} tokens for ${entry.developer}`);
    console.log(`   Cost: $${entry.cost.toFixed(6)}\n`);
    break;

  case 'status':
    showTeamStatus();
    break;

  case 'my-status':
    showDeveloperStatus();
    break;

  case 'report':
    const report = generateTeamReport();
    console.log('\n📋 Team Report Generated\n');
    console.log(`Total Cost: $${report.summary.totalCost.toFixed(6)}`);
    console.log(`Total Tokens: ${report.summary.totalTokens}`);
    console.log(`Report saved to: ${TEAM_REPORT_FILE}\n`);
    break;

  case 'export':
    const format = process.argv[3] || 'json';
    const globalTokens = loadGlobalTokens();
    if (format === 'csv') {
      const csv = generateCSVReport(globalTokens);
      console.log(csv);
    } else {
      console.log(JSON.stringify(globalTokens, null, 2));
    }
    break;

  case 'clear':
    if (fs.existsSync(GLOBAL_TRACKER_FILE)) {
      fs.unlinkSync(GLOBAL_TRACKER_FILE);
    }
    if (fs.existsSync(LOCAL_TRACKER_FILE)) {
      fs.unlinkSync(LOCAL_TRACKER_FILE);
    }
    console.log('\n✅ Token tracking data cleared\n');
    break;

  default:
    console.log(`
Usage:
  copilot-tokens-tracker.js log [tokens] [model] [description]  - Log token usage
  copilot-tokens-tracker.js status                               - Show team status
  copilot-tokens-tracker.js my-status                            - Show your status
  copilot-tokens-tracker.js report                               - Generate team report
  copilot-tokens-tracker.js export [json|csv]                    - Export data
  copilot-tokens-tracker.js clear                                - Clear all data

Examples:
  node copilot-tokens-tracker.js log 150 haiku "Code review via chat"
  node copilot-tokens-tracker.js status
  node copilot-tokens-tracker.js report
    `);
}

module.exports = {
  logTokenUsage,
  loadGlobalTokens,
  loadLocalTokens,
  generateTeamReport,
  showTeamStatus,
  showDeveloperStatus,
};
