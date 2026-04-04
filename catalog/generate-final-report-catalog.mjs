/**
 * Builds `Final Report <site>.html` from catalog JSON + `.pages/`, matching the layout/CSS/JS of
 * `Final Report med-astrazeneca-co-jp.html` (three <style> blocks + calculator script).
 *
 * Usage: node workspace/catalog/generate-final-report-catalog.mjs
 *
 * Optional: CATALOG_REPORT_REF=path/to/reference.html
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = __dirname;
const REF_REPORT =
  process.env.CATALOG_REPORT_REF ?? path.join(CATALOG, 'Final Report med-astrazeneca-co-jp.html');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCount(n) {
  return Number(n).toLocaleString('en-US');
}

function normalizedTemplatePageKey(urlStr) {
  try {
    const u = new URL(urlStr);
    let pathname = u.pathname.replace(/\/+$/, '') || '/';
    const lower = pathname.toLowerCase();
    if (lower === '/index.html' || lower.endsWith('/index.html')) {
      pathname = pathname.replace(/\/?index\.html$/i, '') || '/';
    }
    if (pathname === '') pathname = '/';
    const search = u.search ? u.search : '';
    return `${u.origin.toLowerCase()}${pathname}${search}`;
  } catch {
    return urlStr;
  }
}

function uniqueTemplatePageCount(urlList) {
  return new Set((urlList ?? []).map(normalizedTemplatePageKey)).size;
}

function effortBadge(pages) {
  if (pages >= 25) return ['High Effort', 'badge-danger'];
  if (pages >= 5) return ['Medium Effort', 'badge-warning'];
  return ['Low Effort', 'badge-success'];
}

function urlShortLabel(urlStr) {
  try {
    const u = new URL(urlStr);
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || 'Home';
    const q = u.search ? u.search.replace(/^\?/, '').slice(0, 40) : '';
    const base = last.replace(/\.(html|aspx|htm)$/i, '').replace(/_/g, ' ') || last;
    return q ? `${base} (${q}…)` : base;
  } catch {
    return urlStr;
  }
}

function reportFileNameFromSiteName(siteName) {
  const safe = String(siteName ?? 'site')
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
    .replace(/\./g, '-');
  return `Final Report ${safe}.html`;
}

function loadThreeStylesFromReference() {
  if (!fs.existsSync(REF_REPORT)) {
    throw new Error(`Reference report not found: ${REF_REPORT}`);
  }
  const html = fs.readFileSync(REF_REPORT, 'utf8');
  const blocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1].trim());
  if (blocks.length < 3) {
    throw new Error(`Expected at least 3 <style> blocks in reference report, got ${blocks.length}`);
  }
  return { baseCss: blocks[0], jaredCss: blocks[1], hfCss: blocks[2] };
}

function loadScriptFromReference() {
  const html = fs.readFileSync(REF_REPORT, 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
  if (!m) throw new Error('Could not extract <script> from reference report');
  return m[1].trim();
}

function patchScript(script, totalUnknownInstances, numKnownBlocks, defaultContentPages) {
  return script
    .replace(/const totalUnknownInstances = \d+;/, `const totalUnknownInstances = ${totalUnknownInstances};`)
    .replace(/const defaultContentPages = \d+;/, `const defaultContentPages = ${defaultContentPages};`)
    .replace(/const numKnownBlocks = \d+;/, `const numKnownBlocks = ${numKnownBlocks};`);
}

const { baseCss, jaredCss, hfCss } = loadThreeStylesFromReference();
let scriptBody = loadScriptFromReference();

const blockCatalog = readJson(path.join(CATALOG, 'block-catalog.json'))['analysis-block-catalog'];
const templates = readJson(path.join(CATALOG, 'template-catalog.json')).templates;
const summary = readJson(path.join(CATALOG, 'summary.json'))['analysis-summary'];
const urlsAll = readJson(path.join(CATALOG, 'urls-all.json'))['analysis-urls-all'];
const checklist = readJson(path.join(CATALOG, 'urls-checklist.json'))['analysis-urls-checklist'];
const urlsGroupedDoc = readJson(path.join(CATALOG, 'urls-grouped.json'))['analysis-urls-grouped'];

const slugToUrl = new Map();
const urlToSlug = new Map();
for (const entry of Object.values(checklist.pages ?? {})) {
  if (entry.slug && entry.url) {
    slugToUrl.set(entry.slug, entry.url);
    urlToSlug.set(entry.url, entry.slug);
  }
}

const siteUrlRaw = summary.metadata.siteUrl ?? 'https://example.com/';
const siteName = summary.metadata.siteName ?? new URL(siteUrlRaw).hostname;
const siteUrl = siteUrlRaw.replace(/\/$/, '') || siteUrlRaw;
const generatedAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
const totalPages = summary.metrics.totalPages ?? urlsAll.totalUrls ?? 0;
const metrics = summary.metrics;
const pagesAnalyzed = metrics.pagesAnalyzed ?? checklist.totalPages ?? totalPages;
const percentAnalyzed =
  metrics.percentAnalyzed != null
    ? metrics.percentAnalyzed
    : totalPages > 0
      ? Math.round((pagesAnalyzed / totalPages) * 100)
      : 100;
const blockVariantTotal = metrics.totalBlockTypes ?? Object.keys(blockCatalog.blockVariants ?? {}).length;

function slugFromScreenshotPath(p) {
  const m = String(p).match(/^\.pages\/([^/]+)\//);
  return m ? m[1] : null;
}

function urlForScreenshotPath(screenshotPath) {
  const slug = slugFromScreenshotPath(screenshotPath);
  if (slug && slugToUrl.has(slug)) return slugToUrl.get(slug);
  return siteUrlRaw.endsWith('/') ? siteUrlRaw : `${siteUrlRaw}/`;
}

function getTemplateScreenshotRelUrl(pageUrl) {
  const slug = urlToSlug.get(pageUrl);
  if (!slug) return null;
  const dir = path.join(CATALOG, '.pages', slug);
  const full = path.join(dir, 'full-page.jpg');
  const header = path.join(dir, 'header-normalized.jpg');
  if (fs.existsSync(full)) return `.pages/${slug}/full-page.jpg`;
  if (fs.existsSync(header)) return `.pages/${slug}/header-normalized.jpg`;
  return null;
}

function resolveHomeSlug() {
  const pages = checklist.pages ?? {};
  const candidates = new Set([siteUrlRaw, siteUrl, `${siteUrl}/`, `${siteUrlRaw.replace(/\/$/, '')}/`]);
  for (const entry of Object.values(pages)) {
    if (candidates.has(entry.url)) return entry.slug;
  }
  try {
    const origin = new URL(siteUrlRaw).origin;
    for (const entry of Object.values(pages)) {
      if (!entry.url) continue;
      const p = new URL(entry.url);
      if (p.origin === origin && (p.pathname === '/' || p.pathname === '')) return entry.slug;
    }
  } catch {
    /* ignore */
  }
  const first = Object.values(pages)[0];
  return first?.slug ?? null;
}

