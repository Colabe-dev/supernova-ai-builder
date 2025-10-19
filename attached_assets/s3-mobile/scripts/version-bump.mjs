#!/usr/bin/env node
import fs from 'fs'; import path from 'path';
const appJsonPath = path.join(process.cwd(), 'mobile-expo', 'app.json');
const type = process.argv[2] || 'patch';
function bumpSemver(v, type){ const [maj, min, pat] = v.split('.').map(n=>parseInt(n,10)||0); if(type==='major') return `${maj+1}.0.0`; if(type==='minor') return `${maj}.${min+1}.0`; return `${maj}.${min}.${pat+1}` }
const app = JSON.parse(fs.readFileSync(appJsonPath,'utf8'));
const cur = app.expo.version || '0.1.0';
const next = bumpSemver(cur, type);
app.expo.version = next;
fs.writeFileSync(appJsonPath, JSON.stringify(app,null,2));
console.log('Version:', cur, '->', next);
