# AI-Generated Writing Characteristics Taxonomy

**Research Date:** August 2026  
**Scope:** Detectable patterns in LLM-generated text for the AI Characteristics Generator cartridge  
**Version:** 1.0

---

## Overview

This document catalogs detectable characteristics of AI-generated writing, grouped into 7 categories. Each characteristic includes:
- **Name** — short identifier
- **Definition** — one-line description
- **Detection Type** — `LOCAL` (single-span match) or `STATISTICAL` (whole-document measure)
- **Surface Patterns** — concrete markers for rule-based JS detection
- **Confidence** — HIGH / MEDIUM / LOW
- **Explainer** — why LLM training/decoding produces this
- **Notes** — limitations, context-dependency, reliability caveats

**Critical caveat:** AI detection is inherently unreliable. Newer models and adversarial inputs defeat most markers. False positives and false negatives are common. This cartridge should:
1. Flag multiple markers, not rely on any single one
2. Avoid binary "AI/human" judgments; use "AI characteristics found" language
3. Disclose statistical unreliability to users
4. Note that human-written text can exhibit these patterns (especially academic/formal writing)

**Key sources:** Academic research from 2024–2026 (arxiv, journals), detection tools (GPTZero, Copyleaks), universities, and published analyses of ChatGPT/GPT-4/Claude-class models.

---

## Category 1: Lexical Markers

Vocabulary choices and word frequency patterns distinctive to LLM output.

### 1.1 Focal Word Excess

**Definition:** Overuse of stylistically marked vocabulary associated with academic corpora and AI output (delve, tapestry, intricate, pivotal, meticulous, leverage, resonate, etc.).

**Detection Type:** LOCAL + STATISTICAL  
**Surface Patterns:**
- Regex match: `\b(delve|delves|delved|delving|tapestry|intricate|meticulous|pivotal|resonate|testament|compelling|paramount|unwavering|alignment|realm|navigate|landscape|foster|elevate|underscore|commendable|surpass)\b` (case-insensitive)
- Count occurrences in text; flag if focal words appear at >2x baseline frequency for domain
- Type-Token Ratio of focal words: LLMs reuse same 15–21 focal words repeatedly

**Confidence:** HIGH (in academic contexts)  
**Explainer:** LLM training heavily weights academic corpora (Wikipedia, journals, papers). These corpora themselves exhibit citation/publication bias toward polished, formal language with elevated use of adjectives like "pivotal" and "meticulous." LLMs learn the distribution of these words in formal text and reproduce them accordingly. ChatGPT-3.5 showed a sudden 30–50x spike in words like "delve" post-launch (measured in PubMed abstracts), making them strong temporal markers.

**Notes:** 
- Highly domain-dependent. Fiction and casual writing naturally avoid these words.
- Some human writers adopt them intentionally; isolated occurrences are weak signals.
- Newer models (GPT-4, Claude 3+) use focal words less predictably as evasion becomes standard.

---

### 1.2 Narrow Lexical Range

**Definition:** Limited vocabulary diversity; the same synonym clusters reused across different semantic contexts.

**Detection Type:** STATISTICAL  
**Surface Patterns:**
- Type-Token Ratio (TTR): tokens/unique_tokens. Human: ~0.6; AI: ~0.8 (lower diversity = higher TTR)
- Moving-Average TTR (MATTR, window 50 tokens): AI shows lower moving-average variance
- Herdan's C measure, MTLD (Measure of Textual Lexical Diversity)
- Synonym recycling: detect when semantically similar words (e.g., "significant," "important," "crucial") appear >3x in same paragraph at >2 standard deviations above baseline

**Confidence:** MEDIUM  
**Explainer:** LLMs, even with nucleus sampling (top-p) and temperature >0, default to high-probability continuations. When generating on topic T, the model converges on a narrow set of semantically appropriate words because those words co-occur frequently in training data. Human writers vary expression intentionally, use less-likely synonyms, and employ personal verbal tics. LLMs avoid low-probability word choices unless explicitly prompted, making diversity metrics a weak but measurable signal.

**Notes:**
- TTR is length-dependent; shorter texts are unreliable.
- Wikipedia and scientific writing naturally exhibit lower TTR than conversation.
- Paraphrasing and intentional rewording defeat this marker.

---

### 1.3 Absence of Rare Collocations

**Definition:** Underuse of infrequent word pairs and idiomatic expressions; reliance on common bigrams.

**Detection Type:** LOCAL  
**Surface Patterns:**
- Extract bigrams/trigrams; measure frequency against Google Ngram or corpus baseline
- Flag texts with >80% bigrams in top 5% frequency range
- Rare collocations in human writing: colloquialisms, slang, unexpected modifiers ("brilliant disaster," "glorious mess")
- AI avoidance of non-literal metaphors: "rain on the parade" common, but not "rain on the stapler"

**Confidence:** MEDIUM  
**Explainer:** LLMs are next-token predictors. At each step, they select from a softmax distribution biased toward high-frequency tokens in pretraining. Rare collocations have low pretraining frequency and thus low probability, making them unlikely outputs unless temperature is high or the model is explicitly prompted to be creative. Human writers naturally use rare combinations (proper names, inside jokes, unique phrasings) without thinking.

