#!/usr/bin/env node
// Reusable URL grouping — implements excat Agent 2 right-to-left directory pattern.
// Usage: node group-urls.js <catalogFolder>
const fs = require('fs');
const path = require('path');

const catalog = process.argv[2] || '/workspace/catalog';
const data = JSON.parse(fs.readFileSync(path.join(catalog, 'urls-all.json'), 'utf8'));
let urls = data['analysis-urls-all'].urls.map((u) => u.url);

function pattern(url) {
  const p = new URL(url).pathname.toLowerCase();
  if (p === '/' || p === '') return '/';
  const seg = p.split('/').filter((s) => s);
  if (seg.length === 1) return '/' + seg[0];
  let dir = seg.slice(0, -1);
  while (dir.length > 0) {
    const l = dir[dir.length - 1];
    if (/^\d+$/.test(l) || /^(data|titulo|nome|order|sort|filter).*-(crescente|decrescente|asc|desc)$/i.test(l)) {
      dir = dir.slice(0, -1);
    } else break;
  }
  if (dir.length === 0) return '/' + seg[0];
  return '/' + dir.join('/');
}

const map = {};
urls.forEach((u) => { const k = pattern(u); (map[k] = map[k] || []).push(u); });
const groups = {};
const singles = [];
for (const k in map) {
  if (k === '/' || map[k].length >= 2) groups[k] = map[k];
  else singles.push(...map[k]);
}
const remaining = [];
singles.forEach((u) => {
  const seg = new URL(u).pathname.split('/').filter((s) => s);
  let placed = false;
  for (let i = seg.length - 1; i > 0 && !placed; i--) {
    const parent = '/' + seg.slice(0, i).join('/');
    if (groups[parent]) { groups[parent].push(u); placed = true; }
  }
  if (!placed) remaining.push(u);
});
if (remaining.length) groups['unknown'] = remaining;

function conf(arr, name) {
  if (name === '/') return '100%';
  if (name === 'unknown') return '50%';
  const segs = arr.map((u) => new URL(u).pathname.split('/').filter((s) => s).length);
  const same = segs.every((s) => s === segs[0]);
  if (same && arr.length >= 5) return '95%';
  if (same && arr.length >= 2) return '90%';
  const avg = segs.reduce((a, b) => a + b, 0) / segs.length;
  const v = segs.map((s) => Math.abs(s - avg)).reduce((a, b) => a + b, 0) / segs.length;
  if (v < 0.5) return '85%';
  if (v < 1.5) return '75%';
  return '65%';
}

const names = Object.keys(groups).sort((a, b) => {
  if (a === '/') return -1; if (b === '/') return 1;
  if (a === 'unknown') return 1; if (b === 'unknown') return -1;
  return a.localeCompare(b);
});
const out = { 'analysis-urls-grouped': { captured: new Date().toISOString(), urlGroupings: names.length, locales: { pt: urls.length }, groups: {} } };
names.forEach((n) => { out['analysis-urls-grouped'].groups[n] = { confidence: conf(groups[n], n), urls: groups[n].map((u) => ({ url: u })) }; });
fs.writeFileSync(path.join(catalog, 'urls-grouped.json'), JSON.stringify(out, null, 2));
console.log('Groups:', names.length);
names.forEach((n) => console.log('  ' + n + ' (' + groups[n].length + ')'));
