---
type: reference
title: "AI-Generated Writing — Detectable Characteristics"
description: "A taxonomy of surface, syntactic, statistical, and discourse-level patterns associated with LLM-generated prose, with a load-bearing caveat that detection is unreliable and that formal/academic human prose shares the same patterns."
---

# AI-Generated Writing — Detectable Characteristics

> **Suggested store:** `Style` — this is a reference on prose surface-pattern recognition (lexical
> choice, sentence rhythm, punctuation habits, discourse markers), which is Style's proper domain
> rather than Writing Non-Fiction's (composition/publication of Luke's own pieces). If Luke instead
> wants it filed under Writing Non-Fiction because its use case is evaluating drafts, that's a
> reasonable alternative — either store, not both.

## Why this is here

Sourced from the Phase 1 research seed for the AI Characteristics Generator cartridge
(`System/Widgets/Generator/AiCharacteristics/`, seed research August 2026). That research catalogued
detectable patterns in LLM-generated text across eight categories. This keeper preserves the durable
knowledge — the taxonomy, the reliability caveat, and the sourcing — independent of the widget's
build artefacts, which may change or be superseded.

## The core, load-bearing caveat

**AI-text detection is inherently unreliable.** Before any use of the taxonomy below:

1. **No single marker is reliable**, and no detector achieves better than ~85% accuracy across
   domains in peer-reviewed studies as of 2026 (Chakraborty et al.; Wu et al.).
2. **Formal and academic human prose exhibits the same patterns.** Wikipedia articles, scientific
   abstracts, and formal business writing show many of the same lexical, syntactic, and statistical
   markers attributed to AI — because LLM training corpora are themselves drawn heavily from formal,
   curated, academic text. Detection tools report 20–40% false-positive rates in academic contexts
   (GPTZero).
3. **Newer models and adversarial prompting defeat most markers.** GPT-4-class and Claude 3-class
   models exhibit fewer of these tells as capability and RLHF tuning improve; paraphrasing and
   evasion techniques circumvent nearly all of them.
4. **Domain-dependency is strong.** Fiction, casual writing, and conversational text diverge sharply
   from the academic/formal baseline these markers were measured against.
5. **Training-data overlap is a confound.** Humans who read and imitate the same formal corpora LLMs
   were trained on will naturally share some of the same statistical signature.

**Practical rule:** treat this taxonomy as a way to *describe patterns found in text*, never as a way
to *declare authorship*. "This text exhibits characteristics associated with LLM-generated writing"
is a defensible statement; "this is AI-written" is not.

## The taxonomy — eight categories

Each entry below is: **Definition** — what it is. **Detection type** — `LOCAL` (a single-span,
rule-matchable pattern) or `STATISTICAL` (a whole-document measure requiring aggregation).
**Confidence** — how reliable the marker is, per the seed research's own assessment, always subject
to the caveat above.

### 1. Lexical Markers
Vocabulary and word-frequency choices distinctive to LLM output.
- **Focal word excess** (LOCAL+STATISTICAL, HIGH in academic contexts) — overuse of a narrow set of
  ~15–20 words heavily represented in academic training corpora (*delve, tapestry, intricate,
  meticulous, pivotal, resonate, testament, underscore*…). ChatGPT-3.5's launch produced a measured
  30–50x spike in "delve" in PubMed abstracts (Kobak et al.), making such words strong *temporal*
  markers for a specific model generation rather than AI writing as such.
- **Narrow lexical range** (STATISTICAL, MEDIUM) — lower vocabulary diversity (higher Type-Token
  Ratio, lower MTLD) than comparable human prose; length-dependent and weak on short texts.
- **Absence of rare collocations** (LOCAL, MEDIUM) — underuse of unexpected word pairings and
  idiomatic combinations; LLM decoding favours high-frequency bigrams.