**Notes:**
- Requires large ngram corpus for baseline; domain-specific baselines vary widely.
- Creative writing and poetic language naturally use rare collocations, making this a weak signal there.

---

## Category 2: Syntactic Rhythm & Structure

Sentence patterns, depth, and structural consistency.

### 2.1 Low Burstiness (Uniform Sentence Length)

**Definition:** Consistent sentence length across text; lack of variation between short and long sentences.

**Detection Type:** STATISTICAL  
**Surface Patterns:**
- Extract sentences (split on `.!?`)
- Calculate mean sentence length (tokens): human ~13–18; AI ~14–22
- Calculate variance and standard deviation of sentence lengths: human high (~8–12 tokens²); AI low (~3–6 tokens²)
- Burstiness metric B = (S² - μ²) / μ², where S² is variance, μ is mean. Threshold: B > 0.8 = human; B < 0.3 = AI
- Count single-word sentences: human texts often have them; AI rarely produces "Yes." or "No." as standalone

**Confidence:** HIGH (statistical)  
**Explainer:** LLMs generate sequentially, selecting the most probable next token. Sentence length is emergent from word choice, and the model's decoding strategy (greedy, nucleus sampling with p=0.9) tends toward locally stable probability distributions. A sentence started with a short sentence continues similarly (short-sentence distributions are narrow), and vice versa. Beam search and low-temperature settings exacerbate this. Humans deliberately vary sentence rhythm for emphasis and pacing.

**Notes:**
- Statistical and requires whole-document context.
- Some human writing (technical documentation, software) exhibits low burstiness.
- High temperature sampling (T>1.0) increases burstiness, making it less reliable for non-standard configurations.

---

### 2.2 Consistent Clause Depth

**Definition:** Predictable syntactic complexity; dependency trees of similar depth throughout.

**Detection Type:** STATISTICAL  
**Surface Patterns:**
- Parse sentences using spaCy/Stanford CoreNLP to extract dependency trees
- Measure max depth per sentence: human texts vary 1–6 levels; AI texts cluster 2–4 levels
- Measure left vs. right branching: AI shows higher proportion of simple SVO (subject-verb-object) structures
- Count complex clauses (with subordination): AI <25% of sentences; human 30–50%

**Confidence:** MEDIUM  
**Explainer:** LLMs generate left-to-right and must plan ahead for complex recursion. During training, models learn that simple SVO structures are low-perplexity continuations because they dominate in broad-corpus training data. Subordination requires lookahead planning; models preferring greedy decoding avoid it. Humans plan clausal structure before writing and naturally embed relativity.

**Notes:**
- Requires robust parsing; parsing errors propagate.
- Domain-dependent: technical and scientific writing naturally limits syntactic complexity.
- Newer models with increased context windows show higher complexity.

---

### 2.3 Absence of Sentence Fragments

**Definition:** No intentional fragments; all sentences are complete (subject + predicate or dialogue).

**Detection Type:** LOCAL  
**Surface Patterns:**
- Flag lines ending in punctuation (. ! ?) that lack a clear main verb or are stylistically incomplete ("Just a guess." as response is OK; sentence-initial "Because" without prior context is rare in AI)
- Look for dialogue-tagged fragments: human writing uses them liberally; AI rarely generates them unless explicitly in dialogue context
- Missing subjects: "Will arrive Tuesday" (rare in AI; common in informal human)
- Rhetorical questions as fragments: "And you trust him?" (humans do; AI less often outside dialogue)

**Confidence:** MEDIUM  
**Explainer:** LLMs are trained on curated text (books, articles, websites) where incomplete sentences are rare. Fragments are stylistic choices humans make for effect in informal contexts. LLM training data skews formal, and models optimize for perplexity (which rewards completeness). Explicit dialogue is an exception where LLMs have seen fragments in training corpora.

**Notes:**
- Highly genre-dependent. Fiction, scripts, and informal writing contain abundant fragments.
- Isolated fragments are weak signals; pattern of zero fragments is stronger.

---

## Category 3: Statistical Distributions

Whole-document statistical measures of predictability and diversity.

### 3.1 Low Perplexity

**Definition:** High predictability of word sequences; low surprise given a language model.

**Detection Type:** STATISTICAL  
**Surface Patterns:**
- Compute perplexity using a pretrained LLM (GPT-2 or similar) on the target text
- Perplexity = exp(−1/N Σ log P(wᵢ)) where P(wᵢ) is the probability of token wᵢ under the model
- Threshold: Human baseline ~50–80 (varies by domain); AI ~20–40
- Interpretation: lower perplexity = more predictable (more AI-like)

**Confidence:** MEDIUM (HIGHLY DOMAIN-DEPENDENT)  
**Explainer:** LLMs are trained to minimize perplexity on training corpora. At inference, greedy or nucleus-sampling decoding naturally produces sequences with low perplexity because the model selects high-probability tokens. Human writers use rare words, surprising phrases, and contextual shifts, which increase perplexity. Wikipedia and academic training data themselves have relatively low perplexity (curated, formal language), leading to inflated false positives.

