import fs from 'fs';
import path from 'path';
import { diffLines } from 'diff';

const ROOT = process.cwd();
const WHITELIST = new Set(['client/src', 'server', 'shared', 'public']);
const STATE_DIR = path.join(ROOT, 'server', '.supernova');

function normalizeAllowed(relPath: string): string {
  const abs = path.join(ROOT, relPath);
  const rel = path.relative(ROOT, abs);
  
  if (rel.startsWith('..')) {
    throw new Error('Path escape attempt');
  }
  
  const topDir = rel.split(path.sep)[0];
  const isAllowed = Array.from(WHITELIST).some(wl => rel.startsWith(wl));
  
  if (!isAllowed) {
    throw new Error(`Path not in whitelist: ${rel}`);
  }
  
  return abs;
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function statePath(filename: string): string {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
  return path.join(STATE_DIR, filename);
}

interface BuildAction {
  path: string;
  content?: string;
  mutator?: (json: any) => any;
  apply?: boolean;
  id?: string;
  previous?: string;
}

export async function builder(act: BuildAction) {
  const id = act.id || 'patch-' + Date.now();
  const rel = act.path;
  const abs = normalizeAllowed(rel);

  if (!act.apply) {
    // Preview mode
    let base = '';
    if (fs.existsSync(abs)) {
      base = fs.readFileSync(abs, 'utf-8');
    }

    let next = base;
    if (act.content != null) {
      next = act.content;
    }
    if (act.mutator) {
      try {
        const json = base ? JSON.parse(base) : {};
        next = JSON.stringify(act.mutator(json), null, 2);
      } catch (e) {
        next = base;
      }
    }

    const parts = diffLines(base, next);
    const unified = parts
      .map(p => (p.added ? '+' + p.value : p.removed ? '-' + p.value : ''))
      .join('');

    const previewPath = statePath(`${id}.preview.json`);
    fs.writeFileSync(previewPath, JSON.stringify({ rel, base, next }, null, 2));

    return { id, path: rel, diff: unified, base };
  }

  // Apply mode
  try {
    const previewPath = statePath(`${id}.preview.json`);
    const snap = JSON.parse(fs.readFileSync(previewPath, 'utf-8'));
    ensureDir(abs);
    fs.writeFileSync(abs, snap.next, 'utf-8');
    return { ok: true };
  } catch {
    // Fallback if apply called directly with content
    let content = '';
    if (act.content != null) content = act.content;
    ensureDir(abs);
    fs.writeFileSync(abs, content, 'utf-8');
    return { ok: true };
  }
}
