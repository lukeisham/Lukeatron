---
plan: "hop-150-philosopher-scoring"
context: Teaching
created: 2026-09-29
status: New
major_because: "multi-step; web crawl + scripted scoring; feeds the HistoryOfPhilosophy seed"
project: ""
skills_used: [!HeadlessChromeBrowser]
---

# Plan — 150-philosopher three-score dataset (HistoryOfPhilosophy)

## Objective
A sourced dataset of 150 philosophers (50 main, 100 minor) with Popularity / Influence / Impact scores derived from SEP, IEP and (if reachable) Britannica.

## Success criteria
- `System/Apps/HistoryOfPhilosophy/_build/dataset/philosophers.csv` has 150 rows: 50 main, 100 minor; Western tradition plus a small set of key non-Western representatives.
- Each row carries the three 0-100 scores, the raw counts behind them, and its SEP/IEP entry slugs.
- `scoring-method.md` states each score's definition and limits in plain English.

## Steps
- [x] Crawl SEP (1,869 entries) and IEP (914 entries) [!HeadlessChromeBrowser / curl]
- [x] Britannica checked — Cloudflare bot check blocks it; not bypassed. Recorded as a gap.
- [x] Score ~222 candidates (mention counts across all SEP+IEP entries)
- [x] Select 50 main / 100 minor; wrote CSVs + method note; ideas list (149) added at Luke's request
- [ ] Verify against success criteria