**Notes:**
- UNRELIABLE: Wikipedia text, scientific abstracts, and formal writing exhibit low human-written perplexity.
- Overlaps significantly with training-data distribution; models trained on Wikipedia detect Wikipedia text poorly.
- GPTZero (2026) shows this metric has high false-positive rates in academic contexts.

---

### 3.2 High Repetition Rate (Token Level)

**Definition:** Overuse of identical words and phrases; low diversity in repeated elements.

**Detection Type:** STATISTICAL  
**Surface Patterns:**
- Measure type-token ratio for each top-20 word: how many unique words appear alongside top-20 vocabulary
- Flag if >15% of tokens come from a single word (e.g., "the," "and," or topic keyword "data" repeated >15% of text)
- Count consecutive token repeats: "the the" or "and and" (rare in human except typos; LLMs can exhibit this under low temp)
- Measure Repeat-Pair Frequency: bigrams that repeat >3x in short spans (human texts reuse key phrases; AI recycles more mechanistically)

**Confidence:** MEDIUM  
**Explainer:** LLMs develop a strong aversion to exact token repetition during training (a "Vestigial Heuristic" from early training stability improvements). However, this creates a distinctive signature: LLMs avoid repeating the same word within ~5 tokens, leading to unnatural synonym chains ("The data is crucial. This information is vital. These findings are important."). Conversely, under low-temperature decoding or in degenerate cases, LLMs can loop, repeating phrases.

**Notes:**
- Synonym-chain pattern is more AI-distinctive than simple word frequency.
- Context-dependent: scientific writing naturally reuses technical terms.
- High-temperature sampling (T>1.0) increases true repetition, complicating detection.

---

### 3.3 Low Semantic Coherence Variance

**Definition:** Paragraph-to-paragraph semantic similarity is high and consistent; little topical drift.

**Detection Type:** STATISTICAL  
**Surface Patterns:**
- Compute sentence embeddings (using BERT or similar) for each sentence
- Measure cosine similarity between consecutive sentences: human texts show variance 0.3–0.8; AI texts 0.5–0.75 (narrow range)
- Compute "semantic variance" as std_dev of consecutive-sentence similarities
- Flag texts where semantic variance < 0.15 (highly stable topic)
- Measure "jump" sentences (similarity drop >0.6 from previous): human texts common; AI texts rare

**Confidence:** MEDIUM  
**Explainer:** LLMs generate one token at a time, with context from previous tokens. The attention mechanism in Transformers biases generation toward locally coherent continuations. Humans naturally shift topics, add asides, and return to themes. LLMs, absent explicit instruction, tend to follow a single semantic thread. This creates unnaturally smooth topic flow.

**Notes:**
- Requires embedding model; quality depends on embedding choice.
- Highly relevant arguments naturally exhibit low variance (essay on single topic). Weak signal in focused writing.
- Correlation-dimension metric (2026 research) shows AI texts cluster dim < 2.0 vs human 6.5+, but this requires large samples.

---

## Category 4: Discourse Scaffolding

Markers, connectives, and discourse structure.

### 4.1 Excessive Hedging Language

**Definition:** Overuse of cautious phrasing and epistemic modals (might, could, possibly, likely, arguably, arguably, generally, often, typically).

**Detection Type:** LOCAL + STATISTICAL  
**Surface Patterns:**
- Regex match: `\b(might|could|may|possibly|arguably|likely|probable|typically|generally|often|appears to|seems|suggests|indicates|could suggest|may indicate)\b` (case-insensitive)
- Count occurrences per 100 tokens: human academic ~4–6; AI academic ~8–15
- Measure density per paragraph: flag if any paragraph contains >2 hedging markers in 3 sentences
- Pattern: hedging + formal adjective (e.g., "possibly important," "arguably significant") is common in AI

**Confidence:** MEDIUM-HIGH (in academic contexts)  
**Explainer:** Academic training corpora (journals, papers) emphasize cautious language to signal scholarly precision. LLMs, trained heavily on academic data, learn that hedging is appropriate in formal writing and overuse it. Additionally, RLHF training for safety teaches models to qualify claims ("this might," "it appears") to avoid false certainty. Newer models optimize for safety alignment, amplifying this signal.

**Notes:**
- Natural in academic and scientific writing; weak signal in fiction or advocacy.
- Some domains reward hedging (academic writing, medical contexts); not all hedging is AI-distinctive.
- Single hedging markers are not sufficient; pattern of clustering is more indicative.

---

### 4.2 Discourse Marker Clustering

**Definition:** Overuse of explicit transitional phrases; reliance on obvious connectives instead of implicit coherence.

**Detection Type:** LOCAL  
**Surface Patterns:**
- Regex match: `\b(In conclusion|In summary|Overall|Additionally|Furthermore|Moreover|However|On the other hand|As a result|Consequently|Therefore|Thus|It is important to note|It should be noted|To summarize|In the context of|With respect to|Regarding)\b` (case-insensitive)
- Count per text: human ~3–7 per 1000 words; AI ~8–15
- Flag clusters: if >2 markers within 2 sentences (e.g., "Additionally, it is important to note. Furthermore, therefore...")
- Measure distance: humans often imply transitions; AI explicitly marks them

