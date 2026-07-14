# 🔎 Search — social & news mention tracker

Track down where **one phrase or term** is being mentioned across **social media**
and **news articles with comment sections**, from a single browser tab.

## Launch (one click)

Double-click **`Start Search.command`**. It runs `python3 serve.py` and opens
`http://localhost:8789` in your browser. Press **Ctrl-C** in the terminal to stop.

*(No installation. Pure Python 3 standard library — nothing to `pip install`.)*

## How to use it

1. Type **one phrase or term** in the box.
2. **Run Phase 1** — casts wide and cheap, returns the **initial pool** of links.
3. **Run Phase 2** — fetches the most promising pool items and deep-scores them
   into a shorter **shortlist**.
4. **Run Phase 3** — confirms the exact phrase really appears, giving the
   **final results**.

You run **one phase at a time**, so you can *pause* between phases and *repeat*
any phase (each panel has a **Repeat** button). Results in every phase are plain
**clickable links**. Each phase shows how expensive it was — **time, estimated
tokens, HTTP requests, bytes**.

## The strategy

**Path of least resistance, then escalating precision.** A wide cheap pool → a
deep expensive shortlist → a strict exact-phrase confirmation. You watch the cost
climb as precision climbs, and stop wherever the answer is good enough.

## Sources (v1)

Hacker News, Reddit, and Google News — all key-free, all comment-bearing.
Adding more (or authenticated ones like X/Instagram) is documented in
**`REFACTORING_GUIDE.md`**. The spec history lives in **`_Builds/`**.

Port `8789` (the wiki viewer uses `8787`, the project dashboard `8788`).
