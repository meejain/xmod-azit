#!/usr/bin/env python3
"""
Build a fragment-verification catalog across ALL catalog-* folders.

Normalizes Liferay fragment selectors to a semantic STEM (stripping per-instance
numeric / hex suffixes), then for each distinct stem records:
  - occurrence count, sites, current detected-type distribution,
  - representative screenshot paths (up to N), with the content signature,
so each distinct fragment type can be visually verified exactly once.

Outputs JSON to /workspace/.scope-helpers/fragment-catalog.json
Splits stems into:
  - "named"      : has an alphabetic semantic stem (Liferay component name)
  - "anonymous"  : pure hex/uuid fragment (no semantic name) -> needs content/visual check
"""
import json, os, re
from collections import defaultdict

ROOT = "/workspace"
OUT = "/workspace/.scope-helpers/fragment-catalog.json"
MAX_SHOTS = 3

def raw_name(sel):
    if not sel:
        return None, "none"
    m = re.search(r'lfr-layout-structure-item-([a-z0-9-]+)', sel)
    if m:
        return m.group(1), "lfr"
    if 'fragment' in sel:
        return "__fragment__", "fragment"
    seg = sel.split('>')[0].strip()
    idm = re.match(r'#([a-z0-9_-]+)', seg, re.I)
    if idm:
        return idm.group(1).lower(), "id"
    clm = re.search(r'\.([a-z][a-z0-9_-]+)', seg, re.I)
    if clm:
        return clm.group(1).lower(), "class"
    tagm = re.match(r'([a-z0-9_-]+)', seg, re.I)
    return (tagm.group(1).lower() if tagm else sel[:30]), "tag"

HEX = re.compile(r'^[0-9a-f]{6,}(-[0-9a-f]{2,})*$')

def stem_of(raw):
    """Collapse per-instance suffixes to a stable semantic stem."""
    if raw is None:
        return "__none__", False
    n = raw
    # strip trailing hex-ish uuid tails: name-1a2b-3c4d... -> name
    n = re.sub(r'(-[0-9a-f]{4,}){1,}$', '', n)
    # strip trailing _NNNNN instance ids
    n = re.sub(r'_\d{3,}$', '', n)
    # strip trailing -NNNNN / _breakpoint noise for grouping (keep readable)
    n = re.sub(r'-\d{3,}$', '', n)
    n = re.sub(r'-breakpoint$', '', n)
    is_named = bool(re.search(r'[a-z]{3,}', n)) and not HEX.match(n)
    return n or "__blank__", is_named

def main():
    stems = defaultdict(lambda: {
        "count": 0, "sites": set(), "types": defaultdict(int),
        "shots": [], "descs": set(), "rawExamples": set(),
    })
    for cf in sorted(os.listdir(ROOT)):
        if not cf.startswith("catalog-"):
            continue
        pdir = os.path.join(ROOT, cf, ".pages")
        if not os.path.isdir(pdir):
            continue
        for d in os.listdir(pdir):
            f = os.path.join(pdir, d, "page-catalog.json")
            if not os.path.isfile(f):
                continue
            try:
                dd = json.load(open(f))
            except Exception:
                continue
            for b in dd.get("blocks", []):
                raw, kind = raw_name(b.get("selector"))
                stem, named = stem_of(raw)
                s = stems[stem]
                s["count"] += 1
                s["sites"].add(cf[len("catalog-"):])
                s["types"][b.get("type")] += 1
                s["named"] = named
                s["kind"] = kind
                if raw and len(s["rawExamples"]) < 4:
                    s["rawExamples"].add(raw)
                if b.get("description"):
                    s["descs"].add(b["description"])
                shot = b.get("screenshot")
                if shot and len(s["shots"]) < MAX_SHOTS:
                    c = b.get("content", {})
                    sigstr = "h%d/img%d/p%d/btn%d/list%d/vid%s/form%s" % (
                        c.get("headingCount", 0), c.get("imageCount", 0),
                        c.get("paragraphCount", 0), c.get("buttonCount", 0),
                        c.get("listCount", 0), int(bool(c.get("hasVideo"))),
                        int(bool(c.get("hasForm"))))
                    s["shots"].append({
                        "path": os.path.join(cf, ".pages", d, shot),
                        "sig": sigstr,
                        "curType": b.get("type"),
                    })
    named, anon = {}, {}
    for stem, s in stems.items():
        rec = {
            "stem": stem,
            "count": s["count"],
            "sites": sorted(s["sites"]),
            "types": dict(sorted(s["types"].items(), key=lambda x: -x[1])),
            "rawExamples": sorted(s["rawExamples"]),
            "descs": sorted(s["descs"])[:6],
            "shots": s["shots"],
        }
        (named if s.get("named") else anon)[stem] = rec
    out = {
        "namedCount": len(named),
        "anonymousCount": len(anon),
        "named": dict(sorted(named.items(), key=lambda x: -x[1]["count"])),
        "anonymous": dict(sorted(anon.items(), key=lambda x: -x[1]["count"])),
    }
    json.dump(out, open(OUT, "w"), indent=2, ensure_ascii=False)
    # console summary
    print("distinct NAMED stems:", len(named))
    print("distinct ANON stems :", len(anon))
    print("\n# NAMED stems (count>=2), verify each:")
    for stem, r in sorted(named.items(), key=lambda x: -x[1]["count"]):
        if r["count"] < 2:
            continue
        t = ",".join(f"{k}:{v}" for k, v in r["types"].items())
        print("%5d [%2ds] %-38s {%s}" % (r["count"], len(r["sites"]), stem[:38], t))

if __name__ == "__main__":
    main()