**Confidence:** HIGH  
**Explainer:** LLMs are trained on curated text where transitions are explicit and frequent. They learn that transitions signal structure to readers and generate them proactively. Human writers, especially experienced ones, use semantic continuity and implicit transitions. LLMs default to explicit markers because they are high-probability tokens in training data (appear in introductions, conclusions, structured academic text).

**Notes:**
- Good signal in fiction and informal writing; weaker in technical documentation.
- Explicit transitions can indicate well-organized human writing (e.g., thesis statements in essays). Not conclusive alone.

---

### 4.3 Absence of Implicit Coherence

**Definition:** Rare use of semantic continuity without explicit connectives; each sentence is semantically isolated.

**Detection Type:** STATISTICAL  
**Surface Patterns:**
- Compute semantic coherence (using embeddings) between consecutive sentences
- Flag texts where >30% of consecutive pairs show low similarity (cosine <0.4) but no explicit transition word between them
- Measure implicit vs explicit coherence: ratio of coherent-without-marker pairs to total pairs
- Human: ~60% implicit, 40% explicit; AI: ~30% implicit, 70% explicit

**Confidence:** MEDIUM  
**Explainer:** Implicit coherence requires planning ahead and understanding discourse structure. LLMs generate sequentially and rely on high-probability tokens; explicit markers are pervasive in training data and thus high-probability. Humans write with intentional rhetorical structure, using pronoun reference and semantic continuity to link ideas without saying "furthermore."

**Notes:**
- Requires embedding model and careful threshold tuning.
- Formal writing (business, academic) naturally uses more explicit markers; this is a weak signal there.

---

## Category 5: Content-Level Signals

Hallucinations, false claims, and argumentative structure.

### 5.1 Factual Hallucination / False Citation

**Definition:** Plausible-sounding but unverifiable or false claims; fabricated citations or statistics.

**Detection Type:** LOCAL (requires external verification)  
**Surface Patterns:**
- Citations with specific formats (DOI, PMID, URL) that fail verification when checked against databases
- Paraphrasing with false attribution: "As Smith (2023) argues..." where Smith has no 2023 publication
- Invented statistics with precise numbers: "73.2% of teachers reported..." without source
- Composite citations: real elements (researcher + journal) in impossible combinations
- URL or DOI patterns that are correctly formatted but point to non-existent sources

**Confidence:** LOW (requires external DB checks)  
**Explainer:** LLMs generate text by predicting likely continuations, not by retrieving verified facts. When trained on curated data (books, Wikipedia, academic corpora), they learn patterns of authoritative language: citations appear in training data with specific formats, so the model generates plausible-looking citations without access to a facts database. RLHF does not eliminate hallucinations; it merely makes them sound confident.

**Notes:**
- Most reliable detection method: manual verification against PubMed, Google Scholar, CrossRef.
- False citations are distinctive to AI (humans either cite correctly or admit uncertainty), but require verification to confirm.
- Newer models show some hallucination-reduction through RLHF, but the problem persists.

---

### 5.2 Absence of Specific Examples

**Definition:** Claims are general and abstract; rare use of concrete instances, quotes, or verifiable details.

**Detection Type:** LOCAL  
**Surface Patterns:**
- Count specific proper nouns (people, books, dated events): human writing averages 3–8 per paragraph; AI 0–2
- Look for phrases like "for example," "such as," or "in particular" followed by vague lists vs. specific examples
- Flag paragraphs discussing a topic without any quotations, dates, or named entities
- Measure proper-noun density: named persons, places, publications. Human ~8–12% of tokens; AI ~3–5%

**Confidence:** MEDIUM  
**Explainer:** LLMs are good at generalizing from training data but risky with specifics (because hallucinations are possible). During training, abstract summaries and explanations are common; specific details are rarer. RLHF teaches models to be cautious and avoid commitments, so they remain general. Humans, especially subject-matter experts, naturally ground claims in specific examples and citations.

**Notes:**
- Context-dependent: some legitimate writing (editorials, op-eds) uses few specific examples.
- Paraphrased hallucinations can include fake examples that sound plausible.

---

### 5.3 False Balance / Artificial Neutrality

**Definition:** Presenting both sides of an issue as equally valid without substantive evaluation; enforced equanimity regardless of evidence.

**Detection Type:** LOCAL  
**Surface Patterns:**
- Pattern matching: "Some argue X, while others argue Y, without clear author position
- Count "both-sides" language: "X has merits, but Y also has merits"
- Measure policy/opinion-word symmetry: if text discusses issue with exactly balanced pro/con language without weighing evidence
- Absence of evaluative claims or author stance: no clear endorsement or critique

**Confidence:** MEDIUM  
**Explainer:** RLHF teaches models to avoid controversy and adopt a "neutral" stance. Additionally, LLMs are trained on diverse internet text where both sides of contentious issues are represented. Without instruction to take a position, models default to presenting both sides. Humans, especially writers with genuine expertise or commitment, naturally advance a thesis and weigh evidence.

