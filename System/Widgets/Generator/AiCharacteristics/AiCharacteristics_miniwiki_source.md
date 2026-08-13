# AI Characteristics Glossary — MiniWiki source

Labelled-bold-field dialect (see `_modules/MiniWiki/build/extract_catalogue.py`).
One entry per characteristic the AiCharacteristics engine can flag, plus the
honesty caveat every entry in this glossary defers to.

---

# Read this first: what "AI characteristics" means here

**id:** caveat-honesty
**title:** Read this first — what "AI characteristics" means here
**text:** AI-text detection is unreliable. This glossary, and the widget it belongs to, report AI-associated stylistic and content characteristics that can be measured in a piece of text — never a verdict on who or what wrote it, and never a percentage framed as "probability a human wrote this." Human writing, especially academic and formal prose, regularly shows these same patterns, and newer language models are trained, deliberately or incidentally, to defeat most of these surface markers. Treat every entry below as a weak, contestable signal, not a finding of fact.
**Source:** Counter Turing Test Collaboration. "Counter Turing Test CT²: AI-Generated Text Detection Is Not as Easy as You May Think." *arXiv preprint*, 2310.05030, 2023, arxiv.org/pdf/2310.05030.

---

# Focal word excess

**id:** 1.1
**title:** Focal word excess
**text:** Overuse of a small set of stylistically marked words associated with academic corpora and AI output — delve, tapestry, intricate, pivotal, meticulous, leverage, resonate, testament, and similar. LLM training weights academic and encyclopedic corpora heavily, and those corpora themselves favour polished, formal vocabulary; the model learns to reproduce that distribution, so the same fifteen to twenty focal words recur across unrelated topics.
**Category:** Lexical Markers
**Detection type:** LOCAL + STATISTICAL
**Confidence:** HIGH (in academic contexts)
**Source:** Zhang, Yonghao, et al. "Delving into ChatGPT Usage in Academic Writing Through Excess Vocabulary." *arXiv preprint*, 2406.07016, 2024, arxiv.org/html/2406.07016v1.

---

# Low burstiness (uniform sentence length)

**id:** 2.1
**title:** Low burstiness (uniform sentence length)
**text:** Sentence lengths cluster tightly around the mean instead of alternating between short, punchy sentences and long, complex ones. A language model decodes one token at a time from a locally stable probability distribution, so once a sentence has run long its continuation distribution stays similar, and sentences settle into a narrow length band; human writers deliberately vary rhythm for emphasis and pacing.
**Category:** Syntactic Rhythm & Structure
**Detection type:** STATISTICAL
**Confidence:** HIGH (statistical)
**Source:** GPTZero. "Perplexity and Burstiness: What Is It?" *GPTZero Help Center*, 2026, gptzero.me/news/perplexity-and-burstiness-what-is-it/.

---

# High token-level repetition

**id:** 3.2
**title:** High token-level repetition
**text:** A small number of content words carry an unusually large share of a document's running words, or the same words recur mechanically rather than through varied phrasing. LLMs are penalised in training for exact local repetition, producing a distinctive counter-pattern: instead of reusing a word, they cycle through a narrow band of synonyms for the same referent, but under low-temperature decoding — or when a topic word has no easy synonym — that same word can still recur at a noticeably higher rate than typical human prose.
**Category:** Statistical Distributions
**Detection type:** STATISTICAL
**Confidence:** MEDIUM
**Source:** Wangni, Jian, et al. "The Rise of Verbal Tics in Large Language Models: A Systematic Analysis Across Frontier Models." *arXiv preprint*, 2604.19139, 2025, arxiv.org/pdf/2604.19139.

---

# Discourse marker clustering

**id:** 4.2
**title:** Discourse marker clustering
**text:** Heavy reliance on explicit transition phrases — Furthermore, Moreover, In conclusion, As a result, It is important to note — where implicit continuity would do. Curated training text marks transitions explicitly far more often than casual speech, and those phrases are themselves high-probability continuations after a topic shift; experienced human writers more often lean on semantic continuity and pronoun reference instead of naming every transition.
**Category:** Discourse Scaffolding
**Detection type:** LOCAL
**Confidence:** HIGH
**Source:** Kumarage, Chaya, et al. "Detecting the Use of ChatGPT in University Newspapers by Analyzing Stylistic Differences with Machine Learning." *Information*, vol. 15, no. 6, 2024, doi.org/10.3390/info15060307.

---

# False balance / artificial neutrality

**id:** 5.3
**title:** False balance / artificial neutrality
**text:** Both sides of a debate are presented as equally weighted without the writer actually evaluating the evidence or taking a position. RLHF safety tuning steers models away from taking contested positions, and pretraining text itself represents many sides of most debates; absent an explicit instruction to argue a thesis, the model defaults to laying out "both sides" evenly, where a human writer with genuine expertise or a stake in the topic usually weighs evidence and advances a position.
**Category:** Content-Level Signals
**Detection type:** LOCAL
**Confidence:** MEDIUM
**Source:** Thamm, Isabell, et al. "Key Features to Distinguish Between Human- and AI-Generated Texts: Perspectives from University Professors." *Digital Scholarship*, vol. 2, no. 1, 2024, mdpi.com/3042-8130/2/1/2.

---

# Absence of varied punctuation

**id:** 6.1
**title:** Absence of varied punctuation
**text:** Very low use of exclamation points, question marks, semicolons, em dashes, or parentheses relative to the number of sentences — almost everything ends in a period or comma. Training data skews toward formal, curated prose where "exotic" punctuation is comparatively rare, and low-temperature decoding keeps reaching for the safe, high-probability period or comma; human writers reach for a dash or an exclamation point for voice and emphasis far more readily.
**Category:** Punctuation & Formatting
**Detection type:** STATISTICAL
**Confidence:** MEDIUM
**Source:** Vegavid. "How to Detect AI-Generated Text: 2026 Guide to Tools & Techniques." *Vegavid Blog*, 2026, vegavid.com/blog/how-to-detect-ai-generated-text.

---

# Excessive entity-name repetition

**id:** 7.1
**title:** Excessive entity-name repetition
**text:** A named person, place, or thing is referred to again by its full name, repeatedly, where a pronoun would read naturally, rather than being replaced by "he," "she," "it," or "they." Re-using the already-in-context entity name is a safe, high-probability next-token choice, whereas a pronoun requires the kind of implicit coreference tracking that is automatic for a human reader but not explicit in next-token decoding. The widget approximates this without true named-entity recognition, so treat a flag here as a weak signal.
**Category:** Coherence & Reference
**Detection type:** LOCAL
**Confidence:** HIGH (per source); MEDIUM as approximated here
**Source:** Gehrmann, Sebastian, et al. "Detecting Generated Fiction." *arXiv preprint*, 2604.03136, 2025, arxiv.org/pdf/2604.03136.

---

# Specific numeric precision with unverifiable source

**id:** 8.1
**title:** Specific numeric precision with unverifiable source
**text:** Statistics reported to one or two decimal places, stated with confidence, and attached to no traceable source. The model has learned the surface form of precise statistics from academic and reporting sources without any live link to a facts database, so it can generate a plausible, correctly formatted number that is simply invented; humans who cite a number usually either look it up or explicitly flag it as approximate. This marker needs an external fact-check to confirm falsity — a flag here only means the number's precision and phrasing looks like this pattern.
**Category:** Numerical & Naming Patterns
**Detection type:** LOCAL
**Confidence:** LOW (requires external verification)
**Source:** Weidinger, Laura, et al. "Ethical and social risks of harm from language models." *arXiv preprint*, 2112.04359, 2021, arxiv.org/pdf/2112.04359.
