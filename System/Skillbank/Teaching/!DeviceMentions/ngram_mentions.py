#!/usr/bin/env python3
"""!DeviceMentions v3 — rank the Rhetoric devices by Google Books Ngram frequency.

One script, no agents. For every device (all 272) it queries the name and each alias
(minus alias_stoplist.json) case-insensitively, averaged over YEARS, and the same terms
inside context frames. Confusable devices (confusables.json, or any term above the auto
threshold) are scored on their context count scaled by K = median(raw/context) of the
non-confusable devices. Flipside devices are scored too, but rank by inheriting their
fallacy's score (the existing popularity rule). Writes seed/ngram_mentions.json only.

Usage: python3 ngram_mentions.py [--refresh]   (--refresh ignores the cache)
"""
import json, re, sys, time, math, statistics, urllib.parse, urllib.request, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]                                   # _Lukeatron
DEVICES = ROOT / "System/Apps/Rhetoric/seed/devices.json"
OUTPUT = ROOT / "System/Apps/Rhetoric/seed/ngram_mentions.json"
CACHE_DIR = ROOT / "System/Sandbox/DeviceMentions"
YEARS = (1980, 2019)
CORPUS = "en"
PER_REQUEST = 10
CACHE = CACHE_DIR / f"ngram_cache_{YEARS[0]}-{YEARS[1]}_{CORPUS}.json"   # one cache per window
NEAR_ZERO = 0.5e-9   # adjusted below this (per word) = indistinguishable from noise; ranked by lists_naming first
UA = "Lukeatron-Rhetoric/1.0 (personal research)"
FRAMES_DEVICE = ["use of {t}", "rhetorical {t}"]
FRAMES_FALLACY = ["{t} fallacy", "{t} argument", "fallacy of {t}"]

def is_fallacy(d):
    return any("fallacy" in str(d.get(k) or "").lower() for k in ("category", "form", "function"))

def clean(t):
    t = re.sub(r"\s*\(.*?\)", "", str(t)).replace(",", " ").strip()
    return re.sub(r"\s+", " ", t)

def ntok(t):
    """Ngram token count: a hyphen is a token of its own ("is-ought" = 3)."""
    return len(re.sub(r"-", " - ", t).split())

def norm(t):
    """Match key: Ngram echoes "is-ought" back as "is - ought"."""
    return re.sub(r"\s*-\s*", "-", t).strip().lower()

def terms(d, stop):
    """Search phrases for a device. A hyphenated term is searched whole (if it fits Ngram's 5-token limit,
    hyphens counting as tokens) AND as its tail after the last hyphen when that tail is 2+ words
    ("Is-Ought Fallacy" -> "ought fallacy"); the device keeps the max, as with aliases."""
    out, seen = [], set()
    for i, t in enumerate([d["name"]] + list(d.get("aliases") or [])):
        t = clean(t)
        cands = [t]
        if "-" in t:
            tail = t.rsplit("-", 1)[1].strip()
            if len(tail.split()) >= 2: cands.append(tail)
        for c in cands:
            if not c or norm(c) in seen or ntok(c) > 5: continue
            if (i > 0 or c != t) and c.lower() in stop: continue
            seen.add(norm(c)); out.append(c)
    return out

def frames(d, t):
    fs = FRAMES_FALLACY if is_fallacy(d) else FRAMES_DEVICE
    out = []
    for f in fs:
        p = f.format(t=t)
        if t.lower().endswith(" fallacy") and "fallacy" in f: continue   # avoid "X fallacy fallacy"
        if ntok(p) <= 5: out.append(p)
    return out

def fetch(phrases):
    q = urllib.parse.urlencode({"content": ",".join(phrases), "year_start": YEARS[0], "year_end": YEARS[1],
                                "corpus": CORPUS, "smoothing": 0, "case_insensitive": "true"})
    for wait in (0, 10, 30, 60):
        time.sleep(wait or 1.2)
        try:
            req = urllib.request.Request("https://books.google.com/ngrams/json?" + q, headers={"User-Agent": UA})
            data = json.load(urllib.request.urlopen(req, timeout=30))
            break
        except Exception as e:
            err = str(e)
    else:
        return {p: {"error": err} for p in phrases}
    got = {}
    for x in data:
        ng, ts = x["ngram"], x["timeseries"]
        base = ng[:-6] if ng.endswith(" (All)") else ng
        mean = sum(ts) / len(ts)
        key = norm(base)
        if ng.endswith(" (All)") or key not in got:      # prefer the case-insensitive total
            got[key] = mean
    return {p: {"freq": got.get(norm(p), 0.0), "found": norm(p) in got} for p in phrases}

