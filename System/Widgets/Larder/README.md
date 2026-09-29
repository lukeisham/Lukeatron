# Larder

A recipe panel opened from Home's command bar, read-only over Memory/Long-Term/Recipes/. The `!TabularRecipe` skill is the only thing that adds or changes recipes.

## How it plugs into Home

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| Home `home.js` → `static/panels/larder.js` | `web/larder.js` | `mount(host, { onClose })` → `{ open, close }`; row with `data-panel="Larder"` | Renaming the file or export leaves the row doing nothing |
| Home server | `web/` | Served at `/widgets/Larder/<file>`, signed-in only, via `HOSTED_WIDGETS` | Moving files out of `web/` makes them unreachable |
| `web/api.js` | Home `GET /api/larder/recipes`, `GET /api/larder/recipe/<slug>` | JSON lists and recipe records; 401 / 404 / 500 | A changed reply shape breaks search or the recipe page |
| Home `routes/larder.py` | `larder` package | `list_recipes(dir)`, `read_recipe(dir, slug) → dict \| None` | A renamed function stops Home at start-up |
| `larder` | `Memory/Long-Term/Recipes/` | Reads `<slug>.md` and `<slug>.svg`; never writes | A changed saved-file layout (`!TabularRecipe`) shows blank fields |
| Home self-check | Recipes folder, `larder` | Read probe; import check | Missing either stops Home at start-up |
| `web/larder.css` | Home `tokens.css` | Token names only | A renamed Home token unstyles the panel |

Request flow: command bar row → home.js go() → panels/larder.js → web/larder.js mount/open → web/api.js → Home routes/larder.py → larder package → Recipes/*.md + *.svg.

## What lives where

```
Larder/
├── app-decisions.md
├── README.md
├── larder/
│   ├── __init__.py
│   └── recipes.py
├── web/
│   ├── larder.js
│   ├── search.js
│   ├── recipe-view.js
│   ├── api.js
│   └── larder.css
└── tests/
    ├── fixtures/
    │   ├── _index.yaml
    │   ├── bare-toast.md
    │   ├── broken.md
    │   ├── carrot-soup.md
    │   ├── curry.md
    │   ├── curry.svg
    │   └── recipes.md
    ├── helpers.py
    ├── test_recipes.py
    ├── test_recipe_view.mjs
    └── test_search.mjs

Home/ (hooks only)
├── static/panels/larder.js
├── routes/larder.py
├── tests/test_larder.py
└── edits in server.py · core/paths.py · core/home.py · core/selfcheck.py · routes/page.py · static/home.js · static/index.html
```

## Run the tests

From the Larder folder:

```bash
python3 -m unittest discover -s tests -p "test_*.py"
node --test tests/test_search.mjs tests/test_recipe_view.mjs
```

Home's own test suite covers the routes:

```bash
cd System/Apps/Home && python3 -m unittest discover -s tests
```

## Rule exceptions

See [app-decisions.md](app-decisions.md) → Rule exceptions (the only record).