function getGlobalChromeShotRels() {
  const slug = resolveHomeSlug();
  const globalDir = path.join(CATALOG, '.pages', '_global');
  const imageNames = (base) => [`${base}.jpg`, `${base}.jpeg`, `${base}.png`, `${base}.webp`];

  let headerRel = null;
  for (const f of imageNames('header')) {
    if (fs.existsSync(path.join(globalDir, f))) {
      headerRel = `.pages/_global/${f}`;
      break;
    }
  }
  if (!headerRel && slug) {
    const dir = path.join(CATALOG, '.pages', slug);
    if (fs.existsSync(path.join(dir, 'header-normalized.jpg'))) headerRel = `.pages/${slug}/header-normalized.jpg`;
  }

  let footerRel = null;
  for (const f of imageNames('footer')) {
    if (fs.existsSync(path.join(globalDir, f))) {
      footerRel = `.pages/_global/${f}`;
      break;
    }
  }
  if (!footerRel && slug) {
    const dir = path.join(CATALOG, '.pages', slug);
    if (fs.existsSync(path.join(dir, 'full-page.jpg'))) footerRel = `.pages/${slug}/full-page.jpg`;
  }

  return { slug, headerRel, footerRel };
}

const { slug: homeSlug, headerRel, footerRel } = getGlobalChromeShotRels();
const homePageUrl = homeSlug && slugToUrl.has(homeSlug) ? slugToUrl.get(homeSlug) : siteUrlRaw;

const footerPreviewNote =
  footerRel && footerRel.includes('/_global/')
    ? `Dedicated footer screenshot from <code>.pages/_global/</code>.`
    : `Preview uses the bottom of the home <code>full-page.jpg</code>.`;

const footerAltText =
  footerRel && footerRel.includes('/_global/') ? 'Footer (global screenshot)' : 'Footer (bottom of full-page capture)';

const variants = Object.values(blockCatalog.blockVariants ?? {});
const knownBlocks = variants
  .filter((v) => v.baseBlock && v.baseBlock !== 'unknown')
  .sort((a, b) => (b.pagesFound ?? 0) - (a.pagesFound ?? 0));
const unknownVariants = variants
  .filter((v) => !v.baseBlock || v.baseBlock === 'unknown')
  .sort((a, b) => (b.pagesFound ?? 0) - (a.pagesFound ?? 0));

const unknownRows = [];
for (const v of unknownVariants) {
  for (const shot of v.screenshots ?? []) {
    unknownRows.push({ variant: v, shot });
  }
}

const numKnown = knownBlocks.length;
const unknownSampleCount = unknownRows.length;
const unknownVariantCount = unknownVariants.length;
const numTemplates = templates.length;
const defaultContentPages = 0;

scriptBody = patchScript(scriptBody, unknownSampleCount, numKnown, defaultContentPages);

