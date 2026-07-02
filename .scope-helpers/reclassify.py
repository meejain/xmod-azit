#!/usr/bin/env python3
"""
Shared block reclassifier + template segregator for Petrobras-family Liferay sites.

Combines two signals:
  1. Semantic fragment name from the CSS selector (authoritative when present).
  2. Content signature (headings/images/buttons/video) for generic fragment# blocks.

Then:
  - marks non-block "default" section content (breadcrumb, page title, rich text,
    single image, button rows, tag/metadata strips),
  - collapses consecutive same-type blocks (an N-item accordion = one accordion block),
  - segregates templates by exact collapsed layout signature (> N pages = template,
    otherwise the page stays unique),
  - rebuilds block-catalog.json, template-catalog.json and updates summary.json.

Usage:  python3 reclassify.py <catalogFolder> [--threshold 5] [--dry-run]
"""
import json, os, re, sys, shutil
from collections import defaultdict, Counter

# --- structural types we trust even when detected inside a fragment ---
TRUST = {"embed", "table", "accordion", "carousel", "tabs", "video", "form", "search", "cards"}

# --- semantic fragment-name -> canonical block type -----------------------
# Derived from the cross-site fragment catalog + PER-FRAGMENT VISUAL VERIFICATION
# (see .scope-helpers/fragment-catalog.json). Ordered: most-specific first.
# Each entry is (regex on normalized stem, type). First match wins.
SEMANTIC = [
    # ---- explicit NON-BLOCK default content (verified: titles, standfirsts,
    #      breadcrumbs, bylines, single images, nav lists, tag strips) ----
    (r"^ptb-news", "default"),                 # article title/read-content
    (r"^main-headline", "default"),            # article H1 (verified)
    (r"^summary-container", "default"),        # article standfirst (verified)
    (r"^publish", "default"),                  # byline / social / date strip
    (r"breadcrumb", "default"),
    (r"^news-featured", "default"),            # article featured image (verified)
    (r"^chapter-highlight-image", "default"),  # single image (verified)
    (r"^chapter-intro", "default"),            # chapter intro text
    (r"^chapter-content", "default"),          # chapter body wrapper (text+img)
    (r"^media-container", "default"),          # single featured image (verified)
    (r"^content-media", "default"),
    (r"^image", "default"),                    # single image
    (r"^imagem", "default"),
    (r"^basic-component-image", "default"),
    (r"^layouts", "default"),                  # nav link list (verified)
    (r"^plataforma-", "default"),              # interactive diagram/illustration
    (r"^sectiontype", "default"),
    (r"^tipos$", "default"),
    (r"^tour$", "default"),
    (r"^introduction$", "default"),
    (r"^textos?$", "default"),                 # rich text (verified)
    (r"^se--o-de-conte-do", "default"),
    (r"^se--o-para-textos", "default"),
    (r"^se--o-de-cart-es", "default"),
    (r"^tags-", "default"),
    (r"pagination", "default"),
    (r"^tag-reading", "default"),
    (r"^particles-js", "default"),
    (r"^bg$", "default"),
    (r"^saojoao", "default"),
    (r"^filter-label", "default"),
    (r"^business-filter", "default"),
    (r"^rodap", "default"),
    (r"^page$", "default"),
    (r"^text$", "default"),
    (r"^row$", "default"),
    (r"^chatbot", "default"),
    (r"^estrutura-content$", "default"),
    (r"^petro-chapters-categories", "default"),
    (r"^petro-chapters-pagination", "default"),
    (r"^petro-webstories-pagination", "default"),
    (r"^petro-webstories-categories", "default"),
    (r"^stories-", "default"),
    (r"^quadrobrancofinal", "default"),
    (r"^tag-", "default"),

    # ---- tabs (verified: nav strips with arrows, tab widgets) ----
    (r"cards-de-navegacao", "tabs"),           # nav-card strip w/ arrows (verified)
    (r"abas", "tabs"),                         # abas-de-navegacao (verified)
    (r"tabs-container", "tabs"),
    (r"tab-container", "tabs"),
    (r"tab-dropzone", "tabs"),

    # ---- accordions ----
    (r"container-accordion", "accordion"),
    (r"conte-do-expans-vel", "accordion"),
    (r"conteudos-expansiveis", "accordion"),
    (r"conte-dos-expans-veis", "accordion"),
    (r"^accordion", "accordion"),
    (r"page-buttons-area", "accordion"),
    (r"^faq$", "accordion"),

    # ---- carousels (verified: card carousels, galleries, highlight blocks) ----
    (r"cards-carousel", "carousel"),
    (r"lista-de-cards", "carousel"),
    (r"lista-cards", "carousel"),
    (r"carrossel", "carousel"),
    (r"carousel", "carousel"),
    (r"itens-carousel", "carousel"),
    (r"glossary-container", "carousel"),
    (r"bloco-de-destaque$", "carousel"),       # highlight carousel (verified)
    (r"estrutura---galeria", "carousel"),
    (r"estrutura---lista-de-cart", "carousel"),
    (r"acesse-tamb-m", "carousel"),
    (r"webstor", "carousel"),
    (r"^videos$", "carousel"),
    (r"^container$", "carousel"),
    (r"container-fluid", "carousel"),

    # ---- cards (verified: icon/link card grids, product cards) ----
    (r"card-news-list", "cards"),
    (r"cards-product", "cards"),
    (r"cards-tags", "cards"),
    (r"cards-highlights", "cards"),
    (r"cards-saiba-mais", "cards"),
    (r"chapters-container", "cards"),
    (r"petro-webstories-cards", "cards"),
    (r"card-conteudo", "cards"),
    (r"card-link", "cards"),
    (r"card---com-link", "cards"),
    (r"cart-o", "cards"),                      # cartao-titulo-imagem-texto (verified)
    (r"informe---card", "cards"),
    (r"^results$", "cards"),
    (r"energy-section", "cards"),
    (r"filter-block-container", "cards"),
    (r"sectionnumbers", "cards"),
    (r"chart-legend", "cards"),
    (r"paragrafo-final", "cards"),
    (r"^list$", "cards"),
    (r"^card$", "cards"),
    (r"^cards$", "cards"),

    # ---- hero / banners (verified: full-width banners w/ title overlay) ----
    (r"banner", "hero"),                       # banner-hero, banner-comunica, etc
    (r"estrutura---banner", "hero"),
    (r"estrutura---do-carrossel-banner", "hero"),
    (r"main-content", "hero"),
    (r"sectionhero", "hero"),
    (r"informe---display", "hero"),
    (r"presal-background", "hero"),
    (r"jobs-banner", "hero"),
    (r"hero-banner", "hero"),
    (r"^hero$", "hero"),
    (r"^escolha", "hero"),
    (r"ultimoslide", "hero"),

    # ---- embeds ----
    (r"embed-responsive", "embed"),
    (r"^iframe", "embed"),
    (r"^issuu$", "embed"),
    (r"^map$", "embed"),
    (r"social-media-footer", "embed"),
    (r"schedule-list$", "embed"),

    # ---- tables ----
    (r"^tabela$", "table"),
    (r"importa--o-de-tabela", "table"),
    (r"asset_publisher_web", "table"),

    # ---- video ----
    (r"story-video", "video"),
    (r"video-placeholder", "video"),
    (r"basic-component-external-video", "video"),
    (r"basic-component-video", "video"),
    (r"client-extension-web", "video"),
    (r"lista-cards-video", "video"),
    (r"^story$", "video"),

    # ---- search / forms ----
    (r"search-with-results", "search"),
    (r"portal-search-web", "search"),
    (r"filters-section", "form"),
    (r"dynamic-data-mapping-form", "form"),
    (r"^busca$", "form"),
    (r"op--es-de-acessibilidade", "form"),
    (r"selecione-um-idioma", "form"),

    # ---- columns (verified: image+text side-by-side layout blocks) ----
    (r"chapter-download", "columns"),          # image+link layout (verified)
    (r"geral-structure", "columns"),
    (r"authorities-schedule", "columns"),
    (r"read-full-report-area", "columns"),
]

