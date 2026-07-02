#!/usr/bin/env node
/*
 * Generate an azhealthclub-style interactive Site Analysis Report for a catalog folder.
 * Usage: node gen-report.js <catalogFolder> <siteHost> [outFile]
 * Reads: template-catalog.json, block-catalog.json, summary.json, urls-all.json,
 *        .catalog-config.json, plus screenshot jpgs under .pages/ and .blocks/.
 * Screenshots are embedded as base64 data URIs so the report is fully self-contained.
 */
const fs = require('fs');
const path = require('path');

const catalog = process.argv[2];
const host = process.argv[3];
const outFile = process.argv[4] || path.join('/workspace', `Final Report ${host.replace(/\./g,'-')}.html`);

const rd = f => JSON.parse(fs.readFileSync(path.join(catalog, f), 'utf8'));
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ---- embed screenshot as data URI ----
const imgCache = new Map();
function dataUri(relPath) {
  if (!relPath) return '';
  if (imgCache.has(relPath)) return imgCache.get(relPath);
  const abs = path.join(catalog, relPath);
  let uri = '';
  try {
    const buf = fs.readFileSync(abs);
    const ext = path.extname(abs).slice(1).toLowerCase();
    const mime = ext === 'png' ? 'image/png' : (ext === 'svg' ? 'image/svg+xml' : 'image/jpeg');
    uri = `data:${mime};base64,${buf.toString('base64')}`;
  } catch { uri = ''; }
  imgCache.set(relPath, uri);
  return uri;
}

// ---- load data ----
const tpl = rd('template-catalog.json').templates || [];
const blockCat = rd('block-catalog.json')['analysis-block-catalog'] || {};
const variants = blockCat.blockVariants || {};
const summary = rd('summary.json')['analysis-summary'] || {};
const metrics = summary.metrics || {};
const urlsAll = rd('urls-all.json')['analysis-urls-all'] || {};
let cfg = {}; try { cfg = rd('.catalog-config.json'); } catch {}
const siteUrl = (cfg.siteUrl || `https://${host}/`).replace(/\/$/, '');

const allUrls = (urlsAll.urls || []).map(u => u.url);
const totalUrls = urlsAll.totalUrls || allUrls.length;
// A layout is a TEMPLATE only when shared by more than 5 pages; everything else
// is a one-off UNIQUE PAGE. The catalog stores both in template-catalog.json, so
// split them here for accurate counting/display.
const TEMPLATE_MIN_PAGES = 5;
// content-only pages (no blocks, just rich text) always form one template
// regardless of count — same trivial migration profile.
const isTemplate = t => (t.urls || []).length > TEMPLATE_MIN_PAGES || t.layoutSignature === 'content-only';
const realTemplates = tpl.filter(isTemplate);
const uniquePages = tpl.filter(t => !isTemplate(t));
const numRealTemplates = realTemplates.length;
const numUniquePages = uniquePages.length;
const totalTemplates = numRealTemplates;
const totalBlockVariants = blockCat.totalBlockVariants || Object.keys(variants).length;
const pagesAnalyzed = metrics.pagesAnalyzed || 0;
const pct = metrics.percentAnalyzed != null ? metrics.percentAnalyzed : 100;

// ---- split header/footer globals from content variants ----
const entries = Object.entries(variants);
const globalHF = { header: null, footer: null };
const contentVariants = [];
for (const [k, v] of entries) {
  if (v.baseBlock === 'header') globalHF.header = v;
  else if (v.baseBlock === 'footer') globalHF.footer = v;
  else contentVariants.push(v);
}

// ---- URL inventory by first path-prefix segment ----
function prefixOf(u) {
  try { const p = new URL(u).pathname.replace(/\/$/, ''); const seg = p.split('/').filter(Boolean)[0]; return seg ? '/' + seg : '/'; }
  catch { return '/'; }
}
const groups = {};
for (const u of allUrls) { const g = prefixOf(u); (groups[g] = groups[g] || []).push(u); }
const groupNames = Object.keys(groups).sort((a,b)=> a==='/'?-1:b==='/'?1:a.localeCompare(b));

