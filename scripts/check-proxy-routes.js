// Every backend route the web app calls must be in the proxy allow-list
// (src/app/api/kc/[...path]/route.ts), or it fails in production with "Not found".
// That happened once (bills/plans, bills/recent — 2026-10-04). Run before pushing:
//   node scripts/check-proxy-routes.js
const fs = require('fs');
const path = require('path');

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f)) files.push(p);
  }
})(path.join(__dirname, '..', 'src'));

const proxy = fs.readFileSync(path.join(__dirname, '..', 'src/app/api/kc/[...path]/route.ts'), 'utf8');
const allowed = new Set([...proxy.matchAll(/^\s*'([a-z0-9/._-]+)':\s*\[/gm)].map(m => m[1]));
// Routes with an id are allowed by pattern in the proxy (ALLOWED_PATTERNS).
const byPattern = /^(withdraw\/jobs|bills\/jobs|send\/jobs|swap\/jobs|earn\/jobs|transfer\/jobs|bridge\/jobs|bridge\/orders\/|receipts)(\/|$)/;

const used = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/kc<[^>]*>\(\s*[`']([^`'?$]+)/g)) used.add(m[1].replace(/\/$/, ''));
  for (const m of s.matchAll(/\/api\/kc\/([a-z/._-]+)/g)) used.add(m[1].replace(/\/$/, ''));
}
const missing = [...used].filter(u => !allowed.has(u) && !byPattern.test(u));
if (missing.length) {
  console.error('Missing from the proxy allow-list:', missing.join(', '));
  process.exit(1);
}
console.log(`OK — ${used.size} routes used, all allowed.`);