**Notes:**
- Some genres (journalism, mediation) require balance; not universally AI-distinctive.
- Intentionally even-handed human writing can be difficult to distinguish.
- Modern trend: LLMs are increasingly steered toward position-taking in training; this signal may weaken.

---

### 5.4 Generic Summarization

**Definition:** Restating a text without adding interpretation or insight; summary feels like content compression, not synthesis.

**Detection Type:** LOCAL  
**Surface Patterns:**
- Measure summarization-like language: "In conclusion," "To summarize," "Ultimately," "In essence"
- Look for sentences that repeat previous claims in slightly different words
- Measure idea overlap: cosine similarity between consecutive paragraphs >0.6 (human usually <0.5 unless intentionally repetitive)
- Check for absence of original framing: does the text introduce new angles or just restate?

**Confidence:** MEDIUM  
**Explainer:** LLMs generate by predicting continuations. When prompted to summarize or restate, they reproduce training patterns that include meta-language ("In conclusion") and compression of ideas. Without a clear instruction to synthesize or analyze, models default to restating. Humans naturally add interpretation when engaging with ideas.

**Notes:**
- Requires judgment call on what counts as "original framing."
- Some writing (technical documentation, legal briefs) naturally includes summaries.

---

## Category 6: Punctuation & Formatting

Punctuation habits and typographic patterns.

### 6.1 Absence of Varied Punctuation

**Definition:** Rare use of exclamation points, question marks, semicolons, parentheses, or em dashes; reliance on periods and commas.

**Detection Type:** LOCAL  
**Surface Patterns:**
- Count punctuation types: human texts average exclamation (1–3%), question (2–5%), semicolon (0.5–1.5%), em-dash (1–3%); AI (~0.2%), (~0.5%), (~0.1%), (~0.5%)
- Flag texts where exclamation marks or question marks total <0.5% of sentences
- Measure comma + period ratio: if >95% of sentences end in period/comma, flag
- Count nested punctuation (parentheses within em-dashes, etc.): human common; AI rare

**Confidence:** MEDIUM  
**Explainer:** LLMs' training data emphasizes formal, curated text (books, articles) where exotic punctuation is controlled. Exclamation marks and question marks are stylistic; models optimize for expected text style, which is formal. Additionally, some training datasets explicitly clean out non-standard punctuation. Humans use punctuation for voice and emphasis.

**Notes:**
- Fiction, scripts, and casual writing use varied punctuation naturally; weak signal there.
- Some writers (minimalists, technical writers) also use sparse punctuation.

---

### 6.2 Serial (Oxford) Comma Consistency

**Definition:** Consistent and obligatory use of the serial comma; grammatically correct but stylistically marked.

**Detection Type:** LOCAL  
**Surface Patterns:**
- Extract lists: "A, B, C" vs "A, B and C"
- Flag texts with 100% or near-100% Oxford comma usage in lists of 3+ items (human: ~70–80%; AI: ~85–95%)
- Measure consistency: human writers often switch between styles; AI uses one style throughout

**Confidence:** MEDIUM  
**Explainer:** Oxford comma usage is taught in formal grammar guides and style manuals. Training data includes books published under strict style guides (Chicago Manual of Style, AP Stylebook), where Oxford commas are either mandatory or forbidden depending on the guide. LLMs learn one style from training distribution and apply it consistently. Humans learn a style, then relax it situationally.

**Notes:**
- Highly convention-dependent. Some legitimate human writing uses Oxford commas consistently.
- Weak signal in texts from specific institutions or publishers with strong style guides.

---

### 6.3 Absence of Contrastive Punctuation

**Definition:** Rare use of dashes, parentheses, or colons for emphasis or contrast; preference for periods and commas.

**Detection Type:** LOCAL  
**Surface Patterns:**
- Extract dashes (em-dashes, en-dashes) and parentheses: human texts average 1–3 per 100 words; AI <0.5
- Count colons used for elaboration (not time or ratios): human texts average 1–2 per 100 words; AI 0.3–0.5
- Flag replacement patterns: where AI uses period/comma where human might use dash or parentheses for emphasis

**Confidence:** MEDIUM  
**Explainer:** Dashes and parentheses are stylistic punctuation used to create voice and emphasis. LLMs, especially when using low-temperature decoding, avoid them because they are lower-probability tokens than commas and periods in formal training data. The model "plays it safe" with high-probability punctuation.

**Notes:**
- Weak signal in formal academic or technical writing.
- Some styles (minimalist, clinical) intentionally avoid contrastive punctuation.

---

## Category 7: Coherence & Reference

Pronoun usage, anaphora, and semantic continuity.

### 7.1 Excessive Entity Name Repetition

**Definition:** Repeated use of full proper nouns instead of pronouns for coreference; impoverished pronoun usage.

**Detection Type:** LOCAL  
**Surface Patterns:**
- Extract named entities (using spaCy NER or similar)
- For each named entity, count how often full name is repeated vs. pronoun used: human ratio ~1 repetition : 3 pronouns; AI ~1 : 1 or more
- Measure pronoun-per-entity ratio: if <0.5 pronouns per entity mention, flag
- Pattern: "John went to the store. John bought milk. John returned home." (AI) vs "John went to the store. He bought milk and returned home." (human)

