#!/usr/bin/env node
import fs from 'fs'; import path from 'path'; import readline from 'readline';
const ROOT = process.cwd();
const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out')+1] : './store';
const tokensPath = path.join(ROOT, 'design.tokens.json');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, ans => res(ans)));

function fallback(v, d){ return (v && String(v).trim()) || d }

async function main(){
  const tokens = fs.existsSync(tokensPath) ? JSON.parse(fs.readFileSync(tokensPath,'utf8')) : null;
  const brand = tokens?.meta?.brand || 'Supernova';
  const appName = fallback(await ask(`App name [${brand}]: `), brand);
  const subtitle = fallback(await ask('Subtitle [AI-powered app builder]: '), 'AI-powered app builder');
  const shortDesc = fallback(await ask('Short description [Design, build, and ship apps]: '), 'Design, build, and ship apps');
  const fullDesc = fallback(await ask('Full description [Supernova helps teams...]: '), 'Supernova helps teams design, build, and ship cross-platform apps with approvals, diffs, and OTA updates.');
  rl.close();

  const playT = JSON.parse(fs.readFileSync(path.join(ROOT, 'store/play/listing.template.json'),'utf8'));
  playT.title = appName; playT.shortDescription = shortDesc; playT.fullDescription = fullDesc;

  const iosT = JSON.parse(fs.readFileSync(path.join(ROOT, 'store/ios/metadata.template.json'),'utf8'));
  iosT.name = appName; iosT.subtitle = subtitle; iosT.description = fullDesc;

  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.join(OUT, 'play'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'ios'), { recursive: true });
  fs.writeFileSync(path.join(OUT,'play','listing.json'), JSON.stringify(playT,null,2));
  fs.writeFileSync(path.join(OUT,'ios','metadata.json'), JSON.stringify(iosT,null,2));
  console.log('Store metadata written to', OUT);
}
main().catch(e=>{ console.error(e); process.exit(1) });
