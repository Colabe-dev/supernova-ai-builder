#!/bin/bash
# Automatic GitHub Sync Script for Supernova
# This script pushes your code to GitHub automatically

set -e

echo "🚀 Starting GitHub Sync..."

# Repository details
REPO_URL="https://${GITHUB_TOKEN}@github.com/Colabe-dev/supernova-ai-builder.git"
BRANCH="main"

# Configure Git user
git config user.name "Colabe-dev" || true
git config user.email "dev@colabe.com" || true

# Remove any lock files if they exist
rm -f .git/index.lock .git/config.lock 2>/dev/null || true

# Check if github remote exists, if not add it
if ! git remote get-url github &>/dev/null; then
  echo "📌 Adding GitHub remote..."
  git remote add github "$REPO_URL"
else
  echo "✅ GitHub remote already exists"
  git remote set-url github "$REPO_URL"
fi

# Stage all changes
echo "📦 Staging changes..."
git add -A

# Check if there are changes to commit
if git diff --staged --quiet; then
  echo "✨ No changes to commit - everything is up to date!"
else
  # Commit with timestamp
  TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
  echo "💾 Committing changes..."
  git commit -m "Auto-sync: $TIMESTAMP" || true
fi

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git push github main --force 2>&1 || {
  echo "⚠️  First push - setting upstream..."
  git push -u github main --force
}

echo "✅ Successfully synced to GitHub!"
echo "🔗 View at: https://github.com/Colabe-dev/supernova-ai-builder"