# Generic Liferay layout containers: the SAME fragment name renders as different
# blocks depending on the content dropped into it (verified: grade-linhas-e-colunas
# is a cards grid on /institucional but an empty iframe embed on /obras). These must
# be resolved by CONTENT SIGNATURE, never by a fixed name->type rule.
GENERIC_CONTAINERS = re.compile(
    r"^(grade$|grade-linhas-e-colunas|bloco-de-destaque-midia|secao$|energy-page)"
)

def norm_semname(sel):
    if not sel:
        return None
    m = re.search(r'lfr-layout-structure-item-([a-z0-9-]+)', sel)
    if m:
        n = re.sub(r'-[0-9a-f]{6,}.*$', '', m.group(1))
        return n
    if 'fragment' in sel:
        return None  # generic fragment -> use content heuristic
    # take the first meaningful token of the leading selector segment:
    #  - "#some-id > div" -> "some-id"
    #  - "div.iframe-container.col-3-10" -> "iframe-container" (skip bare tag)
    #  - "ul.layouts.level-2" -> "layouts"
    seg = sel.split('>')[0].strip()
    idm = re.match(r'#([a-z0-9_-]+)', seg, re.I)
    if idm:
        return idm.group(1).lower()
    clm = re.search(r'\.([a-z][a-z0-9_-]+)', seg, re.I)
    if clm:
        return clm.group(1).lower()
    tagm = re.match(r'([a-z0-9_-]+)', seg, re.I)
    return tagm.group(1).lower() if tagm else None

