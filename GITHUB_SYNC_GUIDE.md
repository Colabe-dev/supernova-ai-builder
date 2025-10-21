# 🚀 Supernova GitHub Auto-Sync Setup Guide

## Your Repository
**GitHub URL:** https://github.com/Colabe-dev/supernova-ai-builder  
**Created:** ✅ Ready to use!

---

## 🎯 Setting Up Automatic Sync

Replit has built-in Git protections that prevent automated git commands. Here's how to set up syncing:

### Method 1: Replit's Built-In Git (RECOMMENDED - One-Click)

1. **Open Git Panel**
   - Click the **branch icon** (🌿) in Replit's left sidebar
   - Or press `Ctrl/Cmd + Shift + G`

2. **Connect to GitHub Repository**
   - Look for "Remote" or "Add Remote" button
   - Paste: `https://github.com/Colabe-dev/supernova-ai-builder.git`
   - Authenticate with GitHub (use your GITHUB_TOKEN if prompted)

3. **Initial Commit & Push**
   - Click **"Stage all"** or the `+` button next to Changes
   - Enter commit message: `"Initial commit - Supernova AI Builder"`
   - Click **"Commit"** then **"Push"**

4. **Enable Auto-Sync** (if available)
   - Some Replit plans have "Auto-commit" feature
   - Enable it in Git settings to automatically push changes

---

### Method 2: Manual Sync Script (When Needed)

I've created `sync-github.sh` for you. Run it manually when you want to push:

```bash
./sync-github.sh
```

**Note:** Due to Replit's Git locks, you may need to:
1. Remove lock files first (they'll show an error message)
2. Run the script using Replit's Shell tool directly

---

### Method 3: Using Replit's Shell (Advanced)

If you prefer command-line, use these commands in Replit's Shell:

```bash
# One-time setup
git remote add github https://github.com/Colabe-dev/supernova-ai-builder.git

# Every time you want to sync
git add -A
git commit -m "Auto-sync: $(date)"
git push github main
```

**Note:** You may need to authenticate with your GitHub token the first time.

---

## 🔑 Authentication Options

### Option A: HTTPS with Token (Easier)
```bash
git remote set-url github https://${GITHUB_TOKEN}@github.com/Colabe-dev/supernova-ai-builder.git
```

### Option B: SSH (More Secure)
1. Get your Replit SSH key:
   - Replit Settings → SSH Keys → Copy public key
2. Add to GitHub:
   - https://github.com/settings/keys
   - "New SSH key" → Paste → Save
3. Use SSH URL:
```bash
git remote add github git@github.com:Colabe-dev/supernova-ai-builder.git
```

---

## ✅ Verification

After setup, verify it's working:

```bash
git remote -v
```

Should show:
```
github  https://github.com/Colabe-dev/supernova-ai-builder.git (fetch)
github  https://github.com/Colabe-dev/supernova-ai-builder.git (push)
```

---

## 🎉 Next Steps

1. Follow **Method 1** (Replit UI) - it's the easiest
2. Make a test commit to verify everything works
3. Your code will now be backed up on GitHub!

Need help? The sync script is at `./sync-github.sh` and this guide is at `GITHUB_SYNC_GUIDE.md`