function buildTemplateCard(t, idx) {
  const urls = t.urls ?? [];
  const nUnique = uniqueTemplatePageCount(urls);
  const repPages = Math.max(0, nUnique - 1);
  const initDefault = 5;
  const repMinsDefault = 15;
  const repHDefault = (repPages * repMinsDefault) / 60;
  const totalDefault = initDefault + repHDefault;
  const repUrlList = [...new Set(urls.map(normalizedTemplatePageKey))].length;
  const urlNote =
    repUrlList < urls.length
      ? `${nUnique} unique pages (${urls.length} URLs listed)`
      : `${nUnique} unique pages`;

  let shotRel = null;
  for (const u of t.representativePages ?? []) {
    shotRel = getTemplateScreenshotRelUrl(u);
    if (shotRel) break;
  }
  if (!shotRel) {
    for (const u of urls) {
      shotRel = getTemplateScreenshotRelUrl(u);
      if (shotRel) break;
    }
  }

  const samplePick = Math.min(5, urls.length);
  const sampleUl = urls
    .slice(0, samplePick)
    .map(
      (u) =>
        `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(urlShortLabel(u))}</a></li>`
    )
    .join('\n');

  const shotBlock = shotRel
    ? `<img src="${esc(shotRel)}" alt="" loading="lazy" onclick="openLightbox(this.src)">`
    : `<div class="jt-no-screenshot" style="min-height:200px;display:flex;align-items:center;justify-content:center;background:var(--light);border-radius:8px;color:#666;">No full-page screenshot in <code>.pages/</code> for this template’s representatives.</div>`;

  return `
        <div class="template-card" data-template-index="${idx}" data-url-count="${nUnique}">
          <div class="template-header">
            <div>
              <h4><span class="template-number">${idx + 1}</span><span class="template-name">${esc(t.name)}</span></h4>
              <div class="template-meta">
                <span class="url-count">${esc(urlNote)}</span>
              </div>
            </div>
          </div>
          <div class="template-body">
            <div class="template-screenshot">
              ${shotBlock}
            </div>
            <div class="template-details">
              <div class="sample-urls">
                <h5>Sample URLs (${samplePick} of ${urls.length})</h5>
                <ul>${sampleUl}</ul>
              </div>
              <p class="jt-template-desc">${esc(t.description ?? '')}</p>
              <div class="calculator">
                <div class="calc-row">
                  <label>Initial template (hrs):</label>
                  <input type="number" class="template-initial-hours" value="5" min="0" max="500" step="0.5" onchange="recalcTemplateCard(this)" oninput="recalcTemplateCard(this)">
                  <span class="unit">hrs</span>
                </div>
                <div class="calc-row">
                  <label>Replicate (mins / non-template page):</label>
                  <input type="number" class="template-replicate-mins" value="15" min="0" max="480" step="1" onchange="recalcTemplateCard(this)" oninput="recalcTemplateCard(this)">
                  <span class="unit">mins</span>
                </div>
                <div class="calc-row jt-template-meta-row">
                  <span class="jt-template-meta-label">Unique pages (1 = template only, no replication):</span>
                  <strong>${nUnique}</strong>
                  <span class="unit">→ ${repPages} × replicate</span>
                </div>
                <div class="jt-template-breakdown">
                  <span>Initial: <strong id="template-init-hours-${idx}">${initDefault.toFixed(1)}</strong> hrs</span>
                  <span>+</span>
                  <span>Replication: <strong id="template-rep-hours-${idx}">${repHDefault.toFixed(1)}</strong> hrs</span>
                  <span>=</span>
                </div>
                <div class="calc-row calc-total">
                  <label>Total migration:</label>
                  <span class="result template-migration-total" id="template-migration-total-${idx}">${totalDefault.toFixed(1)} hrs</span>
                </div>
              </div>
            </div>
          </div>
        </div>`;
}

function buildKnownBlockCard(v, idx) {
  const pages = v.pagesFound ?? 0;
  const cov = totalPages > 0 ? ((pages / totalPages) * 100).toFixed(1) : '0';
  const [effLabel, effClass] = effortBadge(pages);
  const shots = (v.screenshots ?? []).slice(0, 4);
  const sampleUrl = urlForScreenshotPath(v.screenshots?.[0] ?? '');
  const shotHtml = shots
    .map(
      (s) => `
        <div class="screenshot-item">
          <img src="${esc(s)}" alt="${esc(v.blockVariantId)}" loading="lazy" onclick="openLightbox(this.src)">
        </div>`
    )
    .join('');

  return `
    <div class="block-card-with-calc" data-block-index="${idx}" data-pages="${pages}" data-prefix="known">
      <div class="block-card">
        <div class="block-header">
          <h3>${esc(v.blockVariantId)}</h3>
          <div class="block-badges">
            <span class="badge badge-primary">${esc(v.baseBlock ?? '')}</span>
            <span class="badge ${effClass}">${esc(effLabel)}</span>
          </div>
        </div>
        <div class="block-stats">
          <div class="stat">
            <span class="stat-value">${formatCount(pages)}</span>
            <span class="stat-label">Est. Pages</span>
          </div>
          <div class="stat">
            <span class="stat-value">${cov}%</span>
            <span class="stat-label">Coverage</span>
          </div>
          <div class="stat">
            <span class="stat-value">${formatCount(pages)}</span>
            <span class="stat-label">URL Groups</span>
          </div>
        </div>
        <div class="block-screenshots">
          ${shotHtml}
        </div>
        <div class="sample-url-section">
          <span class="sample-label">Sample Page:</span>
          <a href="${esc(sampleUrl)}" target="_blank" rel="noopener" class="sample-url">${esc(sampleUrl)}</a>
        </div>
      </div>
      <div class="block-calc-panel">
        <div class="calc-title">Time Calculator</div>
        <div class="calc-inputs-row">
          <div class="calc-input-group">
            <label>Initial Block Creation</label>
            <div class="input-with-unit">
              <input type="number" class="initial-hours" data-index="${idx}" data-prefix="known" value="0" min="0" max="100" step="0.5" onchange="calculateBlockTime('known', ${idx})" oninput="calculateBlockTime('known', ${idx})">
              <span class="unit">hours</span>
            </div>
          </div>
          <div class="calc-input-group">
            <label>Per Page Replication</label>
            <div class="input-with-unit">
              <input type="number" class="replicate-mins" data-index="${idx}" data-prefix="known" value="0" min="0" max="60" step="1" onchange="calculateBlockTime('known', ${idx})" oninput="calculateBlockTime('known', ${idx})">
              <span class="unit">mins</span>
            </div>
          </div>
        </div>
        <div class="calc-breakdown-row">
          <span>Initial: <strong id="known-initial-time-${idx}">0.0</strong> hrs</span>
          <span>+</span>
          <span>Replicate: <strong id="known-replicate-time-${idx}">0.0</strong> hrs</span>
          <span>=</span>
        </div>
        <div class="calc-total-row">
          <span class="total-label">TOTAL:</span>
          <span class="total-value" id="known-total-time-${idx}">0.0 hours</span>
        </div>
      </div>
    </div>`;
}