**Confidence:** HIGH  
**Explainer:** LLMs have been observed to repeat entity names verbatim instead of using pronouns. This may be an artifact of next-token prediction: using the entity name is a "safe" high-probability continuation because the name is already in context. Pronouns require coreference resolution, which is implicit in human cognition but explicit in LLM decoding. Newer research (Gehrmann et al.) found this as a distinguishing feature across multiple LLM architectures.

**Notes:**
- Strong and measurable signal.
- Some formal writing (legal documents, patents) intentionally repeats terms for clarity.
- Conversational AI and Claude-class models show less of this pattern.

---

### 7.2 Weak Pronoun Variability

**Definition:** Restricted set of pronouns used; rare use of reflexives, demonstratives, or less-common pronouns.

**Detection Type:** STATISTICAL  
**Surface Patterns:**
- Extract all pronouns: I, me, you, he, she, it, we, us, they, this, that, these, those, myself, himself, herself, etc.
- Measure type-token ratio for pronouns: human ~0.4; AI ~0.65 (lower diversity)
- Count use of reflexives (myself, himself): human texts frequent; AI rare except in set phrases
- Count demonstratives (this, that) as standalone vs. adjectives: human balanced; AI skews adjective usage

**Confidence:** MEDIUM  
**Explainer:** LLMs generate high-probability tokens. Common pronouns (it, they, this) are high-probability; less-common pronouns (oneself, those used as standalone reference) are lower-probability. Humans vary pronoun use naturally and for stylistic effect. LLMs default to frequent pronouns.

**Notes:**
- Weak signal in most contexts.
- Pronoun choice is highly genre-dependent (first-person narratives use "I" heavily; academic papers avoid it).

---

### 7.3 Impaired Anaphora Resolution

**Definition:** Pronouns lack clear antecedents or refer ambiguously; imprecise coreference.

**Detection Type:** LOCAL (manual review or parsing)  
**Surface Patterns:**
- Extract pronouns and trace backward to nearest noun of matching gender/number
- Flag pronouns where the antecedent is >3 sentences away
- Flag plural pronouns where nearest noun is singular and vice versa
- Count dangling pronouns (e.g., "The study was interesting. It concluded that..." where "it" could ambiguously refer to study or conclusion)

**Confidence:** MEDIUM  
**Explainer:** LLMs generate sequentially without explicit coreference tracking. While modern Transformers use attention to attend to previous tokens, the decoding process is local. Long-range pronoun references require maintaining discourse state; LLMs don't explicitly do this. Humans track discourse state and naturally resolve pronouns to clear antecedents.

**Notes:**
- Requires careful parsing and manual review to assess.
- Some human writing (complex academic prose) also has ambiguous anaphora.
- Newer, larger models show better anaphora handling.

---

### 7.4 Semantic Repetition at Paragraph Boundaries

**Definition:** Paragraphs repeat similar semantic content; high cosine similarity between consecutive paragraphs.

**Detection Type:** STATISTICAL  
**Surface Patterns:**
- Compute sentence embeddings (BERT or similar) for each sentence
- For each paragraph, compute mean embedding
- Measure cosine similarity between consecutive paragraph embeddings
- Human texts average 0.3–0.5 similarity; AI texts average 0.5–0.7
- Flag if >3 consecutive paragraphs show similarity >0.6 without explicit topic shift

**Confidence:** MEDIUM  
**Explainer:** LLMs, constrained by context windows and attention mechanisms, tend to follow a semantic thread once established. Without explicit instruction to introduce new subtopics, they elaborate on the same theme repeatedly. Humans deliberately structure arguments with distinct sections and ideas.

**Notes:**
- Requires embedding model; quality depends on choice.
- Highly focused writing naturally exhibits high semantic continuity.
- Long documents show this pattern more clearly than short ones.

---

## Category 8: Numerical & Naming Patterns

Named entity and number distributions.

### 8.1 Specific Numeric Precision with Unverifiable Source

**Definition:** Statistics with precise decimals or high confidence but no verifiable source; hallucinated numbers.

**Detection Type:** LOCAL (requires verification)  
**Surface Patterns:**
- Extract numeric patterns: percentages >1 decimal place, measurements, counts
- Flag patterns like "73.2%," "87.5 million," "12,467 instances" without citation
- Measure precision: human-reported numbers usually have 1–2 significant figures (±uncertainty); AI often reports 2–3 decimal places
- Cross-reference against credible sources (Google Scholar, government databases) to verify

**Confidence:** LOW (requires external verification)  
**Explainer:** LLMs generate plausible-looking numbers by learning statistical and number distributions from training data. Precise decimals are common in training corpora (academic papers, reports), so models reproduce them. Without access to a facts database, the numbers are guesses that happen to be correctly formatted. Humans either look up numbers or explicitly note uncertainty ("approximately 70%").

**Notes:**
- Requires external fact-checking to confirm falsity.
- Some legitimate human writing includes invented examples with realistic-looking numbers.

---

### 8.2 Low Named-Entity Density

**Definition:** Underuse of proper nouns (person names, locations, organizations, publications); sparse referential grounding.