function labelFor(u) {
  try { const p = new URL(u).pathname.replace(/\/$/, ''); return p === '' ? 'Home' : decodeURIComponent(p.replace(/^\//,'')); }
  catch { return u; }
}

// map url -> full-page.jpg via .pages dir scan
let pageMap = null;
function buildPageMap() {
  pageMap = {};
  const base = path.join(catalog, '.pages');
  let dirs = [];
  try { dirs = fs.readdirSync(base); } catch { return; }
  for (const d of dirs) {
    const pc = path.join(base, d, 'page-catalog.json');
    if (!fs.existsSync(pc)) continue;
    try { const j = JSON.parse(fs.readFileSync(pc,'utf8')); if (j.url) pageMap[j.url.replace(/\/$/,'')] = path.join('.pages', d, 'full-page.jpg'); } catch {}
  }
}
function pageScreenshot(u) {
  if (!pageMap) buildPageMap();
  const rel = pageMap[u.replace(/\/$/,'')];
  return rel && fs.existsSync(path.join(catalog, rel)) ? dataUri(rel) : '';
}

// ---- build template cards (real templates first, then unique pages) ----
const orderedTpl = [...realTemplates, ...uniquePages];
function templateCard(t, idx) {
  const n = (t.urls || []).length;
  const reps = t.representativePages || [];
  let shot = '';
  for (const rep of reps) {
    const s = pageScreenshot(rep);
    if (s) { shot = s; break; }
  }
  const sampleUrls = (t.urls || []).slice(0,5);
  const repHrs = (Math.max(0,n-1) * 15 / 60);
  return `
        <div class="template-card" data-template-index="${idx}" data-url-count="${n}">
          <div class="template-header">
            <div>
              <h4><span class="template-number">${idx+1}</span><span class="template-name">${esc(t.name)}</span></h4>
              <div class="template-meta"><span class="url-count">${n} page${n===1?'':'s'}</span></div>
            </div>
          </div>
          <div class="template-body">
            <div class="template-screenshot">${shot ? `<img src="${shot}" alt="" loading="lazy" onclick="openLightbox(this.src)">` : '<div class="no-screenshot" style="height:200px;">No screenshot</div>'}</div>
            <div class="template-details">
              <div class="sample-urls">
                <h5>Sample URLs (${sampleUrls.length} of ${n})</h5>
                <ul>${sampleUrls.map(u=>`<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(labelFor(u))}</a></li>`).join('\n')}</ul>
              </div>
              <p class="jt-template-desc">${esc(t.description||'')}</p>
              <div class="calculator">
                <div class="calc-row"><label>Initial template (hrs):</label><input type="number" class="template-initial-hours" value="5" min="0" max="500" step="0.5" onchange="recalcTemplateCard(this)" oninput="recalcTemplateCard(this)"><span class="unit">hrs</span></div>
                <div class="calc-row"><label>Replicate (mins / non-template page):</label><input type="number" class="template-replicate-mins" value="15" min="0" max="480" step="1" onchange="recalcTemplateCard(this)" oninput="recalcTemplateCard(this)"><span class="unit">mins</span></div>
                <div class="calc-row jt-template-meta-row"><span class="jt-template-meta-label">Pages (1 = template only, no replication):</span><strong>${n}</strong><span class="unit">&rarr; ${Math.max(0,n-1)} &times; replicate</span></div>
                <div class="jt-template-breakdown"><span>Initial: <strong id="template-init-hours-${idx}">5.0</strong> hrs</span><span>+</span><span>Replication: <strong id="template-rep-hours-${idx}">${repHrs.toFixed(1)}</strong> hrs</span><span>=</span></div>
                <div class="calc-row calc-total"><label>Total migration:</label><span class="result template-migration-total" id="template-migration-total-${idx}">${(5+repHrs).toFixed(1)} hrs</span></div>
              </div>
            </div>
          </div>
        </div>`;
}
// global index tracks position across both groups so calculator IDs stay unique
let _ti = 0;
const templateCardsHtml = realTemplates.map(t => templateCard(t, _ti++)).join('\n');

// unique pages -> compact list rows (no screenshots), each still contributes hours
function uniqueRow(t, idx) {
  const u = (t.urls || [])[0] || '';
  return `
          <tr class="template-card" data-template-index="${idx}" data-url-count="1">
            <td class="unique-idx">${idx+1}</td>
            <td class="unique-url"><a href="${esc(u)}" target="_blank" rel="noopener">${esc(labelFor(u))}</a></td>
            <td class="unique-sig"><code>${esc(t.layoutSignature||'')}</code></td>
            <td class="unique-hrs"><input type="number" class="template-initial-hours" value="5" min="0" max="500" step="0.5" onchange="recalcTemplateCard(this)" oninput="recalcTemplateCard(this)"><span class="unit">hrs</span><input type="hidden" class="template-replicate-mins" value="0"><span class="result template-migration-total" id="template-migration-total-${idx}" style="display:none">5.0 hrs</span></td>
          </tr>`;
}
const uniqueRowsHtml = uniquePages.map(t => uniqueRow(t, _ti++)).join('\n');

// ---- build block cards ----
const blockCards = contentVariants.map(v => {
  const shots = (v.screenshots || []).slice(0,4);
  const shotHtml = shots.length
    ? shots.map(s=>`<div class="screenshot-item"><img src="${dataUri(s)}" alt="${esc(v.blockVariantId)}" loading="lazy" onclick="openLightbox(this.src)"></div>`).join('\n')
    : '<div class="no-screenshot">No screenshot</div>';
  const standalone = v.canonicalModel === 'standalone';
  return `
        <div class="block-card-with-calc">
          <div class="block-card">
            <div class="block-header">
              <h3>${esc(v.blockVariantId)}</h3>
              <div class="block-badges"><span class="badge badge-primary">${esc(v.baseBlock)}</span><span class="badge ${standalone?'badge-success':'badge-warning'}">${standalone?'standalone':esc(v.canonicalModel)}</span></div>
            </div>
            <div class="block-stats"><div class="stat"><span class="stat-value">${v.pagesFound||0}</span><span class="stat-label">Pages</span></div></div>
            <div class="block-screenshots">${shotHtml}</div>
            <p style="padding: 10px 20px; font-size: 0.85rem; color: #666;">${esc(v.description||'')}</p>
          </div>
          <div class="block-calc-panel">
            <div class="calc-title">Migration Estimate</div>
            <div class="calc-inputs-row">
              <div class="calc-input-group"><label>Initial (hrs)</label><input type="number" class="block-initial-hours" value="0" min="0" max="200" step="0.5" onchange="calculateBlockTime()" oninput="calculateBlockTime()"></div>
              <div class="calc-input-group"><label>Replicate (mins)</label><input type="number" class="block-replicate-mins" value="0" min="0" max="480" step="1" onchange="calculateBlockTime()" oninput="calculateBlockTime()"></div>
            </div>
            <div class="calc-result"><span class="result-label">Pages using:</span><span class="result-value">${v.pagesFound||0}</span></div>
            <div class="calc-result"><span class="result-label">Total:</span><span class="result-value block-total-hours">0 hrs</span></div>
          </div>
        </div>`;
}).join('\n');

// header/footer screenshots
const headerShot = globalHF.header && globalHF.header.screenshots && globalHF.header.screenshots[0] ? dataUri(globalHF.header.screenshots[0]) : '';
const footerShot = globalHF.footer && globalHF.footer.screenshots && globalHF.footer.screenshots[0] ? dataUri(globalHF.footer.screenshots[0]) : '';

// URL inventory rows
const invRows = groupNames.map(g => {
  const list = groups[g];
  return `<tr>
      <td class="group-name">${esc(g)}</td>
      <td class="count">${list.length}</td>
      <td class="count">${list.length}</td>
      <td class="sample-url"><a href="${esc(list[0])}" target="_blank" rel="noopener">${esc(list[0])}</a></td>
    </tr>`;
}).join('\n');

const titleName = host;
const gen = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(host)} Site Analysis Report — ${totalUrls} Pages</title>
  <style>
    :root { --primary:#002664; --secondary:#0066cc; --success:#28a745; --warning:#ffc107; --danger:#dc3545; --light:#f8f9fa; --dark:#343a40; --border:#dee2e6; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f7fa; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    header { background: linear-gradient(135deg, var(--primary) 0%, #003d99 100%); color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    header h1 { font-size: 2.5rem; margin-bottom: 10px; }
    header p { opacity: 0.9; font-size: 1.1rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align: center; }
    .stat-card .number { font-size: 2.5rem; font-weight: 700; color: var(--primary); }
    .stat-card .label { color: #666; font-size: 0.9rem; margin-top: 5px; }
    .section { background: white; border-radius: 12px; padding: 30px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .section h2 { color: var(--primary); margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid var(--border); }
    .tabs-container { margin-top: 30px; margin-bottom: 20px; }
    .tab-buttons { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; border-bottom: 3px solid var(--border); margin-bottom: 25px; }
    .tab-button { padding: 14px 20px; border: 2px solid var(--border); border-bottom: none; background: var(--light); color: var(--dark); cursor: pointer; font-size: 0.9rem; font-weight: 600; border-radius: 10px 10px 0 0; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
    .tab-button:hover { background: #e9ecef; border-color: #ccc; }
    .tab-button.active { background: var(--primary); color: white; border-color: var(--primary); }
    .tab-button .tab-count { background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px; font-size: 0.85rem; }
    .tab-button:not(.active) .tab-count { background: rgba(0,0,0,0.08); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-primary { background: #cce5ff; color: #004085; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-danger { background: #f8d7da; color: #721c24; }
    .block-card-with-calc { display: flex; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid var(--border); margin-bottom: 20px; }
    .block-card-with-calc .block-card { flex: 1; min-width: 0; border-radius: 0; box-shadow: none; border: none; }
    .block-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid var(--border); }
    .block-header { padding: 20px; background: var(--light); border-bottom: 1px solid var(--border); }
    .block-header h3 { font-size: 1rem; color: var(--dark); margin: 0 0 10px 0; word-break: break-word; }
    .block-badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .block-stats { display: flex; padding: 15px 20px; background: white; border-bottom: 1px solid var(--border); }
    .block-stats .stat { flex: 1; text-align: center; }
    .block-stats .stat-value { display: block; font-size: 1.3rem; font-weight: 700; color: var(--primary); }
    .block-stats .stat-label { font-size: 0.75rem; color: #666; text-transform: uppercase; }
    .block-screenshots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 15px; background: #fafafa; min-height: 120px; }
    .screenshot-item { position: relative; border-radius: 6px; overflow: hidden; background: white; border: 1px solid var(--border); cursor: pointer; }
    .screenshot-item img { width: 100%; height: 100px; object-fit: cover; display: block; transition: transform 0.2s; }
    .screenshot-item:hover img { transform: scale(1.05); }
    .no-screenshot { grid-column: span 2; display: flex; align-items: center; justify-content: center; color: #999; font-style: italic; }
    .block-calc-panel { width: 320px; flex-shrink: 0; padding: 20px; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-left: 2px solid var(--secondary); display: flex; flex-direction: column; justify-content: center; }
    .calc-title { font-weight: 700; color: var(--primary); margin-bottom: 15px; font-size: 1rem; }
    .calc-inputs-row { display: flex; gap: 12px; margin-bottom: 12px; }
    .calc-input-group { display: flex; flex-direction: column; gap: 4px; }
    .calc-input-group label { font-size: 0.8rem; color: #555; font-weight: 600; }
    .calc-input-group input { width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem; }
    .calc-result { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-top: 1px solid rgba(0,0,0,0.1); }
    .calc-result .result-label { font-size: 0.85rem; color: #555; }
    .calc-result .result-value { font-weight: 700; color: var(--primary); font-size: 1rem; }
    .timeframe-banner { background: linear-gradient(135deg, var(--primary) 0%, #003d99 100%); color: white; padding: 20px 30px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .timeframe-banner h3 { font-size: 1.1rem; }
    .timeframe-banner .total-hours { font-size: 2rem; font-weight: 700; }
    .timeframe-banner .unit { font-size: 1rem; opacity: 0.8; }
    .block-migration-summary { background: linear-gradient(135deg, var(--primary) 0%, #003d99 100%); color: white; padding: 25px 30px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; }
    .block-migration-summary h3 { width: 100%; font-size: 1.1rem; }
    .summary-stats { display: flex; gap: 40px; }
    .summary-stat { text-align: center; }
    .summary-stat .value { display: block; font-size: 1.8rem; font-weight: 700; }
    .summary-stat .label { font-size: 0.8rem; opacity: 0.8; }
    .summary-stat.highlight .value { color: #ffd700; }
    .templates-stack { display: flex; flex-direction: column; gap: 20px; }
    #tab-templates .template-card { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    #tab-templates .template-header { padding: 15px 20px; background: var(--light); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
    #tab-templates .template-header h4 { display: flex; align-items: center; gap: 10px; font-size: 1rem; }
    #tab-templates .template-header h4 .template-number { background: var(--primary); color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; }
    #tab-templates .template-header h4 .template-name { color: var(--dark); }
    #tab-templates .url-count { font-size: 0.85rem; color: #666; background: white; padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border); }
    #tab-templates .template-body { display: flex; gap: 20px; padding: 20px; }
    #tab-templates .template-screenshot { width: 400px; flex-shrink: 0; max-height: 300px; overflow: hidden; border-radius: 8px; border: 1px solid var(--border); cursor: pointer; }
    #tab-templates .template-screenshot img { width: 100%; height: auto; display: block; object-fit: cover; object-position: top; }
    #tab-templates .template-details { flex: 1; min-width: 0; }
    #tab-templates .sample-urls h5 { font-size: 0.85rem; color: var(--primary); margin-bottom: 8px; }
    #tab-templates .sample-urls ul { list-style: none; padding: 0; margin: 0 0 15px 0; }
    #tab-templates .sample-urls li { padding: 3px 0; }
    #tab-templates .sample-urls a { color: var(--secondary); text-decoration: none; font-size: 0.85rem; word-break: break-all; }
    #tab-templates .sample-urls a:hover { text-decoration: underline; }
    .jt-template-desc { font-size: 0.9rem; color: #555; margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid var(--secondary); }
    .calculator { background: #f0f7ff; padding: 15px; border-radius: 8px; border: 1px solid #cce5ff; }
    .calc-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .calc-row label { font-size: 0.85rem; color: #555; min-width: 180px; }
    .calc-row input { width: 80px; padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem; text-align: center; }
    .calc-row .unit { font-size: 0.8rem; color: #888; }
    .calc-row.calc-total { margin-top: 10px; padding-top: 10px; border-top: 1px solid #cce5ff; }
    .calc-row.calc-total .result { font-size: 1.1rem; font-weight: 700; color: var(--primary); }
    .jt-template-meta-row { font-size: 0.8rem; color: #666; }
    .jt-template-meta-label { min-width: 180px; }
    .jt-template-breakdown { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #555; margin-bottom: 8px; }
    .overall-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px; }
    .overall-card { padding: 25px; border-radius: 12px; color: white; }
    .overall-card h3 { font-size: 1rem; margin-bottom: 15px; opacity: 0.9; }
    .card-stats { display: flex; gap: 30px; }
    .card-stat { text-align: center; }
    .card-stat .stat-num { display: block; font-size: 1.8rem; font-weight: 700; }
    .card-stat .stat-desc { font-size: 0.75rem; opacity: 0.8; text-transform: uppercase; }
    .default-content-summary { display: flex; gap: 30px; padding: 20px 30px; border-radius: 12px; color: white; margin-bottom: 20px; flex-wrap: wrap; }
    .dc-stat { text-align: center; }
    .dc-value { display: block; font-size: 1.5rem; font-weight: 700; }
    .dc-label { font-size: 0.75rem; opacity: 0.8; }
    .default-content-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .default-content-table th, .default-content-table td { padding: 10px 15px; text-align: left; border-bottom: 1px solid var(--border); }
    .default-content-table th { background: var(--light); font-size: 0.85rem; color: var(--dark); }
    .default-content-table .group-name { font-weight: 600; }
    .default-content-table .count { text-align: center; }
    .default-content-table .sample-url a { color: var(--secondary); text-decoration: none; font-size: 0.85rem; word-break: break-all; }
    .unique-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .unique-table th, .unique-table td { padding: 9px 14px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.85rem; vertical-align: middle; }
    .unique-table th { background: var(--light); color: var(--dark); position: sticky; top: 0; }
    .unique-table .unique-idx { color: #999; width: 40px; }
    .unique-table .unique-url a { color: var(--secondary); text-decoration: none; word-break: break-all; }
    .unique-table .unique-url a:hover { text-decoration: underline; }
    .unique-table .unique-sig code { background: #f0f2f5; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: #555; }
    .unique-table .unique-hrs { white-space: nowrap; width: 130px; }
    .unique-table .unique-hrs input { width: 64px; padding: 5px 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 0.85rem; text-align: center; }
    .unique-table .unique-hrs .unit { font-size: 0.75rem; color: #888; margin-left: 4px; }
    .unique-table tbody tr:hover { background: #fafbfc; }
    .lightbox { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; justify-content: center; align-items: center; cursor: pointer; }
    .lightbox.active { display: flex; }
    .lightbox img { max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 8px; }
    #tab-header .calculator, #tab-footer .calculator { background: #f0f7ff; padding: 20px; border-radius: 8px; border: 1px solid #cce5ff; max-width: 500px; }
    @media (max-width: 768px) {
      .tab-buttons { flex-direction: column; }
      .tab-button { border-radius: 8px; }
      #tab-templates .template-body { flex-direction: column; }
      #tab-templates .template-screenshot { width: 100%; }
      .block-card-with-calc { flex-direction: column; }
      .block-calc-panel { width: 100%; border-left: none; border-top: 2px solid var(--secondary); }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${esc(host)} Site Analysis Report</h1>
      <p>Complete analysis of ${totalUrls} pages from ${esc(host)} — block patterns, page templates, and migration effort assessment</p>
      <p style="margin-top: 10px; opacity: 0.8;">Generated: ${gen}</p>
    </header>

    <div class="stats-grid">
      <div class="stat-card"><div class="number">${totalUrls}</div><div class="label">Total URLs in Scope</div></div>
      <div class="stat-card"><div class="number">${pagesAnalyzed}</div><div class="label">Unique URLs Analyzed</div></div>
      <div class="stat-card"><div class="number">${numRealTemplates}</div><div class="label">Page Templates <span style="font-size:0.8em;color:#999;">(&gt;${TEMPLATE_MIN_PAGES} pages)</span></div></div>
      <div class="stat-card"><div class="number">${numUniquePages}</div><div class="label">Unique Pages</div></div>
      <div class="stat-card"><div class="number">${totalBlockVariants}</div><div class="label">Block Variants Found</div></div>
    </div>

    <div class="section">
      <h2>Migration Effort Calculator</h2>
      <p>Tabs: <strong>Page Templates</strong> — <strong>5 h</strong> covers one template URL; <strong>15 min</strong> applies only to each <em>other</em> unique page. Then <strong>Header</strong> / <strong>Footer</strong> (default <strong>1 h</strong> each) and block calculators.</p>
      <div class="tabs-container">
        <div class="tab-buttons">
          <button type="button" class="tab-button active" onclick="switchTab(event, 'templates')">Page Templates<span class="tab-count">${numRealTemplates}</span></button>
          <button type="button" class="tab-button" onclick="switchTab(event, 'unique')">Unique Pages<span class="tab-count">${numUniquePages}</span></button>
          <button type="button" class="tab-button" onclick="switchTab(event, 'header')">Header<span class="tab-count">global</span></button>
          <button type="button" class="tab-button" onclick="switchTab(event, 'footer')">Footer<span class="tab-count">global</span></button>
          <button type="button" class="tab-button" onclick="switchTab(event, 'known')">Blocks<span class="tab-count">${contentVariants.length}</span></button>
          <button type="button" class="tab-button" onclick="switchTab(event, 'unknown')">Unknowns<span class="tab-count">0</span></button>
          <button type="button" class="tab-button" onclick="switchTab(event, 'notfound')">404 Pages<span class="tab-count">0</span></button>
        </div>

        <div id="tab-templates" class="tab-content active">
          <div class="timeframe-banner"><h3>Total Template Migration Hours</h3><div><span class="total-hours" id="template-tab-grand-total">0.0</span><span class="unit"> hrs</span></div></div>
          <p style="margin:0 0 15px;color:#555;font-size:0.9rem;"><strong>${numRealTemplates}</strong> shared-layout template${numRealTemplates===1?'':'s'} (a layout used by more than ${TEMPLATE_MIN_PAGES} pages, plus the block-less text-content layout). One-off pages are listed under the separate <em>Unique Pages</em> tab.</p>
          <div class="templates-stack">
${templateCardsHtml || '<p style="color:#888;padding:20px;">No shared-layout templates — every page has a unique layout (see the Unique Pages tab).</p>'}
          </div>
        </div>

        <div id="tab-unique" class="tab-content">
          <div class="timeframe-banner" style="background: linear-gradient(135deg, #5a3d8a 0%, #7d3c98 100%);"><h3>Total Unique-Page Migration Hours</h3><div><span class="total-hours" id="unique-tab-grand-total">0.0</span><span class="unit"> hrs</span></div></div>
          <p style="margin:0 0 15px;color:#777;font-size:0.85rem;">One-off layouts (${TEMPLATE_MIN_PAGES} pages or fewer, not the block-less text layout). Each still needs individual migration effort but is not a reusable template. Adjust hours per page below.</p>
          ${numUniquePages ? `<table class="unique-table">
            <thead><tr><th>#</th><th>Page</th><th>Layout signature</th><th>Migration (hrs)</th></tr></thead>
            <tbody>
${uniqueRowsHtml}
            </tbody>
          </table>` : '<p style="color:#888;padding:20px;">No unique pages — every page maps to a shared template.</p>'}
        </div>

        <div id="tab-header" class="tab-content">
          <div class="timeframe-banner"><h3>Header (Global) — Migration Time</h3><div><span class="total-hours" id="header-total-hours">1.0</span><span class="unit"> hrs</span></div></div>
          ${headerShot?`<div style="margin: 20px 0; max-width: 800px;"><img src="${headerShot}" alt="Header" style="width:100%; border-radius: 8px; border: 1px solid var(--border);" onclick="openLightbox(this.src)"></div>`:''}
          <a href="${esc(siteUrl)}" target="_blank" rel="noopener" style="display:block;margin-bottom:1rem;color:var(--secondary);text-decoration:none;font-size:0.85rem;">${esc(siteUrl)}</a>
          <div class="calculator">
            <div class="calc-row"><label>Header migration (hrs):</label><input type="number" id="header-hours-input" value="1" min="0" max="100" step="0.5" onchange="recalcHeaderFooterHours()" oninput="recalcHeaderFooterHours()"><span class="unit">hrs</span></div>
            <div class="calc-row calc-total"><label>Total:</label><span class="result" id="header-calc-total">1.0 hrs</span></div>
          </div>
        </div>

        <div id="tab-footer" class="tab-content">
          <div class="timeframe-banner"><h3>Footer (Global) — Migration Time</h3><div><span class="total-hours" id="footer-total-hours">1.0</span><span class="unit"> hrs</span></div></div>
          ${footerShot?`<div style="margin: 20px 0; max-width: 800px;"><img src="${footerShot}" alt="Footer" style="width:100%; border-radius: 8px; border: 1px solid var(--border);" onclick="openLightbox(this.src)"></div>`:''}
          <a href="${esc(siteUrl)}" target="_blank" rel="noopener" style="display:block;margin-bottom:1rem;color:var(--secondary);text-decoration:none;font-size:0.85rem;">${esc(siteUrl)}</a>
          <div class="calculator">
            <div class="calc-row"><label>Footer migration (hrs):</label><input type="number" id="footer-hours-input" value="1" min="0" max="100" step="0.5" onchange="recalcHeaderFooterHours()" oninput="recalcHeaderFooterHours()"><span class="unit">hrs</span></div>
            <div class="calc-row calc-total"><label>Total:</label><span class="result" id="footer-calc-total">1.0 hrs</span></div>
          </div>
        </div>

        <div id="tab-known" class="tab-content">
          <div class="block-migration-summary"><h3>Known Block Variants</h3><div class="summary-stats"><div class="summary-stat"><span class="value">${contentVariants.length}</span><span class="label">Variants</span></div><div class="summary-stat highlight"><span class="value" id="known-grand-total-hours">0.0 hrs</span><span class="label">Total Hours</span></div></div></div>
${blockCards}
        </div>

        <div id="tab-unknown" class="tab-content">
          <div class="block-migration-summary" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);"><h3>Unknown Blocks</h3><div class="summary-stats"><div class="summary-stat"><span class="value">0</span><span class="label">Unknown Samples</span></div><div class="summary-stat highlight"><span class="value" id="unknown-grand-total-hours">0.0 hrs</span><span class="label">Total Hours</span></div></div></div>
          <div style="padding: 40px; text-align: center; color: #666; background: var(--light); border-radius: 12px; border: 2px dashed var(--border);"><div style="font-size: 3rem; margin-bottom: 15px;">&#10003;</div><h3 style="color: var(--success); margin-bottom: 10px;">No unknown block variants detected</h3><p>All block patterns on this site have been classified into known EDS block types.</p></div>
        </div>

        <div id="tab-notfound" class="tab-content">
          <div class="block-migration-summary" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);"><h3>404 Pages</h3><div class="summary-stats"><div class="summary-stat"><span class="value">0</span><span class="label">Pages Not Found</span></div></div></div>
          <div style="padding: 40px; text-align: center; color: #666; background: var(--light); border-radius: 12px; border: 2px dashed var(--border);"><div style="font-size: 3rem; margin-bottom: 15px;">&#10003;</div><h3 style="color: var(--success); margin-bottom: 10px;">No 404 pages detected</h3><p>All ${totalUrls} URLs returned valid responses during cataloging.</p></div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>URL Inventory by Path Prefix</h2>
      <p style="margin-bottom: 20px; color: #666;">All <strong>${totalUrls}</strong> URLs grouped by path prefix.</p>
      <div class="default-content-summary" style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%);">
        <div class="dc-stat"><span class="dc-value">${groupNames.length}</span><span class="dc-label">Path prefix groups</span></div>
        <div class="dc-stat"><span class="dc-value">${totalUrls}</span><span class="dc-label">URLs</span></div>
        <div class="dc-stat"><span class="dc-value">${pct}%</span><span class="dc-label">URLs cataloged</span></div>
      </div>
      <table class="default-content-table">
        <thead><tr><th>Path prefix</th><th>URLs</th><th>Est. pages</th><th>Sample URL</th></tr></thead>
        <tbody>${invRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Overall Migration Analysis</h2>
      <p style="margin-bottom: 20px; color: #666;">Breakdown for the ${totalUrls}-URL migration scope. Platform: <strong>Liferay</strong> | Locale: <strong>pt-BR</strong></p>
      <div class="overall-grid">
        <div class="overall-card" style="background: linear-gradient(135deg, #001e50 0%, #003380 100%);"><h3>Templates + Unique Pages</h3><div class="card-stats"><div class="card-stat"><span class="stat-num">${numRealTemplates}</span><span class="stat-desc">Templates</span></div><div class="card-stat"><span class="stat-num">${numUniquePages}</span><span class="stat-desc">Unique</span></div><div class="card-stat"><span class="stat-num" id="overall-template-hours">-</span><span class="stat-desc">Hours</span></div></div></div>
        <div class="overall-card" style="background: linear-gradient(135deg, #1a5276 0%, #2471a3 100%);"><h3>Header + Footer</h3><div class="card-stats"><div class="card-stat"><span class="stat-num">2</span><span class="stat-desc">Global</span></div><div class="card-stat"><span class="stat-num" id="overall-hf-hours">-</span><span class="stat-desc">Hours</span></div></div></div>
        <div class="overall-card" style="background: linear-gradient(135deg, #1e8449 0%, #27ae60 100%);"><h3>Known Blocks</h3><div class="card-stats"><div class="card-stat"><span class="stat-num">${contentVariants.length}</span><span class="stat-desc">Variants</span></div><div class="card-stat"><span class="stat-num" id="overall-block-hours">-</span><span class="stat-desc">Hours</span></div></div></div>
        <div class="overall-card" style="background: linear-gradient(135deg, #7d3c98 0%, #a569bd 100%);"><h3>Grand Total</h3><div class="card-stats"><div class="card-stat"><span class="stat-num" id="grand-total-hours">-</span><span class="stat-desc">Hours</span></div><div class="card-stat"><span class="stat-num" id="grand-total-days">-</span><span class="stat-desc">Days (8h)</span></div></div></div>
      </div>
    </div>

    <footer style="text-align: center; padding: 20px; color: #999; font-size: 0.85rem;">
      <p>Generated from Experience Catalyst catalog outputs | ${esc(host)}</p>
      <p>Data: <code>block-catalog.json</code>, <code>template-catalog.json</code>, <code>summary.json</code>, <code>urls-all.json</code></p>
    </footer>
  </div>

  <div class="lightbox" id="lightbox" onclick="closeLightbox()"><img id="lightbox-img" src="" alt="Enlarged screenshot"></div>

  <script>
    function switchTab(event, tabId) {
      document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active');});
      document.querySelectorAll('.tab-button').forEach(function(b){b.classList.remove('active');});
      document.getElementById('tab-'+tabId).classList.add('active');
      event.currentTarget.classList.add('active');
    }
    function recalcTemplateCard(source) {
      var card = source.closest('.template-card'); if (!card) return;
      var idx = parseInt(card.getAttribute('data-template-index'),10);
      var n = parseInt(card.getAttribute('data-url-count'),10)||0;
      var initHrs = parseFloat(card.querySelector('.template-initial-hours').value)||0;
      var repMins = parseFloat(card.querySelector('.template-replicate-mins').value)||0;
      var repHrs = (Math.max(0,n-1)*repMins)/60; var total = initHrs+repHrs;
      var initEl=document.getElementById('template-init-hours-'+idx), repEl=document.getElementById('template-rep-hours-'+idx), totalEl=document.getElementById('template-migration-total-'+idx);
      if(initEl)initEl.textContent=initHrs.toFixed(1); if(repEl)repEl.textContent=repHrs.toFixed(1); if(totalEl)totalEl.textContent=total.toFixed(1)+' hrs';
      calculateGrandTotals();
    }
    function recalcHeaderFooterHours() {
      var hVal=parseFloat(document.getElementById('header-hours-input').value)||0, fVal=parseFloat(document.getElementById('footer-hours-input').value)||0;
      document.getElementById('header-total-hours').textContent=hVal.toFixed(1); document.getElementById('header-calc-total').textContent=hVal.toFixed(1)+' hrs';
      document.getElementById('footer-total-hours').textContent=fVal.toFixed(1); document.getElementById('footer-calc-total').textContent=fVal.toFixed(1)+' hrs';
      calculateGrandTotals();
    }
    function calculateBlockTime() {
      var total=0;
      document.querySelectorAll('#tab-known .block-card-with-calc').forEach(function(card){
        var init=parseFloat(card.querySelector('.block-initial-hours').value)||0;
        var repMins=parseFloat(card.querySelector('.block-replicate-mins').value)||0;
        var pages=parseInt(card.querySelector('.calc-result .result-value').textContent)||0;
        var blockTotal=init+(Math.max(0,pages-1)*repMins/60);
        card.querySelector('.block-total-hours').textContent=blockTotal.toFixed(1)+' hrs'; total+=blockTotal;
      });
      document.getElementById('known-grand-total-hours').textContent=total.toFixed(1)+' hrs';
      calculateGrandTotals();
    }
    function sumCards(sel) {
      var total=0;
      document.querySelectorAll(sel).forEach(function(c){
        var cn=parseInt(c.getAttribute('data-url-count'),10)||0;
        var initVal=parseFloat(c.querySelector('.template-initial-hours').value)||0;
        var repVal=parseFloat(c.querySelector('.template-replicate-mins').value)||0;
        total+=initVal+(Math.max(0,cn-1)*repVal/60);
      });
      return total;
    }
    function calculateGrandTotals() {
      var templateTotal=sumCards('#tab-templates .template-card');
      var uniqueTotal=sumCards('#tab-unique .template-card');
      var tEl=document.getElementById('template-tab-grand-total'); if(tEl)tEl.textContent=templateTotal.toFixed(1);
      var uEl=document.getElementById('unique-tab-grand-total'); if(uEl)uEl.textContent=uniqueTotal.toFixed(1);
      var hVal=parseFloat(document.getElementById('header-hours-input').value)||0, fVal=parseFloat(document.getElementById('footer-hours-input').value)||0;
      var hfTotal=hVal+fVal;
      var blockTotal=0; document.querySelectorAll('#tab-known .block-total-hours').forEach(function(el){blockTotal+=parseFloat(el.textContent)||0;});
      var pagesTotal=templateTotal+uniqueTotal;
      var grand=pagesTotal+hfTotal+blockTotal;
      var set=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
      set('overall-template-hours',pagesTotal.toFixed(1)); set('overall-hf-hours',hfTotal.toFixed(1)); set('overall-block-hours',blockTotal.toFixed(1));
      set('grand-total-hours',grand.toFixed(1)); set('grand-total-days',(grand/8).toFixed(1));
    }
    function openLightbox(src){document.getElementById('lightbox-img').src=src;document.getElementById('lightbox').classList.add('active');}
    function closeLightbox(){document.getElementById('lightbox').classList.remove('active');}
    document.addEventListener('DOMContentLoaded', function(){ calculateGrandTotals(); });
  </script>
</body>
</html>`;

fs.writeFileSync(outFile, html);
console.log(`Wrote ${outFile}`);
console.log(`  URLs=${totalUrls} analyzed=${pagesAnalyzed} templates=${numRealTemplates} uniquePages=${numUniquePages} blockVariants=${totalBlockVariants} contentBlocks=${contentVariants.length} urlGroups=${groupNames.length}`);
console.log(`  size=${(fs.statSync(outFile).size/1024/1024).toFixed(1)}MB`);