function buildUnknownSectionHtml() {
  let globalIdx = 0;
  const parts = [];
  for (const v of unknownVariants) {
    const shots = v.screenshots ?? [];
    if (shots.length === 0) continue;
    const items = shots
      .map((shot) => {
        const pageUrl = urlForScreenshotPath(shot);
        const i = globalIdx++;
        return `
      <div class="unknown-block-item" data-unknown-index="${i}">
        <div class="unknown-screenshot" onclick='openLightbox(${JSON.stringify(shot)})'>
          <img src="${esc(shot)}" alt="Block screenshot" loading="lazy">
        </div>
        <div class="unknown-info">
          <a href="${esc(pageUrl)}" target="_blank" rel="noopener" class="unknown-url">${esc(pageUrl)}</a>
          <div class="unknown-calc">
            <div class="calc-row">
              <label>Initial:</label>
              <input type="number" class="unknown-initial-hours" data-unknown-index="${i}" value="0" min="0" max="100" step="0.5" onchange="calculateUnknownTime(${i})" oninput="calculateUnknownTime(${i})">
              <span class="unit">hrs</span>
            </div>
            <div class="calc-row replicate-row">
              <label>Replicate:</label>
              <input type="number" class="unknown-replicate-mins" data-unknown-index="${i}" value="0" min="0" max="60" step="1" onchange="calculateUnknownTime(${i})" oninput="calculateUnknownTime(${i})">
              <span class="unit">mins</span>
            </div>
            <div class="calc-total">
              <span>Total:</span>
              <strong id="unknown-total-${i}">0.0 hrs</strong>
            </div>
          </div>
        </div>
      </div>`;
      })
      .join('');
    parts.push(`
    <div class="unknown-category">
      <div class="category-header">
        <span class="category-count">${shots.length} sample${shots.length === 1 ? '' : 's'}</span>
        <h3>${esc(v.blockVariantId)}</h3>
      </div>
      <div class="unknown-blocks-list">
        ${items}
      </div>
    </div>`);
  }
  return parts.join('\n');
}

const jaredTemplatesStackHtml = templates.map((t, i) => buildTemplateCard(t, i)).join('\n');
const knownCardsHtml = knownBlocks.map((v, i) => buildKnownBlockCard(v, i)).join('\n');
const unknownInnerHtml = buildUnknownSectionHtml();

const headerSrcForTab = headerRel || null;
const footerSrcForTab = footerRel || null;

const headerTabPanelHtml =
  headerSrcForTab || homeSlug
    ? `
        <div id="tab-header" class="tab-content">
          <div class="timeframe-banner">
            <h3>Header (Global) — Migration Time</h3>
            <div>
              <span class="total-hours" id="header-tab-grand-total">1.0</span>
              <span class="unit">hrs</span>
            </div>
          </div>
          <div class="jt-templates-section">
            <h2>Global Component: Header</h2>
            <p style="margin-bottom: 1.5rem; padding: 1rem; background: #e3f2fd; border-radius: 8px; border-left: 4px solid var(--secondary);">
              <strong>Note:</strong> Header is a global component on every page. Default estimate below is <strong>1 hour</strong> initial build; adjust as needed.
            </p>
            <div class="jt-hf-blocks-grid">
              <div class="jt-hf-card">
                <div class="jt-hf-card-head">
                  <h4>Header (Global Navigation)</h4>
                  <span class="jt-hf-badge">All pages</span>
                </div>
                <div class="jt-hf-card-body">
                  ${
                    headerSrcForTab
                      ? `<img src="${esc(headerSrcForTab)}" alt="Header" class="jt-hf-screenshot" onclick="openLightbox(this.src)">`
                      : `<div class="jt-hf-placeholder">No header image found for home in this catalog.</div>`
                  }
                  <a href="${esc(homePageUrl)}" target="_blank" rel="noopener" style="display:block;margin-bottom:1rem;color:var(--secondary);text-decoration:none;font-size:0.85rem;word-break:break-all;">${esc(homePageUrl)}</a>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;padding:0.75rem;background:#f8f9fa;border-radius:6px;font-size:0.85rem;">
                    <div><div style="font-size:0.75rem;color:#666;">Type</div><div style="font-weight:600;color:#333;">Global component</div></div>
                    <div><div style="font-size:0.75rem;color:#666;">Source slug</div><div style="font-weight:600;color:#333;word-break:break-all;">${esc(homeSlug ?? '—')}</div></div>
                  </div>
                  <div class="calculator">
                    <div class="calc-row">
                      <label>Initial Hours:</label>
                      <input type="number" id="header-global-hours" value="1" min="0" step="0.5" onchange="recalcHeaderFooterHours()" oninput="recalcHeaderFooterHours()">
                      <span class="unit">hrs</span>
                    </div>
                    <div class="calc-row calc-total">
                      <label>Total Time:</label>
                      <span class="result" id="header-hf-result">1.0 hrs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>`
    : '';

