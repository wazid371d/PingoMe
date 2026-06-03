#!/bin/bash

# Setup script for Copilot Tokens Tracker
# This script installs git hooks for automatic token tracking

echo "🚀 Setting up Copilot Tokens Tracker..."
echo ""

# Check if .git directory exists
if [ ! -d ".git" ]; then
  echo "❌ Not a git repository. Run this from your project root."
  exit 1
fi

# Ensure .git/hooks directory exists
if [ ! -d ".git/hooks" ]; then
  mkdir -p .git/hooks
fi

# Copy git hooks
echo "📝 Installing git hooks..."

if [ -f ".git-hooks-post-commit" ]; then
  cp .git-hooks-post-commit .git/hooks/post-commit
  chmod +x .git/hooks/post-commit
  echo "   ✅ post-commit hook installed"
else
  echo "   ⚠️  .git-hooks-post-commit not found"
fi

if [ -f ".git-hooks-pre-push" ]; then
  cp .git-hooks-pre-push .git/hooks/pre-push
  chmod +x .git/hooks/pre-push
  echo "   ✅ pre-push hook installed"
else
  echo "   ⚠️  .git-hooks-pre-push not found"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start tracking: npm run copilot:log 100 haiku 'description'"
echo "  2. Check status:  npm run copilot:status"
echo "  3. View report:   npm run copilot:report"
echo ""
echo "📖 Read COPILOT-TOKENS-TRACKER.md for full documentation"
echo ""