### 2. Syntactic Rhythm & Structure
- **Low burstiness** (STATISTICAL, HIGH) — unusually uniform sentence length; human prose varies
  sentence length far more (variance ~8–12 tokens² vs. AI's ~3–6). Technical documentation is a
  notable human exception.
- **Consistent clause depth** (STATISTICAL, MEDIUM) — dependency-tree complexity clusters narrowly
  (2–4 levels) rather than the wider human range (1–6); AI favours simple SVO structure over
  subordination.
- **Absence of sentence fragments** (LOCAL, MEDIUM) — training data skews toward grammatically
  complete sentences; genre-dependent (fiction and dialogue defeat this marker readily).

### 3. Statistical Distributions
- **Low perplexity** (STATISTICAL, MEDIUM — **highly domain-dependent and unreliable**) — text is
  more predictable under a reference language model. Formal/curated human writing (Wikipedia,
  abstracts) is *also* low-perplexity, which is why GPTZero flags high false-positive rates here.
- **High repetition rate / synonym-chaining** (STATISTICAL, MEDIUM) — LLMs avoid exact token
  repetition within a short window, producing unnatural synonym chains ("The data is crucial. This
  information is vital.") rather than reusing the same word as a human writer would.
- **Low semantic coherence variance** (STATISTICAL, MEDIUM) — unusually smooth topic flow between
  consecutive sentences/paragraphs; weak signal in tightly-focused single-topic writing.

### 4. Discourse Scaffolding
- **Excessive hedging language** (LOCAL+STATISTICAL, MEDIUM-HIGH in academic contexts) — elevated
  density of epistemic modals (*might, could, likely, appears to, suggests*), partly attributable to
  RLHF safety training that rewards qualified claims.
- **Discourse marker clustering** (LOCAL, HIGH) — overuse of explicit transitions (*In conclusion,
  Furthermore, It is important to note*) where practised human writers rely on implicit continuity.
- **Absence of implicit coherence** (STATISTICAL, MEDIUM) — a higher ratio of explicit-transition to
  implicit-transition sentence pairs than human writing typically shows.

### 5. Content-Level Signals
- **Factual hallucination / false citation** (LOCAL, requires external verification, LOW confidence
  standalone) — plausible but fabricated citations, statistics, or attributions. The most reliable
  detection method remains manual cross-referencing (PubMed, Google Scholar, CrossRef), not a
  textual pattern.
- **Absence of specific examples** (LOCAL, MEDIUM) — lower density of proper nouns, dates, and named
  entities than expert human writing on the same topic.
- **False balance / artificial neutrality** (LOCAL, MEDIUM) — presenting positions as equally valid
  without evaluative weighing, partly a product of RLHF's aversion to controversy.
- **Generic summarization** (LOCAL, MEDIUM) — restating rather than synthesising; weak signal in
  genres that legitimately summarise (technical docs, legal briefs).

### 6. Punctuation & Formatting
- **Absence of varied punctuation** (LOCAL, MEDIUM) — sparse exclamation points, question marks,
  semicolons, and em-dashes relative to human baselines; weak signal for minimalist human writers.
- **Serial (Oxford) comma over-consistency** (LOCAL, MEDIUM) — near-100% adherence to one comma
  style where human writers typically drift between conventions (~70–80% vs. ~85–95%).
- **Absence of contrastive punctuation** (LOCAL, MEDIUM) — dashes, parentheses, and colons used for
  emphasis are markedly rarer than in human prose.

### 7. Coherence & Reference
- **Excessive entity-name repetition** (LOCAL, HIGH) — repeating a full proper noun instead of using
  a pronoun for coreference ("John went to the store. John bought milk.") — flagged by the StoryScope narrative-feature work (arXiv 2604.03136) et
  al. as a distinguishing feature across multiple LLM architectures, though Claude-class models show
  less of it than earlier ChatGPT-class output.
- **Weak pronoun variability** (STATISTICAL, MEDIUM) — restricted pronoun set; reflexives and
  demonstratives-as-standalone-reference are rarer.
- **Impaired anaphora resolution** (LOCAL, MEDIUM, needs manual review) — pronouns with distant or
  ambiguous antecedents; also occurs in complex human academic prose.
- **Semantic repetition at paragraph boundaries** (STATISTICAL, MEDIUM) — unusually high
  paragraph-to-paragraph topical similarity.

### 8. Numerical & Naming Patterns
- **Specific numeric precision with unverifiable source** (LOCAL, requires verification, LOW
  standalone) — statistics reported to 2–3 decimal places without a citable source.
- **Low named-entity density** (STATISTICAL, MEDIUM) — fewer proper nouns per token than comparable
  human non-fiction; risk-averse human writing (customer service copy, disclaimers) shows the same
  pattern.
- **Unusual proper-noun hallucination** (LOCAL, requires verification, LOW standalone) — correctly
  formatted but non-existent names, institutions, or publications.

## LOCAL vs. STATISTICAL — the operative distinction

- **LOCAL** markers are matchable in a single span (a regex hit, a punctuation count, a named-entity
  check) and can be flagged inline.
- **STATISTICAL** markers require whole-document aggregation (variance of sentence length, embedding
  similarity between consecutive units, type-token ratio) and are meaningless below a minimum text
  length.

Several characteristics (hedging, entity-name repetition) are usable both ways — as a local count
and as a document-level density measure — and are more informative combined than as either alone.

## Emerging methodologies (noted, not endorsed as more reliable)

- **Watermarking** (Google SynthID and similar) embeds statistical markers at generation time; more
  reliable than post-hoc detection but requires access to the generation pipeline, which post-hoc
  readers of arbitrary text never have.
- **Semantic-consistency analysis** (e.g., correlation-dimension methods) is an active 2025–2026
  research direction, shown to require large samples and per-domain tuning.
- **Human expert evaluation** performs near-perfectly under controlled, non-adversarial conditions,
  but fails against paraphrasing and other evasion.

## Works Cited

**Verification note (2026-08-13).** This list was audited against the live web after several
attributions in the Phase 1 seed research proved false. **Five of five arXiv author attributions
checked were fabricated, and one arXiv ID did not exist at all.** Only entries verified against the
arXiv/publisher record are retained below. Everything unverifiable was deleted, along with any claim
resting on it alone — per Luke's instruction that unverifiable data be rejected rather than hedged.

Chakraborty, Megha, et al. "Counter Turing Test CT²: AI-Generated Text Detection Is Not as Easy as
You May Think — Introducing AI Detectability Index." *arXiv preprint*, 2310.05030, 2023,
arxiv.org/abs/2310.05030. *(Verified. The seed cited a non-existent corporate author, "Counter
Turing Test Collaboration".)*

Kobak, Dmitry, Rita González-Márquez, Emőke-Ágnes Horvát, and Jan Lause. "Delving into ChatGPT Usage
in Academic Writing Through Excess Vocabulary." *arXiv preprint*, 2406.07016, 2024,
arxiv.org/abs/2406.07016. *(Verified. The seed misattributed this to "Zhang, Yonghao, et al.")*

Ouyang, Long, et al. "Training Language Models to Follow Instructions with Human Feedback." *arXiv
preprint*, 2203.02155, 2022, arxiv.org/abs/2203.02155. *(Verified as cited.)*

Weidinger, Laura, et al. "Ethical and Social Risks of Harm from Language Models." *arXiv preprint*,
2112.04359, 2021, arxiv.org/abs/2112.04359. *(Verified as cited.)*

Wu, Junchao, Shu Yang, Runzhe Zhan, Yulin Yuan, Derek F. Wong, and Lidia S. Chao. "A Survey on
LLM-Generated Text Detection: Necessity, Methods, and Future Directions." *arXiv preprint*,
2310.14724, 2023, arxiv.org/abs/2310.14724. *(Verified. The seed misattributed this to "Su, Jiawei,
et al.")*

"StoryScope: Investigating Idiosyncrasies in AI Fiction." *arXiv preprint*, 2604.03136, 2026,
arxiv.org/abs/2604.03136. *(ID and paper verified; authors NOT verified, so none are asserted. The
seed gave both a wrong title, "Detecting Generated Fiction", and an unverified attribution to
"Gehrmann, Sebastian, et al.")*

### Deleted as unverifiable

Removed outright rather than carried with a caveat:

- **"Saying More Than They Know…", arXiv 2604.19768** — **no such paper.** The ID does not resolve,
  and the stated year (2025) contradicts the ID's own 2026-04 prefix. Fabricated.
- **"Correlation Dimension of Auto-Regressive Large Language Models", arXiv 2510.21258** —
  attribution to Kobak unverified.
- **Gao et al., "Coherence and Coherence in AI-generated Narrative Texts"** (ResearchGate 404394992)
  — unverifiable; the duplicated word in the title suggests a corrupted record.
- **Kumarage et al., *Information* 15(6), doi 10.3390/info15060307** — attribution unverified.
- **Thamm et al., *Digital Scholarship* 2(1), mdpi.com/3042-8130/2/1/2** — journal identifier and
  attribution unverified.
- **GPTZero, "Perplexity and Burstiness"** — a detection-vendor help page, not a peer-reviewed
  source; the burstiness and low-perplexity claims it supported are retained only where the survey
  literature above also carries them.

Practitioner and vendor sources consulted during Phase 1 are listed in the original seed at
`System/Widgets/Generator/_research/seed/ai-characteristics.md`. That seed file's own citation list
has NOT been audited and should be treated as unverified.