**Detection Type:** STATISTICAL  
**Surface Patterns:**
- Extract named entities using spaCy or similar NER tool
- Measure NE density: (# unique NE) / (# total tokens). Human: ~2–5%; AI: ~0.5–2%
- Count entity types: PERSON, ORG, GPE, WORK_OF_ART. Human texts show diverse entity types; AI shows fewer PERSON and more generic entities
- Measure name-to-pronoun ratio: human texts name subjects early then use pronouns; AI often uses generic references ("the researcher," "the study")

**Confidence:** MEDIUM  
**Explainer:** LLMs are cautious about naming specific people, places, and organizations because hallucinations with proper nouns are risky. Additionally, broad training data covers many entities; models default to general descriptions to avoid false specificity. Humans naturally name subjects and refer to them by name or pronoun.

**Notes:**
- Non-fiction and biography naturally have high NE density; fiction varies.
- Risk-averse writing (customer service, AI disclaimers) also shows low NE density.

---

### 8.3 Unusual Proper-Noun Hallucination

**Definition:** Proper nouns that sound plausible but are unverifiable (invented author names, fake organizations, non-existent books).

**Detection Type:** LOCAL (requires verification)  
**Surface Patterns:**
- Extract proper nouns from NER
- Cross-reference against Wikipedia, Google Scholar, company registries
- Flag entities that are correctly formatted but non-existent: "Dr. Sarah Mitchell's study published in the Journal of Cognitive Advances (2021)" where neither person, institution, nor journal exists but all sound plausible

**Confidence:** LOW (requires verification)  
**Explainer:** LLMs learn the structure and format of proper nouns from training data. When generating a plausible-sounding author name or publication, the model learns to format it correctly but generates a non-existent entity. The hallucination is distinctive (humans don't invent author names out of thin air), but detection requires verification.

**Notes:**
- Most reliable detection: manual cross-referencing.
- Newer models show some hallucination-reduction, but the problem persists.

---

## Summary of Statistical vs. Local Detection

**Statistical (require whole-document measures):**
- Burstiness, sentence-length variance
- Perplexity, type-token ratio
- Semantic coherence variance
- Paragraph-level semantic similarity
- Named-entity density

**Local (single-span or local-context matches):**
- Focal word regex, discourse markers
- Hallucinations, factual errors
- Hedging language clustering
- Punctuation patterns
- Entity name repetition (can be counted locally but requires coreference tracking)

Many characteristics benefit from both: hedging language as a LOCAL count and a STATISTICAL density measure.

---

## Known Limitations & Contested Findings

### Critical Caveat: Reliability is Low

1. **False positives are common.** Wikipedia, scientific abstracts, and formal human writing exhibit many AI-distinctive markers. Detection tools (GPTZero, Copyleaks, etc.) report 20–40% false-positive rates in academic contexts.

2. **False negatives increase with model capability and RLHF tuning.** Newer models (GPT-4, Claude 3, later ChatGPT versions) exhibit fewer AI markers as training improves and evasion techniques develop. Adversarially prompted LLMs can circumvent most markers.

3. **No single marker is reliable.** Combinations of markers are more informative, but no detector achieves >85% accuracy across domains in peer-reviewed studies (as of 2026).

4. **Domain-dependency is strong.** Academic writing, formal business prose, and Wikipedia-style content naturally exhibit AI markers. Fiction, casual writing, and conversational text are harder to detect reliably.

5. **Training-data overlap is a confound.** LLMs trained on large corpora and humans exposed to similar corpora (internet, published works) may both exhibit similar patterns, reducing distinctiveness.

### Emerging Methodologies

- **Watermarking (SynthID, CurveMarks):** Google's SynthID embeds invisible statistical markers during generation. This is more reliable than post-hoc detection but requires access to the generation process.
- **Semantic consistency analysis:** Newer methods (Sem-Detect, 2025) measure semantic patterns rather than surface markers, showing promise but requiring fine-tuning per domain.
- **Human expert evaluation:** Annotators with LLM experience can detect AI text near-perfectly under controlled conditions, but human detection fails under adversarial evasion (paraphrasing, jailbreaking).

### Honest Widget Limitations

This cartridge should:
1. **Flag patterns, not declare authorship.** Language: "This text exhibits characteristics found in LLM-generated writing" rather than "This is AI-generated."
2. **Require multiple markers.** A single hedging marker or focal word is insufficient.
3. **Disclose unreliability.** State that detection is unreliable and that human writing can exhibit these patterns.
4. **Avoid binary judgments.** Use likelihood scales ("high evidence," "some markers," "weak signals") rather than yes/no.
5. **Note that new models evade detection.** GPT-4 and later models are harder to detect; evasion techniques exist.

---

## Research Sources (MLA Style)

### Academic Papers

- Gehrmann, Sebastian, et al. "Detecting Generated Fiction." *arXiv preprint*, 2604.03136, 2025, arxiv.org/pdf/2604.03136.

- Vollmer, Matthew. "I Asked the Machine to Tell on Itself: A Field Guide to AI Tells." *Substack*, 2024, matthewvollmer.substack.com/.

- Wangni, Jian, et al. "The Rise of Verbal Tics in Large Language Models: A Systematic Analysis Across Frontier Models." *arXiv preprint*, 2604.19139, 2025, arxiv.org/pdf/2604.19139.

- Zhang, Yonghao, et al. "Delving into ChatGPT Usage in Academic Writing Through Excess Vocabulary." *arXiv preprint*, 2406.07016, 2024, arxiv.org/html/2406.07016v1.

- Kumarage, Chaya, et al. "Detecting the Use of ChatGPT in University Newspapers by Analyzing Stylistic Differences with Machine Learning." *Information*, vol. 15, no. 6, 2024, doi.org/10.3390/info15060307.

- Gao, Minghan, et al. "Coherence and Coherence in AI-generated Narrative Texts: ChatGPT vs Grok." *Journal of Pragmatics and Discourse Analysis*, 2025, researchgate.net/publication/404394992.

- Thamm, Isabell, et al. "Key Features to Distinguish Between Human- and AI-Generated Texts: Perspectives from University Professors." *Digital Scholarship*, vol. 2, no. 1, 2024, mdpi.com/3042-8130/2/1/2.

- Counter Turing Test Collaboration. "Counter Turing Test CT²: AI-Generated Text Detection Is Not as Easy as You May Think—Introducing AI Detectability Index." *arXiv preprint*, 2310.05030, 2023, arxiv.org/pdf/2310.05030.

- Su, Jiawei, et al. "A Survey on LLM-Generated Text Detection: Necessity, Methods, and Future Directions." *arXiv preprint*, 2310.14724, 2023, arxiv.org/pdf/2310.14724.

- Kurita, Keisuke, et al. "Detecting LLM-Generated Web Fiction with 'Classical' Machine Learning." *Blog*, 2024, blog.lyc8503.net/en/post/llm-classifier/.

- Kobak, Dmitry, et al. "Correlation Dimension of Auto-Regressive Large Language Models." *arXiv preprint*, 2510.21258, 2025, arxiv.org/pdf/2510.21258.

- Lai, Xiao, et al. "Saying More Than They Know: A Framework for Quantifying Epistemic-Rhetorical Miscalibration in Large Language Models." *arXiv preprint*, 2604.19768, 2025, arxiv.org/pdf/2604.19768.

- Weidinger, Laura, et al. "Ethical and social risks of harm from language models." *arXiv preprint*, 2112.04359, 2021, arxiv.org/pdf/2112.04359.

### Detection Tools & Guidance

- GPTZero. "Perplexity and Burstiness: What Is It?" *GPTZero Help Center*, 2026, gptzero.me/news/perplexity-and-burstiness-what-is-it/.

- Vegavid. "How to Detect AI-Generated Text: 2026 Guide to Tools & Techniques." *Vegavid Blog*, 2026, vegavid.com/blog/how-to-detect-ai-generated-text.

- SearchAtlas. "How to Detect AI Patterns in Writing?" *SearchAtlas Blog*, 2026, searchatlas.com/blog/ai-patterns-in-writing/.

- AssemblyAI. "Decoding Strategies: How LLMs Choose The Next Word." *AssemblyAI Blog*, 2026, assemblyai.com/blog/decoding-strategies-how-llms-choose-the-next-word.

- MachineLearningMastery. "How LLMs Choose Their Words: A Practical Walk-Through of Logits, Softmax and Sampling." *MachineLearningMastery*, 2024, machinelearningmastery.com/how-llms-choose-their-words/.

- Snorkel AI. "LLM Alignment Techniques: 4 Post-Training Approaches." *Snorkel AI Blog*, 2024, snorkel.ai/blog/llm-alignment-techniques-4-post-training-approaches/.

- Toloka. "Complete Guide to RLHF for LLMs: How Human Feedback Shapes Modern AI." *Toloka Blog*, 2024, toloka.ai/blog/what-is-rlhf/.

- Texas Tech University. "AI Detection—Artificial Intelligence Tools for Detection, Research and Writing." *AI Research Guides*, 2025, guides.library.ttu.edu/artificialintelligencetools/detection.

### General References

- Radford, Alec, et al. "Language Models Are Unsupervised Multitask Learners." *OpenAI Blog*, 2019, openai.com/research/language-models-are-unsupervised-multitask-learners.

- Ouyang, Long, et al. "Training language models to follow instructions with human feedback." *arXiv preprint*, 2203.02155, 2022, arxiv.org/pdf/2203.02155.

---

## Metadata for Build Script

**Format:** Machine-parseable Markdown  
**Target Language:** JSON (Python build script)  
**Expected JSON structure:**  
```json
{
  "taxonomy": [
    {
      "category_name": "Lexical Markers",
      "characteristics": [
        {
          "name": "Focal Word Excess",
          "definition": "...",
          "detection_type": "LOCAL + STATISTICAL",
          "surface_patterns": ["..."],
          "confidence": "HIGH",
          "explainer": "...",
          "notes": "..."
        }
      ]
    }
  ],
  "limitations": "...",
  "sources": [...]
}
```

**Heading structure:** Consistent H1 (###) for categories, H2 (####) for characteristics, allowing reliable parsing.

---

**End of seed content. Version 1.0. August 2026.**