const footerTabPanelHtml =
  footerSrcForTab || homeSlug
    ? `
        <div id="tab-footer" class="tab-content">
          <div class="timeframe-banner">
            <h3>Footer (Global) — Migration Time</h3>
            <div>
              <span class="total-hours" id="footer-tab-grand-total">1.0</span>
              <span class="unit">hrs</span>
            </div>
          </div>
          <div class="jt-templates-section">
            <h2>Global Component: Footer</h2>
            <p style="margin-bottom: 1.5rem; padding: 1rem; background: #e3f2fd; border-radius: 8px; border-left: 4px solid var(--secondary);">
              <strong>Note:</strong> Footer is a global component on every page. Default estimate below is <strong>1 hour</strong> initial build; adjust as needed.
            </p>
            <div class="jt-hf-blocks-grid">
              <div class="jt-hf-card">
                <div class="jt-hf-card-head">
                  <h4>Footer (Global Links)</h4>
                  <span class="jt-hf-badge">All pages</span>
                </div>
                <div class="jt-hf-card-body">
                  ${
                    footerSrcForTab
                      ? `<div class="jt-footer-viewport"><img src="${esc(footerSrcForTab)}" alt="${esc(footerAltText)}" class="jt-footer-strip-img" onclick="openLightbox(this.src)"></div>
            <p style="font-size:0.8rem;color:#666;margin:0 0 0.75rem 0;">${esc(footerPreviewNote)}</p>`
                      : `<div class="jt-hf-placeholder">No footer image found for home in this catalog.</div>`
                  }
                  <a href="${esc(homePageUrl)}" target="_blank" rel="noopener" style="display:block;margin-bottom:1rem;color:var(--secondary);text-decoration:none;font-size:0.85rem;word-break:break-all;">${esc(homePageUrl)}</a>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;padding:0.75rem;background:#f8f9fa;border-radius:6px;font-size:0.85rem;">
                    <div><div style="font-size:0.75rem;color:#666;">Type</div><div style="font-weight:600;color:#333;">Global component</div></div>
                    <div><div style="font-size:0.75rem;color:#666;">Source slug</div><div style="font-weight:600;color:#333;word-break:break-all;">${esc(homeSlug ?? '—')}</div></div>
                  </div>
                  <div class="calculator">
                    <div class="calc-row">
                      <label>Initial Hours:</label>
                      <input type="number" id="footer-global-hours" value="1" min="0" step="0.5" onchange="recalcHeaderFooterHours()" oninput="recalcHeaderFooterHours()">
                      <span class="unit">hrs</span>
                    </div>
                    <div class="calc-row calc-total">
                      <label>Total Time:</label>
                      <span class="result" id="footer-hf-result">1.0 hrs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>`
    : '';

function scopeParagraphHtml() {
  const method = urlsAll.method ?? 'n/a';
  const sm = urlsAll.sitemapURL ? ` Sitemap: <code>${esc(urlsAll.sitemapURL)}</code>.` : '';
  const conf = urlsAll.confidence ? ` Confidence: <strong>${esc(urlsAll.confidence)}</strong>.` : '';
  const lim = urlsAll.limitations ? ` ${esc(urlsAll.limitations)}` : '';
  const blockDepth =
    pagesAnalyzed < totalPages
      ? ` Full scope is <strong>${formatCount(totalPages)}</strong> URLs. Block-level capture ran on <strong>${formatCount(pagesAnalyzed)}</strong> pages (<strong>${percentAnalyzed}%</strong> of scope).`
      : ` Every URL in scope was analyzed for blocks.`;
  return `All <strong>${formatCount(totalPages)}</strong> URLs from <code>urls-all.json</code> (${esc(method)}).${sm}${conf}${lim ? ` <em>${lim}</em>` : ''}${blockDepth}`;
}

const groups = urlsGroupedDoc.groups ?? {};
const groupKeys = Object.keys(groups).sort((a, b) => {
  const na = groups[a]?.urls?.length ?? 0;
  const nb = groups[b]?.urls?.length ?? 0;
  return nb - na;
});
const inventoryRows = groupKeys
  .map((gk) => {
    const g = groups[gk];
    const list = g?.urls ?? [];
    const n = list.length;
    const sample = list[0]?.url ?? '';
    return `
            <tr>
      <td class="group-name">${esc(gk)}</td>
      <td class="count">${formatCount(n)}</td>
      <td class="count">${formatCount(n)}</td>
      <td class="sample-url"><a href="${esc(sample)}" target="_blank" rel="noopener">${esc(sample)}</a></td>
    </tr>`;
  })
  .join('');

const me = summary.migrationEffort?.breakdown;
const toolingHours = me?.totalHours != null ? Number(me.totalHours).toFixed(1) : '—';
const toolingWeeks = me?.totalWeeks != null ? Number(me.totalWeeks).toFixed(1) : '—';

const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(siteName)} Site Analysis Report — ${formatCount(totalPages)} Pages</title>
  <style>
${baseCss}
  </style>
  <style>
