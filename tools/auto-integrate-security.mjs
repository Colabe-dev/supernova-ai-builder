#!/usr/bin/env node
import fs from 'fs'; import path from 'path';
const args = Object.fromEntries(process.argv.slice(2).map(a => a.startsWith('--') ? a.slice(2).split('=') : [a, true]));
const FILE = args.file || 'server/index.js';
const YES = args.yes || args.y || false;

const root = process.cwd();
const fp = path.join(root, FILE);
if (!fs.existsSync(fp)) {
  console.error('Cannot find', FILE, '(use --file to point to your server entry)');
  process.exit(1);
}
let src = fs.readFileSync(fp, 'utf8');

function ensureImport(text, what, fromPath){
  const re = new RegExp(`import\\s+.*${what}.*from\\s+['\"]${fromPath}['\"]`);
  if (re.test(text)) return text;
  const stmt = `\nimport ${what} from '${fromPath}';`;
  if (!/\bimport\b/.test(text)) return stmt + "\n" + text;
  return text.replace(/(import[\s\S]*?;)(?![\s\S]*import)/, m => m + stmt);
}

function ensureNamedImport(text, names, fromPath){
  const re = new RegExp(`import\\s+\\{[^}]*\\}\\s+from\\s+['\"]${fromPath}['\"]`);
  if (re.test(text)) {
    // extend the import
    return text.replace(re, (m) => {
      const inside = m.match(/\{([^}]*)\}/)[1];
      const parts = inside.split(',').map(s=>s.trim()).filter(Boolean);
      const add = names.filter(n=>!parts.includes(n));
      const joined = [...parts, ...add].join(', ');
      return `import { ${joined} } from '${fromPath}'`;
    });
  }
  const stmt = `\nimport { ${names.join(', ')} } from '${fromPath}';`;
  return text.replace(/(import[\s\S]*?;)(?![\s\S]*import)/, m => m + stmt);
}

function ensureUse(text, line){
  if (text.includes(line)) return text;
  // insert after first app creation line
  const appRe = /(const|let|var)\s+app\s*=\s*express\(\)\s*;?/;
  if (appRe.test(text)) {
    return text.replace(appRe, (m) => m + "\n" + line);
  }
  // fallback: append at end
  return text + "\n" + line + "\n";
}

let out = src;

// Imports
out = ensureImport(out, 'jwksRouter', './auth/jwks/publish.js');
// Prefer Security Pro index limiter if present; else pro.js; else index.js
const limiterCandidates = ['./rateLimit/index.js','./rateLimit/pro.js'];
let limiterPath = limiterCandidates.find(p => fs.existsSync(path.join(root,'server', p.replace('./',''))));
if (!limiterPath) limiterPath = './rateLimit/index.js';
out = ensureNamedImport(out, ['parseAuthJwks','requireAuth'], './auth/verify.js');
out = ensureNamedImport(out, ['rateLimit'], limiterPath);
// Secured entitlements routes path
let entPath = './entitlements/routes.db.secpro.js';
if (!fs.existsSync(path.join(root,'server', entPath.replace('./','')))) {
  // fallback to secured RBAC
  entPath = './entitlements/routes.db.secured.js';
  if (!fs.existsSync(path.join(root,'server', entPath.replace('./','')))) {
    // fallback to db routes
    entPath = './entitlements/routes.db.js';
  }
}
out = ensureImport(out, 'entitlementsRoutes', entPath);

// Middlewares mounting
out = ensureUse(out, "app.use('/auth', jwksRouter);");
out = ensureUse(out, "app.use('/api', entitlementsRoutes);");

if (out === src){
  console.log('No changes needed. Already integrated.');
  process.exit(0);
}

function unifiedDiff(a, b){
  const al = a.split('\n'); const bl = b.split('\n');
  const max = Math.max(al.length, bl.length);
  let diff = [];
  for (let i=0;i<max;i++){
    const L = al[i] ?? ''; const R = bl[i] ?? '';
    if (L === R) diff.push('  ' + R);
    else {
      if (L) diff.push('- ' + L);
      if (R) diff.push('+ ' + R);
    }
  }
  return diff.join('\n');
}

const d = unifiedDiff(src, out);
console.log('---', FILE, '\n+++', FILE, '\n' + d);

if (YES){
  fs.writeFileSync(fp, out, 'utf8');
  console.log('Applied changes to', FILE);
} else {
  console.log('\nDRY RUN. Pass --yes to write changes.');
}
