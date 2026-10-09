#!/usr/bin/env python3
"""!TabularRecipe source finder.

  find_recipe.py search "<dish>" [--limit 5]   # thermo.kitchen sitemap title match -> URLs
  find_recipe.py get <url>                     # schema.org Recipe JSON-LD -> JSON on stdout

Plain HTTP only (robots.txt of thermo.kitchen allows both). One request per second.
Never used against login-gated or bot-walled sites (Cookidoo, etc.).
"""
import json, re, sys, time, urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Lukeatron !TabularRecipe; personal use)"}
SITEMAP = "https://www.thermo.kitchen/post-sitemap.xml"


def fetch(url):
    time.sleep(1)
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=25).read().decode("utf8", "ignore")


def search(term, limit=5):
    urls = re.findall(r"<loc>(.*?)</loc>", fetch(SITEMAP))
    words = re.findall(r"[a-z0-9]+", term.lower())
    scored = []
    for u in urls:
        slug = u.rstrip("/").rsplit("/", 1)[-1]
        hits = sum(w in slug for w in words)
        if hits:
            scored.append((hits, u))
    scored.sort(key=lambda t: -t[0])
    return [u for _, u in scored[:limit]]


def _walk(x, out):
    if isinstance(x, dict):
        t = x.get("@type")
        if t == "Recipe" or (isinstance(t, list) and "Recipe" in t):
            out.append(x)
        for v in x.values():
            _walk(v, out)
    elif isinstance(x, list):
        for v in x:
            _walk(v, out)


def steps(instr):
    for s in instr or []:
        if isinstance(s, dict) and s.get("@type") == "HowToSection":
            yield from steps(s.get("itemListElement"))
        elif isinstance(s, dict):
            yield s.get("text", "")
        else:
            yield str(s)


def get(url):
    html = fetch(url)
    found = []
    for m in re.finditer(r'<script[^>]*ld\+json[^>]*>(.*?)</script>', html, re.S):
        try:
            _walk(json.loads(m.group(1)), found)
        except ValueError:
            pass
    if not found:
        return {"error": "no Recipe JSON-LD", "url": url}
    r = found[0]
    return {
        "url": url, "name": r.get("name"), "yield": r.get("recipeYield"),
        "prep": r.get("prepTime"), "cook": r.get("cookTime"), "total": r.get("totalTime"),
        "ingredients": r.get("recipeIngredient"),
        "steps": list(steps(r.get("recipeInstructions"))),
    }


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "search":
        lim = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 5
        print("\n".join(search(sys.argv[2], lim)))
    elif len(sys.argv) == 3 and sys.argv[1] == "get":
        print(json.dumps(get(sys.argv[2]), indent=1, ensure_ascii=False))
    else:
        sys.exit(__doc__)