def semantic_type(sel):
    n = norm_semname(sel)
    if not n:
        return None
    for pat, t in SEMANTIC:
        if re.search(pat, n):
            return t
    return None

def content_type(b):
    c = b.get("content", {})
    h = c.get("headingCount", 0); img = c.get("imageCount", 0)
    p = c.get("paragraphCount", 0); btn = c.get("buttonCount", 0)
    lst = c.get("listCount", 0); vid = c.get("hasVideo", False)
    frm = c.get("hasForm", False)
    if frm:
        return "form"
    if vid or (img >= 3 and btn >= 3):
        return "hero"
    if h >= 2 and img >= 2:
        return "cards"
    # single heading, paragraphs, single image, buttons, links => default content
    return "default"

def classify(b, position=None):
    t = b.get("type")
    # 0. generic Liferay layout containers: same name, variable content.
    #    Resolve by content signature, not by fixed name mapping.
    n = norm_semname(b.get("selector"))
    if n and GENERIC_CONTAINERS.match(n):
        c = b.get("content", {})
        if c.get("imageCount", 0) >= 2 and c.get("headingCount", 0) >= 2:
            return "cards"
        if t in TRUST:
            return t
        return content_type(b)
    # 1. semantic selector name is the most authoritative signal
    st = semantic_type(b.get("selector"))
    if st:
        return st
    # 1b. TOP-BANNER heuristic: the very first block on a page, full page width,
    #     carrying a heading + image, is a hero banner even when its fragment was
    #     captured with an instance UUID instead of the 'banner-hero' component name.
    #     (Verified: pbio's per-page banners were captured this way; siblings' were
    #     named 'banner-hero---cor' and always sit at position 0, full width 1440.)
    if position == 0:
        c = b.get("content", {})
        bd = b.get("bounds", {})
        if (c.get("imageCount", 0) >= 1 and c.get("headingCount", 0) >= 1
                and bd.get("width", 0) >= 1200 and bd.get("y", 999) < 200):
            return "hero"
    # 2. trust confident structural detections
    if t in TRUST:
        return t
    # 3. content signature for fragments / hero / unknown / columns / breadcrumbs
    if t == "breadcrumbs":
        return "default"
    if t == "columns":
        # a real multi-column block needs >=2 images or a heading+list structure;
        # otherwise it is default rich text laid out in a fragment grid
        c = b.get("content", {})
        if c.get("imageCount", 0) >= 2 or c.get("listCount", 0) >= 2:
            return "columns"
        return content_type(b)
    if t in ("hero", "unknown", "default", None):
        return content_type(b)
    return t

def collapse(seq):
    out = []
    for x in seq:
        if not out or out[-1] != x:
            out.append(x)
    return out