def main():
    devs = json.load(open(DEVICES))
    stop = {t.lower() for t in json.load(open(HERE / "alias_stoplist.json"))["terms"]}
    conf = json.load(open(HERE / "confusables.json"))
    disc = json.load(open(HERE / "discipline_weights.json"))
    lists = {d["name"]: d.get("lists_naming") or 0 for d in devs}
    cache = {} if "--refresh" in sys.argv or not CACHE.exists() else json.load(open(CACHE))
    plan = {}
    for d in devs:
        for t in terms(d, stop):
            plan[t] = None
            for f in frames(d, t): plan[f] = None
    todo = [p for p in plan if p not in cache or "error" in cache[p]]
    print(f"{len(plan)} phrases, {len(todo)} to fetch")
    for i in range(0, len(todo), PER_REQUEST):
        cache.update(fetch(todo[i:i + PER_REQUEST]))
        CACHE.parent.mkdir(parents=True, exist_ok=True); json.dump(cache, open(CACHE, "w"))
        print(f"  {min(i + PER_REQUEST, len(todo))}/{len(todo)}", end="\r", flush=True)
    print()
    rows, errors = [], []
    for d in devs:
        ts = terms(d, stop); per = []
        for t in ts:
            r = cache[t]
            if "error" in r: errors.append(t); continue
            fr = [cache[f] for f in frames(d, t)]
            per.append(dict(term=t, raw=r["freq"], found=r["found"],
                            ctx=sum(x.get("freq", 0.0) for x in fr), ctx_error=any("error" in x for x in fr)))
        if not per:
            rows.append(dict(name=d["name"], error="no term readable")); continue
        best = max(per, key=lambda p: p["raw"])
        hot = [p["term"] for p in per if p["raw"] > conf["auto_threshold"]]
        rows.append(dict(name=d["name"], fallacy=is_fallacy(d), flipside_of=d.get("flipside_of"),
                         raw=best["raw"], raw_term=best["term"], ctx=max(p["ctx"] for p in per),
                         confusable=d["name"] in conf["devices"] or bool(hot),
                         note=conf["devices"].get(d["name"]) or (f"very common term(s): {', '.join(hot)}" if hot else None),
                         below_threshold=not any(p["found"] for p in per), terms_used=[p["term"] for p in per]))
    ok = [r for r in rows if "error" not in r]
    ratios = [r["raw"] / r["ctx"] for r in ok if not r["confusable"] and r["ctx"] > 0 and r["raw"] > 0 and not r["flipside_of"]]
    K = statistics.median(ratios) if ratios else 1.0
    # Floor for confusables whose context frames are below Ngram's threshold (ctx 0): assume they are as
    # device-dominant as a typical low measured confusable (Q = lower quartile of ctx*K/raw), not zero.
    qs = sorted(min(1.0, r["ctx"] * K / r["raw"]) for r in ok if r["confusable"] and r["ctx"] > 0 and r["raw"] > 0)
    Q = qs[len(qs) // 4] if qs else 0.0
    for r in ok:
        r["adjusted"] = (min(r["raw"], r["ctx"] * K) if r["ctx"] > 0 else r["raw"] * Q) if r["confusable"] else r["raw"]
        r["context_floor"] = bool(r["confusable"] and r["ctx"] == 0)
        r["discipline"] = disc["devices"].get(r["name"])
        if r["discipline"]:
            r["before_weight"] = r["adjusted"]; r["adjusted"] *= disc["weight"]
        r["lists_naming"] = lists.get(r["name"], 0)
    own = sorted([r for r in ok if not r["flipside_of"]], key=lambda r: (r["adjusted"] < NEAR_ZERO, -r["adjusted"] if r["adjusted"] >= NEAR_ZERO else -r["lists_naming"],
                                                                        -r["adjusted"], r["name"].lower()))
    # Above NEAR_ZERO: by count. In the near-zero band (incl. below-threshold zeros): by how many curated lists name
    # the device, then by count. The 0-100 score is unchanged (still from the count).
    mx = max([r["adjusted"] for r in own] or [0]) * 1e9
    for i, r in enumerate(own, 1):
        r["rank"] = i
        r["score"] = round(100 * math.log(1 + r["adjusted"] * 1e9) / math.log(1 + mx)) if mx else 0
    byname = {r["name"]: r for r in own}
    for r in ok:
        if r["flipside_of"]:
            p = byname.get(r["flipside_of"])
            r["inherits"] = r["flipside_of"]; r["rank"] = p["rank"] if p else None; r["score"] = p["score"] if p else None
    for r in ok:
        for k in ("raw", "ctx", "adjusted", "before_weight"):
            if k in r: r[k + "_per_billion"] = round(r.pop(k) * 1e9, 3)
    out = dict(generated_at=datetime.datetime.now().isoformat(timespec="seconds"), source="google_books_ngram",
               measure=f"Mean yearly frequency {YEARS[0]}-{YEARS[1]} in Google Books ({CORPUS}), case-insensitive, per billion words; "
                       "max over name and aliases. Confusable devices use context frames x K.",
               context_frames=dict(device=FRAMES_DEVICE, fallacy=FRAMES_FALLACY), K=round(K, 2), Q=round(Q, 4), discipline_weight=disc["weight"],
               devices_total=len(devs), devices_scored=len(own), errors=errors,
               ranking=sorted(ok, key=lambda r: (r.get("rank") or 10**6, r["name"])) + [r for r in rows if "error" in r])
    json.dump(out, open(OUTPUT, "w"), indent=1)
    print(f"K={K:.1f}  Q={Q:.4f}  scored={len(own)}  flipsides={len(ok) - len(own)}  term errors={len(errors)}  -> {OUTPUT}")

if __name__ == "__main__":
    main()
