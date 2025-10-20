# Supernova Workbench (split chat + workspace)
Date: 20251020-060200

Adds a **two-pane builder** like you requested:
- **Left:** Live chat (LLM Planner v2, autonomy, model field).
- **Right:** Workspace tabs (Project/Dev/Diffs/Preview/Usage/Settings).
- **Resizable** splitter (20–70%).

## Files
- `client/src/pages/Workbench.jsx`
- `client/src/components/ChatEmbedded.jsx`
- `client/src/components/WorkspaceTabs.jsx`
- `client/src/styles/workbench.css`
- Patches:
  - `patches/0001-client-main-workbench-route.patch` — adds route `/workbench`
  - `patches/0002-header-add-workbench-link.patch` — header link
  - `patches/0003-landing-redirect-optional.patch` — optional auto-redirect `/` → `/workbench`

## Apply
```bash
unzip supernova-workbench-patch-20251020-060200.zip -d .

# add route + nav
git apply patches/0001-client-main-workbench-route.patch || echo "merge main.jsx manually"
git apply patches/0002-header-add-workbench-link.patch || true
# (optional) redirect landing to workbench
# git apply patches/0003-landing-redirect-optional.patch || true

cd client && npm run dev
```

> WebSocket path default is `/ws`. If your server uses a different endpoint, set `VITE_WS_PATH` in your client env.