def main():
    if len(sys.argv) < 2:
        print("usage: reclassify.py <catalogFolder> [--threshold N] [--dry-run]")
        sys.exit(1)
    root = sys.argv[1].rstrip("/")
    thr = 5
    dry = "--dry-run" in sys.argv
    if "--threshold" in sys.argv:
        thr = int(sys.argv[sys.argv.index("--threshold") + 1])

    pdir = os.path.join(root, ".pages")
    pages = [d for d in sorted(os.listdir(pdir))
             if os.path.isfile(os.path.join(pdir, d, "page-catalog.json"))
             and not d.startswith("_")]

    # --- pass 1: reclassify blocks in every page-catalog ---
    transitions = Counter()
    variant_sig = defaultdict(lambda: {"pages": set(), "shots": [], "descs": set()})
    page_layout = {}
    host = None
    for d in pages:
        f = os.path.join(pdir, d, "page-catalog.json")
        dd = json.load(open(f))
        u = dd.get("url", "")
        if host is None and u:
            m = re.match(r'https?://[^/]+', u)
            host = m.group(0) if m else ""
        real_seq = []
        for pos, b in enumerate(dd.get("blocks", [])):
            old = b.get("type")
            new = classify(b, position=pos)
            if new != old:
                transitions[(old, new)] += 1
                oldshot = b.get("screenshot"); oldid = b.get("id", "")
                if "-" in oldid:
                    newid = new + "-" + oldid.split("-", 1)[1]
                else:
                    newid = new
                if oldshot and not dry:
                    if "/" in oldshot:
                        newshot = oldshot.rsplit("/", 1)[0] + "/" + newid + ".jpg"
                    else:
                        newshot = newid + ".jpg"
                    op = os.path.join(pdir, d, oldshot); npth = os.path.join(pdir, d, newshot)
                    if os.path.exists(op) and op != npth:
                        shutil.move(op, npth)
                    b["screenshot"] = newshot
                b.setdefault("reclassifiedFrom", old)
                b["id"] = newid
                b["type"] = new
            # collect for block-catalog + layout
            if b["type"] != "default":
                real_seq.append(b["type"])
                vc = b.get("visualChars", {})
                sig = (b["type"], vc.get("density", "na"), vc.get("colorScheme", "na"))
                rec = variant_sig[sig]
                rec["pages"].add(u)
                shot = b.get("screenshot")
                if shot:
                    rel = ".pages/" + d + "/" + shot
                    if rel not in rec["shots"]:
                        rec["shots"].append(rel)
                if b.get("description"):
                    rec["descs"].add(b["description"])
        if not dry:
            json.dump(dd, open(f, "w"), indent=2, ensure_ascii=False)
        lay = collapse(real_seq)
        page_layout[u] = " > ".join(lay) if lay else "content-only"

    # --- pass 2: rebuild block-catalog.json (preserve header/footer globals) ---
    bc_path = os.path.join(root, "block-catalog.json")
    bc = json.load(open(bc_path))
    a = bc["analysis-block-catalog"]
    globals_ = {k: v for k, v in a["blockVariants"].items()
                if v.get("baseBlock") in ("header", "footer")}
    newbv = dict(globals_)
    counters = defaultdict(int)
    processed = 0
    for (t, dens, cs), rec in sorted(variant_sig.items(),
                                     key=lambda x: (-len(x[1]["pages"]), x[0])):
        processed += sum(1 for _ in rec["pages"])
        base = f"{t}-{dens}-{cs}"
        counters[base] += 1
        vid = base if counters[base] == 1 else f"{base}-{counters[base]-1}"
        newbv[vid] = {
            "blockVariantId": vid,
            "baseBlock": t,
            "canonicalModel": "standalone",
            "pagesFound": len(rec["pages"]),
            "description": "; ".join(sorted(rec["descs"]))[:200],
            "screenshots": rec["shots"][:6],
        }
    total_blocks = sum(len(r["pages"]) for r in variant_sig.values())
    a["blockVariants"] = newbv
    a["totalBlockVariants"] = len(newbv)
    a["newVariantsCreated"] = len(newbv) - len(globals_)
    if not dry:
        json.dump(bc, open(bc_path, "w"), indent=2, ensure_ascii=False)

    # --- pass 3: segregate templates by collapsed layout, > thr pages = template ---
    sig_pages = defaultdict(list)
    for u, sig in page_layout.items():
        sig_pages[sig].append(u)

    NAMEMAP = {
        "content-only": ("text-content-page", "Text content page: intro heading and rich text, no structured blocks"),
        "cards": ("cards-grid-page", "Cards grid page: intro text followed by a grid of icon/link cards"),
        "embed": ("data-embed-page", "Data page: intro text with an embedded data table/tool"),
        "accordion": ("accordion-faq-page", "Accordion page: intro text with an expandable accordion/FAQ list"),
        "hero": ("hero-landing-page", "Landing page: hero banner followed by content"),
        "carousel": ("carousel-page", "Carousel-led page"),
        "tabs": ("tabs-page", "Tabbed content page"),
    }
    # A layout becomes a TEMPLATE when shared by more than `thr` pages, OR when it
    # is the block-less "content-only" layout. Content-only pages (just rich text,
    # zero blocks) always share the same trivial migration profile, so they are
    # grouped into a single text-content template regardless of how few there are.
    templates = []
    unique = []
    for sig, urls in sorted(sig_pages.items(), key=lambda x: -len(x[1])):
        if len(urls) > thr or sig == "content-only":
            nm, desc = NAMEMAP.get(sig, (sig.replace(" > ", "-").replace(" ", "") + "-page",
                                         f"Layout: {sig}"))
            templates.append((nm, desc, sig, urls))
        else:
            for u in urls:
                unique.append((u, sig))

    out = {"templates": []}
    used_names = set()
    for nm, desc, sig, urls in templates:
        out["templates"].append({
            "name": nm,
            "representativePages": urls[:5],
            "urls": sorted(urls),
            "description": desc,
            "layoutSignature": sig,
            "pageCount": len(urls),
        })
        used_names.add(nm)
    for u, sig in unique:
        path = u[len(host):] if host and u.startswith(host) else u
        slug = path.rstrip("/").split("/")[-1] or "root"
        nm = f"unique-{slug}"[:60]
        base = nm; i = 2
        while nm in used_names:
            nm = f"{base}-{i}"; i += 1
        used_names.add(nm)
        out["templates"].append({
            "name": nm,
            "representativePages": [u],
            "urls": [u],
            "description": f"Unique page layout: {sig}",
            "layoutSignature": sig,
            "pageCount": 1,
        })
    tc_path = os.path.join(root, "template-catalog.json")
    if not dry:
        json.dump(out, open(tc_path, "w"), indent=2, ensure_ascii=False)

    # --- pass 4: update summary.json metrics ---
    content_variants = [v for v in newbv.values()
                        if v["baseBlock"] not in ("header", "footer")]
    unknown = len([v for v in content_variants if v["baseBlock"] == "unknown"])
    sm_path = os.path.join(root, "summary.json")
    if os.path.isfile(sm_path):
        sm = json.load(open(sm_path))
        m = sm.get("analysis-summary", {}).get("metrics", {})
        m["totalTemplates"] = len(out["templates"])
        m["totalBlockTypes"] = len(newbv)
        m["unknownBlockVariants"] = unknown
        m["edsBlockVariants"] = len(content_variants) - unknown
        if not dry:
            json.dump(sm, open(sm_path, "w"), indent=2, ensure_ascii=False)

    # --- report ---
    print(f"=== {os.path.basename(root)} ===")
    print(f"pages: {len(pages)}  | block transitions: {sum(transitions.values())}")
    for (o, n), k in transitions.most_common():
        print(f"   {o:>10} -> {n:<10} : {k}")
    print(f"block variants (incl header/footer): {len(newbv)}  | unknown: {unknown}")
    print(f"templates(> {thr} pages): {len(templates)}  | unique pages: {len(unique)}")
    for nm, desc, sig, urls in templates:
        print(f"   TEMPLATE {nm} [{len(urls)}]  '{sig}'")
    from collections import Counter as C
    uc = C(sig for _, sig in unique)
    for sig, k in uc.most_common():
        print(f"   unique x{k}: '{sig}'")

if __name__ == "__main__":
    main()