${jaredCss}
  </style>
  <style>
${hfCss}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>AstraZeneca Italy Site Analysis Report</h1>
      <p>Complete analysis of ${formatCount(totalPages)} pages from ${esc(siteName)} (Italian locale) — block patterns, page templates, and migration effort assessment</p>
      <p style="margin-top: 10px; opacity: 0.8;">Generated: ${esc(generatedAt)}</p>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="number">${formatCount(totalPages)}</div>
        <div class="label">Total URLs in Scope</div>
      </div>
      <div class="stat-card">
        <div class="number">${formatCount(pagesAnalyzed)}</div>
        <div class="label">Unique URLs Analyzed</div>
      </div>
      <div class="stat-card">
        <div class="number">${formatCount(numTemplates)}</div>
        <div class="label">Page Templates</div>
      </div>
      <div class="stat-card">
        <div class="number">${formatCount(blockVariantTotal)}</div>
        <div class="label">Block Variants Found</div>
      </div>
    </div>

    <div class="section">
      <h2>Migration Effort Calculator</h2>
      <p>Tabs: <strong>Page Templates</strong> — <strong>5 h</strong> covers one template URL; <strong>15 min</strong> applies only to each <em>other</em> unique page (same path variants like <code>/</code> vs <code>/index.html</code> count once). Then <strong>Header</strong> / <strong>Footer</strong> (default <strong>1 h</strong> each) and block calculators. Click screenshots to enlarge.</p>
      <p style="margin-top: 5px; color: #666; font-size: 0.9rem;">
        <strong>Blocks / unknowns:</strong> default inputs are <strong>0</strong>. When you enter values: block hours = Initial + ((Pages − 1) × Replication mins) / 60.
      </p>
      <p style="margin-top: 5px; color: #666; font-size: 0.9rem;">
        Data: <code>template-catalog.json</code>, <code>catalog/.pages/&lt;slug&gt;/</code> (full-page, header-normalized), block shots under <code>.pages/…/blocks/</code>.
      </p>

      <div class="tabs-container">
        <div class="tab-buttons">
          <button type="button" class="tab-button active" onclick="switchTab(event, 'templates')">
            Page Templates
            <span class="tab-count">${formatCount(numTemplates)} templates</span>
          </button>
          <button type="button" class="tab-button" onclick="switchTab(event, 'header')">
            Header
            <span class="tab-count">global</span>
          </button>
          <button type="button" class="tab-button" onclick="switchTab(event, 'footer')">
            Footer
            <span class="tab-count">global</span>
          </button>
          <button type="button" class="tab-button" onclick="switchTab(event, 'known')">
            Block Migration Effort Calculator
            <span class="tab-count">${formatCount(numKnown)} blocks</span>
          </button>
          <button type="button" class="tab-button" onclick="switchTab(event, 'unknown')">
            Unknowns Migration Effort Calculator
            <span class="tab-count">${formatCount(unknownSampleCount)} samples</span>
          </button>
        </div>

        <div id="tab-templates" class="tab-content active">
          <div class="timeframe-banner">
            <h3>Total Template Migration Hours</h3>
            <div>
              <span class="total-hours" id="template-tab-grand-total">0.0</span>
              <span class="unit">hrs</span>
            </div>
          </div>
          <div class="jt-templates-section">
            <h2>Templates Instrumentation</h2>
            <p style="margin-bottom: 1.5rem; padding: 1rem; background: #e3f2fd; border-radius: 8px; border-left: 4px solid var(--secondary);">
              <strong>Note:</strong> Each template has <strong>one canonical template URL</strong> covered by the <strong>5 h</strong> initial — <strong>no 15 min</strong> is applied to that URL. Only <strong>other unique pages</strong> in the group pay replication time (<strong>15 min</strong> each). Duplicate sitemap entries (e.g. <code>/</code> and <code>/index.html</code>) count as one page for this math.
            </p>
            <div class="templates-stack">
              ${jaredTemplatesStackHtml}
            </div>
          </div>
        </div>

        ${headerTabPanelHtml}

        ${footerTabPanelHtml}

        <div id="tab-known" class="tab-content">
          <div class="block-migration-summary">
            <h3>Known Blocks Total</h3>
            <div class="summary-stats">
              <div class="summary-stat">
                <span class="value">${formatCount(numKnown)}</span>
                <span class="label">Block Variants</span>
              </div>
              <div class="summary-stat">
                <span class="value">${formatCount(totalPages)}</span>
                <span class="label">Site Pages (scope)</span>
              </div>
              <div class="summary-stat highlight">
                <span class="value" id="known-grand-total-hours">-</span>
                <span class="label">Total Hours</span>
              </div>
            </div>
          </div>
          <div class="block-gallery-vertical">
            ${knownCardsHtml}
          </div>
        </div>

        <div id="tab-unknown" class="tab-content">
          <div class="block-migration-summary" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
            <h3>Unknown Blocks Total</h3>
            <div class="summary-stats">
              <div class="summary-stat">
                <span class="value">${formatCount(unknownSampleCount)}</span>
                <span class="label">Screenshot Samples</span>
              </div>
              <div class="summary-stat">
                <span class="value">${formatCount(unknownVariantCount)}</span>
                <span class="label">Unknown Variants</span>
              </div>
              <div class="summary-stat highlight">
                <span class="value" id="unknown-grand-total-hours">-</span>
                <span class="label">Total Hours</span>
              </div>
            </div>
          </div>
          <p style="margin-bottom: 20px; color: #666; font-size: 0.9rem;">
            Each row is a sampled screenshot for an <strong>unknown</strong> block variant (<code>baseBlock: unknown</code> in <code>block-catalog.json</code>).
            Set the <strong>Initial Block Creation</strong> time for each pattern you intend to implement.
          </p>
          ${unknownInnerHtml}
          <div class="block-migration-summary" style="margin-top: 30px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
            <h3>Combined Migration Total</h3>
            <div class="summary-stats">
              <div class="summary-stat">
                <span class="value">${formatCount(numKnown + unknownSampleCount)}</span>
                <span class="label">Known Variants + Unknown Samples</span>
              </div>
              <div class="summary-stat highlight">
                <span class="value" id="combined-grand-total-hours">-</span>
                <span class="label">Total Hours (blocks + unknowns)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>URL inventory by path prefix</h2>
      <p style="margin-bottom: 20px; color: #666;">
        ${scopeParagraphHtml()}
      </p>
      <div class="default-content-summary" style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%);">
        <div class="dc-stat">
          <span class="dc-value">${formatCount(groupKeys.length)}</span>
          <span class="dc-label">Path prefix groups</span>
        </div>
        <div class="dc-stat">
          <span class="dc-value">${formatCount(totalPages)}</span>
          <span class="dc-label">URLs</span>
        </div>
        <div class="dc-stat">
          <span class="dc-value">${formatCount(defaultContentPages)}</span>
          <span class="dc-label">Default-only groups (N/A)</span>
        </div>
        <div class="dc-stat">
          <span class="dc-value">${percentAnalyzed}%</span>
          <span class="dc-label">URLs cataloged</span>
        </div>
      </div>

      <div class="default-content-calc">
        <div class="calc-title">Optional: time for “simple text” pages (not used when scope is 0)</div>
        <div class="calc-inputs-row-horizontal">
          <div class="calc-input-group">
            <label>Time per page</label>
            <div class="input-with-unit">
              <input type="number" id="default-content-mins" value="2" min="0" max="60" step="0.5" onchange="calculateDefaultContentTime()">
              <span class="unit">mins</span>
            </div>
          </div>
          <div class="calc-result">
            <span class="result-label">Total Time:</span>
            <span class="result-value" id="default-content-total">0 hours</span>
          </div>
        </div>
      </div>

      <div class="default-content-table-container">
        <table class="default-content-table">
          <thead>
            <tr>
              <th>Path prefix</th>
              <th>URLs</th>
              <th>Est. pages</th>
              <th>Sample URL</th>
            </tr>
          </thead>
          <tbody>
            ${inventoryRows}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h2>Overall Migration Analysis</h2>
      <p style="margin-bottom: 20px; color: #666;">
        Breakdown for the ${formatCount(totalPages)}-URL migration scope: templates (5 h per template + 15 min × each extra <em>unique</em> page after the one template URL), global header/footer (1 h each by default), known and unknown blocks, and optional default-content time (${defaultContentPages} pages in this export).
      </p>
      <p style="margin-bottom: 16px; color: #666; font-size: 0.9rem;">
        Summary metrics from <code>summary.json</code>: templates <strong>${formatCount(numTemplates)}</strong>,
        block variants <strong>${formatCount(blockVariantTotal)}</strong>,
        EDS variants <strong>${formatCount(metrics.edsBlockVariants ?? '—')}</strong>,
        unknown variants <strong>${formatCount(metrics.unknownBlockVariants ?? unknownVariantCount)}</strong>.
        Estimated total effort (from tooling): <strong>${esc(toolingHours)}</strong> hours (~${esc(toolingWeeks)} weeks at assumptions in summary).
      </p>

      <div class="overall-grid">
        <div class="overall-card blocks-card" style="background: linear-gradient(135deg, #001e50 0%, #003380 100%);">
          <div class="card-icon">📐</div>
          <h3>Page Templates</h3>
          <div class="card-stats">
            <div class="card-stat">
              <span class="stat-num">${formatCount(numTemplates)}</span>
              <span class="stat-desc">Templates</span>
            </div>
            <div class="card-stat">
              <span class="stat-num" id="overall-template-hours">-</span>
              <span class="stat-desc">Hours</span>
            </div>
          </div>
        </div>
        <div class="overall-card blocks-card" style="background: linear-gradient(135deg, #0d3358 0%, #0a5a7a 100%);">
          <div class="card-icon">🔝</div>
          <h3>Header (global)</h3>
          <div class="card-stats">
            <div class="card-stat">
              <span class="stat-num">1</span>
              <span class="stat-desc">Default hrs</span>
            </div>
            <div class="card-stat">
              <span class="stat-num" id="overall-header-hours">-</span>
              <span class="stat-desc">Hours</span>
            </div>
          </div>
        </div>
        <div class="overall-card blocks-card" style="background: linear-gradient(135deg, #0d3358 0%, #0a5a7a 100%);">
          <div class="card-icon">🔻</div>
          <h3>Footer (global)</h3>
          <div class="card-stats">
            <div class="card-stat">
              <span class="stat-num">1</span>
              <span class="stat-desc">Default hrs</span>
            </div>
            <div class="card-stat">
              <span class="stat-num" id="overall-footer-hours">-</span>
              <span class="stat-desc">Hours</span>
            </div>
          </div>
        </div>
        <div class="overall-card blocks-card">
          <div class="card-icon">🧱</div>
          <h3>Known Blocks</h3>
          <div class="card-stats">
            <div class="card-stat">
              <span class="stat-num">${formatCount(numKnown)}</span>
              <span class="stat-desc">Block Variants</span>
            </div>
            <div class="card-stat">
              <span class="stat-num" id="overall-known-hours">-</span>
              <span class="stat-desc">Hours</span>
            </div>
          </div>
        </div>
        <div class="overall-card unknown-card">
          <div class="card-icon">❓</div>
          <h3>Unknown Blocks</h3>
          <div class="card-stats">
            <div class="card-stat">
              <span class="stat-num">${formatCount(unknownSampleCount)}</span>
              <span class="stat-desc">Samples</span>
            </div>
            <div class="card-stat">
              <span class="stat-num" id="overall-unknown-hours">-</span>
              <span class="stat-desc">Hours</span>
            </div>
          </div>
        </div>
        <div class="overall-card default-card">
          <div class="card-icon">📄</div>
          <h3>Default Content</h3>
          <div class="card-stats">
            <div class="card-stat">
              <span class="stat-num">${formatCount(defaultContentPages)}</span>
              <span class="stat-desc">Pages (not segmented)</span>
            </div>
            <div class="card-stat">
              <span class="stat-num" id="overall-default-hours">0</span>
              <span class="stat-desc">Hours</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grand-total-section">
        <div class="grand-total-header">
          <h3>🎯 Grand Total Migration Effort</h3>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; opacity: 0.95;">Sum of templates, header, footer, known blocks, unknowns, and default-content (if any).</p>
        </div>
        <div class="grand-total-stats">
          <div class="gt-stat">
            <span class="gt-value">${formatCount(totalPages)}</span>
            <span class="gt-label">Total Pages (scope)</span>
          </div>
          <div class="gt-stat highlight">
            <span class="gt-value" id="grand-total-all-hours">-</span>
            <span class="gt-label">Total Hours</span>
          </div>
          <div class="gt-stat">
            <span class="gt-value" id="grand-total-days">-</span>
            <span class="gt-label">Work Days (8hr)</span>
          </div>
          <div class="gt-stat">
            <span class="gt-value" id="grand-total-weeks">-</span>
            <span class="gt-label">Work Weeks</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Migration Intelligence & Recommendations</h2>
      <p style="margin-bottom: 20px; color: #666;">
        High-level readouts from this catalog run for <strong>${esc(siteName)}</strong> (Italian locale, ${formatCount(totalPages)} URLs).
      </p>
      <div style="background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 5px solid #28a745;">
        <h3 style="color: #155724; margin: 0 0 16px 0;">⚡ Quick wins</h3>
        <ul style="color: #155724; font-size: 0.9rem; line-height: 1.7;">
          <li><strong>Template clusters</strong> — ${formatCount(numTemplates)} tuned templates in <code>template-catalog.json</code>; use <strong>Migration Effort Calculator → Page Templates</strong> for hours per cluster.</li>
          <li><strong>EDS-classified blocks</strong> — ${formatCount(metrics.edsBlockVariants ?? numKnown)} mapped variant(s); prioritize high <em>Est. Pages</em> first.</li>
          <li><strong>Global chrome</strong> — Header and footer are single implementations; tune once on the Header/Footer tabs.</li>
        </ul>
      </div>
      <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 5px solid #ffc107;">
        <h3 style="color: #856404; margin: 0 0 16px 0;">⚠️ Scope & quality</h3>
        <ul style="color: #856404; font-size: 0.9rem; line-height: 1.7;">
          <li>Discovery: <strong>${esc(urlsAll.method ?? 'n/a')}</strong> (${esc(urlsAll.sitemapURL || '—')}). Expand scope if production adds routes not in the sitemap.</li>
          <li>Catalog tooling reported <strong>${formatCount(summary.errors?.totalCount ?? 0)}</strong> non-fatal issues during processing — review <code>catalog.log</code> if numbers look off.</li>
        </ul>
      </div>
      ${
        unknownVariantCount > 0
          ? `<div style="background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); border-radius: 12px; padding: 24px; border-left: 5px solid #dc3545;">
        <h3 style="color: #721c24; margin: 0 0 16px 0;">🔴 Review unknown variants</h3>
        <p style="color: #721c24; font-size: 0.9rem;">
          ${formatCount(unknownVariantCount)} unknown block variant(s) with ${formatCount(unknownSampleCount)} screenshot samples — validate against your target block library and consolidate duplicates.
        </p>
      </div>`
          : ''
      }
    </div>

    <footer>
      <p>Generated from Experience Catalyst catalog outputs | ${esc(siteName)}</p>
      <p>Data: <code>block-catalog.json</code>, <code>template-catalog.json</code>, <code>summary.json</code>, <code>urls-all.json</code>, <code>urls-checklist.json</code></p>
    </footer>
  </div>

  <div class="lightbox" id="lightbox" onclick="closeLightbox()">
    <span class="lightbox-close">&times;</span>
    <img id="lightbox-img" src="" alt="Block Screenshot">
  </div>

  <script>
${scriptBody}
  </script>
</body>
</html>
`;

const outPath = path.join(CATALOG, reportFileNameFromSiteName(siteName));
fs.writeFileSync(outPath, html, 'utf8');
console.log(`✓ Wrote ${outPath}`);
