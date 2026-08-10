---
type: content-source
title: "Greek and Hebrew — Parser Content Source"
description: "Draft content source for the Greek & Hebrew biblical-language parser aide. Proposes alphabet, vocabulary, paradigms, and parsing-code schemas for both Koine Greek and Biblical Hebrew."
status: draft
provenance: >
  Sourced from standard Koine Greek and Biblical Hebrew reference grammars and lexicons
  (open-source / public-domain where possible). Key references include Mounce's _Basics of
  Biblical Greek_, Wenham's _The Elements of New Testament Greek_, Pratico & Van Pelt's
  _Basics of Biblical Hebrew_, Seow's _A Grammar for Biblical Hebrew_, and public-domain
  lexical data from Strong's Exhaustive Concordance. The parser logic and content schema
  remain undefined per Parser_guide.md §2.1 and §2.4 — this file is a scope proposal.
---

> **STATUS: DRAFT — pending Luke review**

> **[PROPOSED SCOPE — confirm before treating as final]**

# Greek and Hebrew — Parser Content Source

## 1. Purpose and Provenance

### 1.1 What this file is

This file proposes the content scope and reference data for a browser-based biblical-language
parser aide within the nine-aide Teaching framework (Parser_guide.md §2.1). It defines the
Greek and Hebrew alphabets, top-frequency vocabulary, basic nominal and verbal paradigms, and
parsing-code conventions that a parser engine would use to tokenize, gloss, and parse Koine
Greek and Biblical Hebrew input text.

### 1.2 What this file is not

- **Not** a full lexicon or exhaustive grammar.
- **Not** a syntax engine, diagrammer, or discourse-analysis tool.
- **Not** authoritative for textual criticism, manuscript variants, or diachronic linguistics.
- **Not** a replacement for a human with training in the biblical languages.

### 1.3 Provenance

All grammatical and lexical data is drawn from standard, widely-cited reference works for
Koine Greek and Biblical Hebrew. Where possible, data derives from public-domain sources
(e.g. Strong's numbering, public-domain lexicons) or is independently verifiable across
multiple standard grammars. No single copyrighted work is reproduced verbatim — tables and
paradigms are independently formatted and represent well-established linguistic facts of
these languages.

### 1.4 Parser status

Per Parser_guide.md §2.1, the Greek & Hebrew parser logic is marked "*(to be specified)*"
with no assigned tier. Per §2.4, both the parser logic and Explainer format are undefined.
Per §2.3, no Explainer format has been proposed. This file therefore proposes:

- **Tier A (proposed):** identify Greek or Hebrew words in mixed/transliterated text, provide
  a basic English gloss, and supply core morphological parsing (person, number, tense, voice,
  mood for verbs; gender, number, case for nouns).
- **Tier B (proposed):** full morphological and syntactic analysis; identify clause
  boundaries, phrase relationships, and discourse features.

---

## PART A — Koine Greek

## 2. The Greek Alphabet

### 2.1 Letter table

Each letter is listed with its upper-case and lower-case form, traditional Greek name,
standard academic transliteration, and Erasmian pronunciation guide.

| # | Upper | Lower | Name | Transliteration | Pronunciation (Erasmian) |
|:--|:------|:------|:-----|:----------------|:--------------------------|
| 1 | Α | α | alpha | a | _a_ as in f**a**ther |
| 2 | Β | β | beta | b | _b_ as in **b**ook |
| 3 | Γ | γ | gamma | g | _g_ as in **g**o (never soft) |
| 4 | Δ | δ | delta | d | _d_ as in **d**og |
| 5 | Ε | ε | epsilon | e | _e_ as in m**e**t |
| 6 | Ζ | ζ | zeta | z | _dz_ as in a**dz**e, or _z_ as in **z**ebra |
| 7 | Η | η | eta | ē | _ay_ as in s**ay** (long e) |
| 8 | Θ | θ | theta | th | _th_ as in **th**ing (aspirated t) |
| 9 | Ι | ι | iota | i | _i_ as in p**i**t or mach**i**ne |
| 10 | Κ | κ | kappa | k | _k_ as in **k**itchen |
| 11 | Λ | λ | lambda | l | _l_ as in **l**ake |
| 12 | Μ | μ | mu | m | _m_ as in **m**an |
| 13 | Ν | ν | nu | n | _n_ as in **n**ew |
| 14 | Ξ | ξ | xi | x | _x_ as in a**x**e (ks) |
| 15 | Ο | ο | omicron | o | _o_ as in n**o**t (short o) |
| 16 | Π | π | pi | p | _p_ as in **p**aper |
| 17 | Ρ | ρ | rho | r (rh initially) | _r_ as in **r**ed (trilled/rolled) |
| 18 | Σ | σ / ς | sigma | s | _s_ as in **s**it |
| 19 | Τ | τ | tau | t | _t_ as in **t**able |
| 20 | Υ | υ | upsilon | u / y | _u_ as in t**u**ne (French _u_) |
| 21 | Φ | φ | phi | ph | _ph_ as in **ph**one (aspirated p) |
| 22 | Χ | χ | chi | ch | _ch_ as in lo**ch** (aspirated k) |
| 23 | Ψ | ψ | psi | ps | _ps_ as in la**ps**e |
| 24 | Ω | ω | omega | ō | _o_ as in g**o** (long o) |

**Note on sigma:** σ is used in initial and medial positions; ς is the word-final form
(e.g. λόγος, not λόγοσ).

### 2.2 Breathing marks and accents

- **Smooth breathing (᾿):** no _h_ sound before the vowel (e.g. ἀ — "a").
- **Rough breathing (῾):** _h_ sound before the vowel (e.g. ἁ — "ha").
- **Accents:** acute (ά), grave (ὰ), circumflex (ᾶ). These mark pitch/stress and are
  essential for distinguishing some words (e.g. τίς "who?" vs τις "someone").
- **Iota subscript:** small ι written beneath α, η, ω (ᾳ, ῃ, ῳ) — silent in pronunciation
  but grammatically significant (often dative singular).

### 2.3 Diphthongs

| Diphthong | Pronunciation |
|:----------|:--------------|
| αι | _ai_ as in **ai**sle |
| ει | _ei_ as in w**ei**gh |
| οι | _oi_ as in **oi**l |
| αυ | _au_ as in s**au**erkraut |
| ευ | _eu_ as in f**eu**d |
| ου | _ou_ as in s**ou**p |
| υι | _ui_ as in s**ui**t |
| ηυ | _ēu_ (rare) |

---

## 3. Top-Frequency Koine Greek Vocabulary (~50 words)

These words account for a significant proportion of all tokens in the Greek New Testament.
The New Testament contains approximately 138,000 words from roughly 5,400 distinct lexical
forms; the ~50 most frequent words cover approximately 60–65% of all occurrences.

Glosses are context-dependent; the primary gloss given here is the most common NT usage.

| # | Greek | Transliteration | Primary Gloss | Approx. NT Frequency |
|:--|:------|:----------------|:--------------|:---------------------|
| 1 | καί | kai | and, also, even | ~9,000 |
| 2 | ὁ, ἡ, τό | ho, hē, to | the | ~19,800 (all forms) |
| 3 | δέ | de | but, and, now | ~2,800 |
| 4 | ἐν | en | in, on, by, with | ~2,700 |
| 5 | αὐτός, -ή, -ό | autos, -ē, -o | he, she, it; self; same | ~5,500 (all forms) |
| 6 | εἰμί | eimi | I am, to be | ~2,500 (all forms) |
| 7 | λέγω | legō | I say, speak | ~2,300 |
| 8 | γάρ | gar | for, because | ~1,000 |
| 9 | οὐ / οὐκ / οὐχ | ou / ouk / ouch | not | ~1,600 |
| 10 | σύ | sy | you (sg.) | ~2,900 (all pronoun forms) |
| 11 | εἰς | eis | into, to, for | ~1,700 |
| 12 | ὅτι | hoti | that, because | ~1,300 |
| 13 | οὗτος, αὕτη, τοῦτο | houtos, hautē, touto | this | ~1,400 |
| 14 | θεός, -οῦ, ὁ | theos | God, god | ~1,300 |
| 15 | ὅς, ἥ, ὅ | hos, hē, ho | who, which | ~1,400 |
| 16 | μή | mē | not (with non-indicative) | ~1,000 |
| 17 | τις, τι | tis, ti | someone, something; any | ~500 |
| 18 | ἐγώ | egō | I | ~1,700 (all pronoun forms) |
| 19 | Ἰησοῦς, -οῦ, ὁ | Iēsous | Jesus | ~900 |
| 20 | πᾶς, πᾶσα, πᾶν | pas, pasa, pan | all, every, whole | ~1,200 |
| 21 | γίνομαι | ginomai | I become, happen, am | ~670 |
| 22 | διά | dia | through, because of (+gen); on account of (+acc) | ~670 |
| 23 | ἐπί | epi | on, upon, at, over | ~900 |
| 24 | ἔχω | echō | I have, hold | ~700 |
| 25 | κύριος, -ου, ὁ | kyrios | Lord, master | ~700 |
| 26 | μετά | meta | with (+gen); after (+acc) | ~470 |
| 27 | ἀλλά | alla | but, yet | ~630 |
| 28 | ἐκ / ἐξ | ek / ex | out of, from | ~900 |
| 29 | ἄνθρωπος, -ου, ὁ | anthrōpos | man, human, person | ~550 |
| 30 | κατά | kata | according to, down, against | ~470 |
| 31 | πολύς, πολλή, πολύ | polys, pollē, poly | much, many, great | ~400 |
| 32 | περί | peri | about, concerning | ~330 |
| 33 | διάβολος, -ου, ὁ | diabolos | devil, slanderer | ~37 (but high theological frequency) |
| 34 | ἡμέρα, -ας, ἡ | hēmera | day | ~380 |
| 35 | υἱός, -οῦ, ὁ | huios | son | ~380 |
| 36 | ἀπό | apo | from, away from | ~640 |
| 37 | ἔρχομαι | erchomai | I come, go | ~630 |
| 38 | ποιέω | poieō | I do, make | ~570 |
| 39 | πνεῦμα, -ατος, τό | pneuma | spirit, wind, breath | ~380 |
| 40 | πίστις, -εως, ἡ | pistis | faith, belief | ~240 |
| 41 | ἀγάπη, -ης, ἡ | agapē | love | ~115 |
| 42 | χάρις, -ιτος, ἡ | charis | grace, favor | ~155 |
| 43 | κόσμος, -ου, ὁ | kosmos | world, order, adornment | ~185 |
| 44 | ἀδελφός, -οῦ, ὁ | adelphos | brother | ~340 |
| 45 | δύναμις, -εως, ἡ | dynamis | power, ability | ~120 |
| 46 | βασιλεία, -ας, ἡ | basileia | kingdom | ~160 |
| 47 | λαός, -οῦ, ὁ | laos | people | ~140 |
| 48 | ὄνομα, -ατος, τό | onoma | name | ~230 |
| 49 | σῶμα, -ατος, τό | sōma | body | ~140 |
| 50 | ζωή, -ῆς, ἡ | zōē | life | ~135 |

---

## 4. Basic Noun Paradigms

### 4.1 The Article: ὁ, ἡ, τό

The definite article is the most common word in the Greek NT and is essential for
recognising gender, number, and case of accompanying nouns.

| Case | Masc. Sg. | Fem. Sg. | Neut. Sg. | Masc. Pl. | Fem. Pl. | Neut. Pl. |
|:-----|:----------|:---------|:----------|:----------|:---------|:----------|
| **Nominative** | ὁ | ἡ | τό | οἱ | αἱ | τά |
| **Genitive** | τοῦ | τῆς | τοῦ | τῶν | τῶν | τῶν |
| **Dative** | τῷ | τῇ | τῷ | τοῖς | ταῖς | τοῖς |
| **Accusative** | τόν | τήν | τό | τούς | τάς | τά |
| **Vocative** | — | — | — | — | — | — |

*The article has no vocative form; ὦ is sometimes used as a vocative particle.*

### 4.2 First Declension (ἀγάπη, γραφή, δόξα types)

Feminine nouns with stem ending in α or η.

#### Type 1: ἀγάπη (love) — pure η stem

| Case | Singular | Plural |
|:-----|:---------|:-------|
| **Nom.** | ἀγάπη | ἀγάπαι |
| **Gen.** | ἀγάπης | ἀγαπῶν |
| **Dat.** | ἀγάπῃ | ἀγάπαις |
| **Acc.** | ἀγάπην | ἀγάπας |
| **Voc.** | ἀγάπη | ἀγάπαι |

#### Type 2: γραφή (writing/scripture) — η stem, mixed α in plural

| Case | Singular | Plural |
|:-----|:---------|:-------|
| **Nom.** | γραφή | γραφαί |
| **Gen.** | γραφῆς | γραφῶν |
| **Dat.** | γραφῇ | γραφαῖς |
| **Acc.** | γραφήν | γραφάς |
| **Voc.** | γραφή | γραφαί |

#### Type 3: δόξα (glory) — short α stem

| Case | Singular | Plural |
|:-----|:---------|:-------|
| **Nom.** | δόξα | δόξαι |
| **Gen.** | δόξης | δοξῶν |
| **Dat.** | δόξῃ | δόξαις |
| **Acc.** | δόξαν | δόξας |
| **Voc.** | δόξα | δόξαι |

#### Type 4: First-declension masculine (e.g. μαθητής, disciple)

| Case | Singular | Plural |
|:-----|:---------|:-------|
| **Nom.** | μαθητής | μαθηταί |
| **Gen.** | μαθητοῦ | μαθητῶν |
| **Dat.** | μαθητῇ | μαθηταῖς |
| **Acc.** | μαθητήν | μαθητάς |
| **Voc.** | μαθητά | μαθηταί |

### 4.3 Second Declension (λόγος, ἔργον types)

#### Type 1: λόγος (word) — masculine -ος

| Case | Singular | Plural |
|:-----|:---------|:-------|
| **Nom.** | λόγος | λόγοι |
| **Gen.** | λόγου | λόγων |
| **Dat.** | λόγῳ | λόγοις |
| **Acc.** | λόγον | λόγους |
| **Voc.** | λόγε | λόγοι |

#### Type 2: ἔργον (work, deed) — neuter -ον

| Case | Singular | Plural |
|:-----|:---------|:-------|
| **Nom.** | ἔργον | ἔργα |
| **Gen.** | ἔργου | ἔργων |
| **Dat.** | ἔργῳ | ἔργοις |
| **Acc.** | ἔργον | ἔργα |
| **Voc.** | ἔργον | ἔργα |

### 4.4 Third Declension (χάρις, σῶμα types)

The third declension encompasses a wide variety of stem patterns. Key recognition features:
genitive singular typically ends in -ος, -ως, or -ους; stems may show vowel gradation
between nominative and genitive.

#### Type 1: χάρις (grace, favor) — -ις, -ιτος stem

| Case | Singular | Plural |
|:-----|:---------|:-------|
| **Nom.** | χάρις | χάριτες |
| **Gen.** | χάριτος | χαρίτων |
| **Dat.** | χάριτι | χάρισι(ν) |
| **Acc.** | χάριν / χάριτα | χάριτας |
| **Voc.** | χάρις | χάριτες |

#### Type 2: σῶμα (body) — neuter, -μα, -ματος stem

| Case | Singular | Plural |
|:-----|:---------|:-------|
| **Nom.** | σῶμα | σώματα |
| **Gen.** | σώματος | σωμάτων |
| **Dat.** | σώματι | σώμασι(ν) |
| **Acc.** | σῶμα | σώματα |
| **Voc.** | σῶμα | σώματα |

#### Type 3: πίστις (faith) — -ις, -εως stem

| Case | Singular | Plural |
|:-----|:---------|:-------|
| **Nom.** | πίστις | πίστεις |
| **Gen.** | πίστεως | πίστεων |
| **Dat.** | πίστει | πίστεσι(ν) |
| **Acc.** | πίστιν | πίστεις |
| **Voc.** | πίστις | πίστεις |

#### Type 4: γένος (race, kind) — neuter, -ος, -ους stem

| Case | Singular | Plural |
|:-----|:---------|:-------|
| **Nom.** | γένος | γένη |
| **Gen.** | γένους | γενῶν |
| **Dat.** | γένει | γένεσι(ν) |
| **Acc.** | γένος | γένη |
| **Voc.** | γένος | γένη |

---

## 5. Basic Verb Paradigms

The verb λύω ("I loose, destroy") is the standard paradigm verb for Greek grammars.

### 5.1 Present Active Indicative

| Person | Singular | Plural |
|:-------|:---------|:-------|
| **1st** | λύω — I loose | λύομεν — we loose |
| **2nd** | λύεις — you loose | λύετε — you (pl.) loose |
| **3rd** | λύει — he/she/it looses | λύουσι(ν) — they loose |

### 5.2 Present Middle/Passive Indicative

| Person | Singular | Plural |
|:-------|:---------|:-------|
| **1st** | λύομαι — I am loosed / I loose (for myself) | λυόμεθα — we are loosed |
| **2nd** | λύῃ / λύει — you are loosed | λύεσθε — you (pl.) are loosed |
| **3rd** | λύεται — he/she/it is loosed | λύονται — they are loosed |

### 5.3 Imperfect Active Indicative

| Person | Singular | Plural |
|:-------|:---------|:-------|
| **1st** | ἔλυον — I was loosing | ἐλύομεν — we were loosing |
| **2nd** | ἔλυες — you were loosing | ἐλύετε — you (pl.) were loosing |
| **3rd** | ἔλυε(ν) — he/she/it was loosing | ἔλυον — they were loosing |

### 5.4 Future Active Indicative

| Person | Singular | Plural |
|:-------|:---------|:-------|
| **1st** | λύσω — I will loose | λύσομεν — we will loose |
| **2nd** | λύσεις — you will loose | λύσετε — you (pl.) will loose |
| **3rd** | λύσει — he/she/it will loose | λύσουσι(ν) — they will loose |

### 5.5 Future Middle Indicative

| Person | Singular | Plural |
|:-------|:---------|:-------|
| **1st** | λύσομαι — I will loose (mid.) | λυσόμεθα — we will loose (mid.) |
| **2nd** | λύσῃ — you will loose (mid.) | λύσεσθε — you (pl.) will loose (mid.) |
| **3rd** | λύσεται — he/she/it will loose (mid.) | λύσονται — they will loose (mid.) |

### 5.6 Aorist Active Indicative

| Person | Singular | Plural |
|:-------|:---------|:-------|
| **1st** | ἔλυσα — I loosed | ἐλύσαμεν — we loosed |
| **2nd** | ἔλυσας — you loosed | ἐλύσατε — you (pl.) loosed |
| **3rd** | ἔλυσε(ν) — he/she/it loosed | ἔλυσαν — they loosed |

### 5.7 Aorist Middle Indicative

| Person | Singular | Plural |
|:-------|:---------|:-------|
| **1st** | ἐλυσάμην — I loosed (mid.) | ἐλυσάμεθα — we loosed (mid.) |
| **2nd** | ἐλύσω — you loosed (mid.) | ἐλύσασθε — you (pl.) loosed (mid.) |
| **3rd** | ἐλύσατο — he/she/it loosed (mid.) | ἐλύσαντο — they loosed (mid.) |

### 5.8 Perfect Active Indicative

| Person | Singular | Plural |
|:-------|:---------|:-------|
| **1st** | λέλυκα — I have loosed | λελύκαμεν — we have loosed |
| **2nd** | λέλυκας — you have loosed | λελύκατε — you (pl.) have loosed |
| **3rd** | λέλυκε(ν) — he/she/it has loosed | λελύκασι(ν) — they have loosed |

### 5.9 Present Infinitive and Participle Forms

| Form | Active | Middle/Passive |
|:-----|:-------|:---------------|
| **Present Infinitive** | λύειν — to loose | λύεσθαι — to be loosed |
| **Aorist Infinitive** | λῦσαι — to have loosed | λύσασθαι — to have loosed (mid.) |

**Present Participle (active):**
| Case | Masc. Sg. | Fem. Sg. | Neut. Sg. |
|:-----|:----------|:---------|:----------|
| **Nom.** | λύων | λύουσα | λῦον |
| **Gen.** | λύοντος | λυούσης | λύοντος |

*The participle is a verbal adjective; it declines like a third-declension adjective
in the masculine/neuter and a first-declension adjective in the feminine.*

### 5.10 εἰμί — "to be" (Present Indicative)

| Person | Singular | Plural |
|:-------|:---------|:-------|
| **1st** | εἰμί — I am | ἐσμέν — we are |
| **2nd** | εἶ — you are | ἐστέ — you (pl.) are |
| **3rd** | ἐστί(ν) — he/she/it is | εἰσί(ν) — they are |

---

## 6. Common Parsing Codes — Greek

### 6.1 Person

| Code | Meaning |
|:-----|:--------|
| 1 | First person (I / we) |
| 2 | Second person (you) |
| 3 | Third person (he / she / it / they) |

### 6.2 Number

| Code | Meaning |
|:-----|:--------|
| S | Singular |
| P | Plural |

### 6.3 Tense

| Code | Meaning | Example (λύω) |
|:-----|:--------|:--------------|
| P | Present | λύω — I loose / I am loosing |
| I | Imperfect | ἔλυον — I was loosing |
| F | Future | λύσω — I will loose |
| A | Aorist | ἔλυσα — I loosed |
| R | Perfect | λέλυκα — I have loosed |
| L | Pluperfect | ἐλελύκειν — I had loosed |
| Pl | Future perfect | (rare in NT) |

### 6.4 Voice

| Code | Meaning |
|:-----|:--------|
| A | Active (subject performs the action) |
| M | Middle (subject performs action with special interest/for self) |
| P | Passive (subject receives the action) |
| D | Deponent (middle/passive form, active meaning) |

### 6.5 Mood

| Code | Meaning |
|:-----|:--------|
| I | Indicative (statement of fact) |
| S | Subjunctive (potential, probable) |
| O | Optative (wish, possibility — rare in NT) |
| Ip | Imperative (command) |
| Mp | Infinitive (verbal noun; not technically a mood but parsed alongside) |
| Pt | Participle (verbal adjective; not technically a mood but parsed alongside) |

### 6.6 Gender

| Code | Meaning |
|:-----|:--------|
| M | Masculine |
| F | Feminine |
| N | Neuter |

### 6.7 Case

| Code | Meaning | Core Function |
|:-----|:--------|:--------------|
| N | Nominative | Subject, predicate nominative |
| G | Genitive | Possession, source, separation ("of") |
| D | Dative | Indirect object, location, instrument ("to/for/by/with") |
| A | Accusative | Direct object, motion toward |
| V | Vocative | Direct address |

### 6.8 Example parse strings

A typical parse code for a Greek verb:

> `V-PAI-3S` = Verb, Present, Active, Indicative, 3rd person, Singular (e.g. λύει)

For a noun:

> `N-GSM` = Noun, Genitive, Singular, Masculine (e.g. λόγου)

For a participle:

> `V-PAP-NMS` = Verb, Present, Active, Participle, Nominative, Masculine, Singular (e.g. λύων)

---

## PART B — Biblical Hebrew

## 7. The Hebrew Alphabet

### 7.1 Consonant table

Biblical Hebrew uses a 22-letter consonantal alphabet, written right-to-left.

| # | Letter | Final Form | Name | Transliteration | Pronunciation | Numerical Value |
|:--|:-------|:-----------|:-----|:----------------|:--------------|:----------------|
| 1 | א | — | aleph | ʾ (glottal stop) | silent (carries vowel) | 1 |
| 2 | ב | — | bet | b / ḇ (v) | _b_ as in **b**oy, or _v_ (spirantized) | 2 |
| 3 | ג | — | gimel | g / ḡ | _g_ as in **g**o | 3 |
| 4 | ד | — | dalet | d / ḏ | _d_ as in **d**og | 4 |
| 5 | ה | — | he | h | _h_ as in **h**ouse | 5 |
| 6 | ו | — | waw | w | _w_ as in **w**ay (modern: _v_) | 6 |
| 7 | ז | — | zayin | z | _z_ as in **z**ebra | 7 |
| 8 | ח | — | ḥet | ḥ | guttural _ch_ as in lo**ch** | 8 |
| 9 | ט | — | ṭet | ṭ | emphatic _t_ | 9 |
| 10 | י | — | yod | y | _y_ as in **y**es | 10 |
| 11 | כ | ך | kaph | k / ḵ (kh) | _k_ as in **k**ing, or _ch_ as in lo**ch** | 20 |
| 12 | ל | — | lamed | l | _l_ as in **l**ion | 30 |
| 13 | מ | ם | mem | m | _m_ as in **m**other | 40 |
| 14 | נ | ן | nun | n | _n_ as in **n**ew | 50 |
| 15 | ס | — | samekh | s | _s_ as in **s**ee | 60 |
| 16 | ע | — | ayin | ʿ | voiced pharyngeal (guttural) | 70 |
| 17 | פ | ף | pe | p / p̄ (f) | _p_ as in **p**ark, or _f_ (spirantized) | 80 |
| 18 | צ | ץ | tsade | ṣ | emphatic _ts_ | 90 |
| 19 | ק | — | qoph | q | emphatic _k_ (further back) | 100 |
| 20 | ר | — | resh | r | _r_ (rolled/guttural) | 200 |
| 21 | שׂ / שׁ | — | sin / shin | ś (s) / š (sh) | _s_ as in **s**ee, or _sh_ as in **sh**e | 300 |
| 22 | ת | — | taw | t / ṯ (th) | _t_ as in **t**oy | 400 |

**Final forms:** Five letters have distinct forms when they appear at the end of a word:
כ → ך, מ → ם, נ → ן, פ → ף, צ → ץ.
Mnemonic: **K**aph, **M**em, **N**un, **P**e, **T**sade (**K**e**M**a**N** a**P**e**T**s).

**Dagesh lene:** The Begadkephat letters (ב, ג, ד, כ, פ, ת) take a dot (dagesh lene)
to indicate the hard/stop pronunciation rather than the spirantized form. In modern
pointed texts, a dagesh (dot) in the middle of these letters signals the hard form.

### 7.2 Numerical values (Gematria)

Each Hebrew letter doubles as a number. Units: 1–9 (aleph–tet); tens: 10–90 (yod–tsade);
hundreds: 100–400 (qoph–taw). This is used in verse numbering (e.g. Psalm 119's acrostic
sections) but is not required for basic parsing.

---

## 8. Vowel Pointing System

The Tiberian pointing system (developed by the Masoretes, c. 7th–10th c. CE) is the
standard vocalisation of the Hebrew Bible. Vowels are written as dots and dashes
above, below, or to the left of consonants.

### 8.1 Long vowels

| Sign | Name | Transliteration | Pronunciation |
|:-----|:-----|:----------------|:--------------|
| ָ | qamets | ā | _a_ as in f**a**ther |
| ֵ | tsere | ē | _ay_ as in s**ay** |
| ֹ | holem | ō | _o_ as in r**o**w |
| וֹ | holem waw ("full") | ô | _o_ as in r**o**w (same sound) |

### 8.2 Short vowels

| Sign | Name | Transliteration | Pronunciation |
|:-----|:-----|:----------------|:--------------|
| ַ | patach | a | _a_ as in c**a**t |
| ֶ | segol | e | _e_ as in l**e**t |
| ִ | hireq | i | _i_ as in p**i**t |
| ָ | qamets ḥaṭuph | o | _o_ as in n**o**t (short, in closed unstressed syllables) |
| ֻ | qibbuts | u | _u_ as in p**u**t |

### 8.3 Reduced vowels (ḥaṭeph forms)

These appear under guttural letters (א, ה, ח, ע) and represent very short/whispered vowels.

| Sign | Name | Transliteration | Pronunciation |
|:-----|:-----|:----------------|:--------------|
| ֲ | ḥaṭeph patach | ă | ultra-short _a_ |
| ֱ | ḥaṭeph segol | ĕ | ultra-short _e_ |
| ֳ | ḥaṭeph qamets | ŏ | ultra-short _o_ |

### 8.4 Sheva

| Sign | Name | Meaning |
|:-----|:-----|:--------|
| ְ | sheva | Vocal sheva = short _e_ sound (as in _b**e**low_); silent sheva = no vowel (closes a syllable) |

### 8.5 Mater lectionis (vowel letters)

Certain consonants can indicate vowel sounds, predating the pointing system:

- **י (yod):** often indicates _i_ or _e_ sounds (hireq yod, tsere yod)
- **ו (waw):** often indicates _o_ or _u_ sounds (holem waw, shureq)
- **ה (he):** at the end of a word, often indicates _a_, _e_, or _o_ (qamets he, segol he, holem he)

### 8.6 Syllable basics

- Hebrew syllables always begin with a consonant (+ vowel).
- An **open syllable** ends in a vowel; a **closed syllable** ends in a consonant + silent sheva.
- Unstressed open syllables typically have long vowels; closed unaccented syllables typically
  have short vowels.

---

## 9. Top-Frequency Biblical Hebrew Vocabulary (~50 words)

These words account for a very large proportion of all tokens in the Hebrew Bible.
The Hebrew Bible contains approximately 305,000 words from roughly 8,600 distinct
lexical forms; a knowledge of the ~50 most frequent words covers approximately 50%
of all occurrences (much of this due to the high frequency of prepositions and the
definite article).

Glosses are context-dependent; the primary gloss given here is the most common usage.

| # | Hebrew | Transliteration | Primary Gloss | Approx. Frequency |
|:--|:-------|:----------------|:--------------|:------------------|
| 1 | וְ | wə- | and, but, then | ~50,000 |
| 2 | הַ | ha- | the (definite article prefix) | ~24,000 |
| 3 | לְ | lə- | to, for, belonging to | ~20,000 |
| 4 | בְּ | bə- | in, with, by, through | ~15,000 |
| 5 | אֵת | ʾēṯ | (definite direct object marker) | ~11,000 |
| 6 | מִן / מִ | min / mi- | from, out of, than | ~7,500 |
| 7 | אֶל | ʾel | to, toward, unto | ~5,500 |
| 8 | עַל | ʿal | upon, over, above, concerning | ~5,700 |
| 9 | אֲשֶׁר | ʾăšer | who, which, that (relative pronoun) | ~5,500 |
| 10 | כִּי | kî | that, because, for, when, indeed | ~4,500 |
| 11 | כֹּל | kōl | all, every, whole | ~5,400 |
| 12 | לֹא | lōʾ | not, no | ~5,100 |
| 13 | אֲנִי | ʾănî | I | ~4,300 (all pronoun forms) |
| 14 | אַתָּה | ʾattâ | you (masc. sg.) | ~3,000 (all forms) |
| 15 | הָיָה | hāyâ | he was, became, happened | ~3,500 |
| 16 | אֱלֹהִים | ʾĕlōhîm | God, gods | ~2,600 |
| 17 | אָמַר | ʾāmar | he said | ~5,300 |
| 18 | יְהוָה | YHWH | the LORD (the tetragrammaton) | ~6,800 |
| 19 | אֶרֶץ | ʾereṣ | land, earth, ground | ~2,500 |
| 20 | יִשְׂרָאֵל | yiśrāʾēl | Israel | ~2,500 |
| 21 | מֶלֶךְ | meleḵ | king | ~2,500 |
| 22 | יוֹם | yôm | day | ~2,300 |
| 23 | בֵּן | bēn | son | ~4,900 |
| 24 | עָשָׂה | ʿāśâ | he did, made | ~2,600 |
| 25 | אִישׁ | ʾîš | man, husband, person | ~2,100 |
| 26 | בַּיִת | bayiṯ | house, household, temple | ~2,000 |
| 27 | בּוֹא | bôʾ | he came, went, entered | ~2,500 |
| 28 | יָד | yāḏ | hand, power, side | ~1,600 |
| 29 | עִם | ʿim | with | ~1,000 |
| 30 | גַּם | gam | also, even, indeed | ~1,000 |
| 31 | דָּבָר | dāḇār | word, thing, matter | ~1,400 |
| 32 | נָתַן | nāṯan | he gave, put, set | ~2,000 |
| 33 | עַיִן | ʿayin | eye, spring | ~900 |
| 34 | פָּנִים | pānîm | face, presence | ~2,100 |
| 35 | רָאָה | rāʾâ | he saw, looked | ~1,300 |
| 36 | שָׁמַע | šāmaʿ | he heard, listened, obeyed | ~1,100 |
| 37 | עִיר | ʿîr | city | ~1,000 |
| 38 | לֵב / לֵבָב | lēḇ / lēḇāḇ | heart, mind | ~850 |
| 39 | נֶפֶשׁ | nepeš | soul, life, self, throat | ~750 |
| 40 | דֶּרֶךְ | dereḵ | way, road, path, manner | ~700 |
| 41 | אָדָם | ʾāḏām | man, humankind, Adam | ~500 |
| 42 | עַם | ʿam | people, nation | ~1,800 |
| 43 | הַר | har | mountain, hill | ~550 |
| 44 | כֹּהֵן | kōhēn | priest | ~750 |
| 45 | גּוֹי | gôy | nation, Gentile | ~550 |
| 46 | תּוֹרָה | tôrâ | law, instruction, teaching | ~220 (but central) |
| 47 | קוֹל | qôl | voice, sound, noise | ~500 |
| 48 | אָב | ʾāḇ | father, ancestor | ~1,200 |
| 49 | אַחַר | ʾaḥar | after, behind | ~700 |
| 50 | יָשַׁב | yāšaḇ | he sat, dwelt, inhabited | ~1,000 |

---

## 10. Basic Noun Patterns

### 10.1 Gender, number, and state

Hebrew nouns have:

- **Gender:** masculine or feminine. Feminine nouns typically end in ה ָ (qamets-he) or ת.
- **Number:** singular, dual (rare — mainly paired body parts and time units), plural.
- **State:** absolute (standard, standalone form) and construct (bound to a following noun
  in a genitive/possessive relationship, often showing vowel reduction).

#### Example: סוּס (sûs) — horse (masculine)

| Number / State | Absolute | Construct |
|:---------------|:---------|:----------|
| **Singular** | סוּס — sûs | סוּס — sûs |
| **Plural** | סוּסִים — sûsîm | סוּסֵי — sûsê |
| **Dual** | סוּסַיִם — sûsayim | סוּסֵי — sûsê |

#### Example: תּוֹרָה (tôrâ) — law (feminine)

| Number / State | Absolute | Construct |
|:---------------|:---------|:----------|
| **Singular** | תּוֹרָה — tôrâ | תּוֹרַת — tôraṯ |
| **Plural** | תּוֹרוֹת — tôrôṯ | תּוֹרוֹת — tôrôṯ |

### 10.2 Masculine and feminine endings

| Gender | Singular Ending | Plural Ending |
|:-------|:----------------|:--------------|
| **Masculine** | varied; often no special ending | ים ִ — -îm |
| **Feminine** | ה ָ — -â, or ת — -t / -eṯ / -aṯ | וֹת — -ôṯ |

### 10.3 Dual

The dual ending is יִם ַ — -ayim. It appears primarily on:

- Paired body parts: יָדַיִם (yāḏayim — two hands), עֵינַיִם (ʿênayim — two eyes),
  אָזְנַיִם (ʾāzənayim — two ears), רַגְלַיִם (raḡlayim — two feet)
- Time units: יוֹמַיִם (yômayim — two days), שְׁנָתַיִם (šənāṯayim — two years)
- A few measurement terms

### 10.4 Pronominal suffixes on nouns

Hebrew can attach possessive pronouns directly to the noun as suffixes. The form
varies slightly between singular and plural nouns.

#### Possessive suffixes on a masculine singular noun: סוּס (sûs, horse)

| Person / Gen / Num | Suffix | Form | Gloss |
|:-------------------|:-------|:-----|:------|
| 1cs | י ִ — -î | סוּסִי — sûsî | my horse |
| 2ms | ךָ ְ — -əḵā | סוּסְךָ — sûsəḵā | your horse |
| 2fs | ךְ ֵ — -ēḵ | סוּסֵךְ — sûsēḵ | your horse |
| 3ms | וֹ — -ô | סוּסוֹ — sûsô | his horse |
| 3fs | ָה — -āh | סוּסָה — sûsāh | her horse |
| 1cp | נוּ ֵ — -ēnû | סוּסֵנוּ — sûsēnû | our horse |
| 2mp | כֶם ְ — -əḵem | סוּסְכֶם — sûsəḵem | your horse |
| 2fp | כֶן ְ — -əḵen | סוּסְכֶן — sûsəḵen | your horse |
| 3mp | הֶם ָ — -āhem | סוּסָם — sûsām | their horse |
| 3fp | הֶן ָ — -āhen | סוּסָן — sûsān | their horse |

---

## 11. Basic Verb System: The Seven Binyanim

Hebrew verbs are built from (usually) triliteral roots in seven primary patterns (בִּנְיָנִים,
binyanim — literally "buildings"). Each binyan modifies the root meaning in predictable ways.
The root קטל (q-ṭ-l, "kill") and מלך (m-l-k, "reign/rule") serve as standard paradigm roots.

### 11.1 Overview table

| Binyan | Voice / Type | Core Meaning | Recognition Features (Perfect 3ms) | Example (קטל) |
|:-------|:-------------|:-------------|:-----------------------------------|:--------------|
| **Qal** (קַל) | Simple active | Basic action | No prefix; two qamets or patach-qamets | קָטַל — _he killed_ |
| **Niphal** (נִפְעַל) | Simple passive / reflexive | Was killed; killed himself | נִ prefix + patach under first root letter | נִקְטַל — _he was killed_ |
| **Piel** (פִּעֵל) | Intensive active | Shattered, utterly destroyed | Hireq under 1st root letter + dagesh in 2nd | קִטֵּל — _he slaughtered_ |
| **Pual** (פֻּעַל) | Intensive passive | Was shattered | Qibbuts under 1st root letter + dagesh in 2nd | קֻטַּל — _he was slaughtered_ |
| **Hiphil** (הִפְעִיל) | Causative active | Caused to kill | הִ prefix + hireq yod before last root letter | הִקְטִיל — _he caused to kill_ |
| **Hophal** (הָפְעַל) | Causative passive | Was caused to kill | הָ prefix + qamets ḥaṭuph or qibbuts | הָקְטַל — _he was caused to kill_ |
| **Hitpael** (הִתְפַּעֵל) | Intensive reflexive | Killed himself | הִתְ prefix + patach under 1st root letter | הִתְקַטֵּל — _he killed himself_ |

### 11.2 Qal — simple active

The most common binyan; the base form of the verb. Typically transitive or stative.

| Form | קטל (kill) | מלך (reign) |
|:-----|:-----------|:------------|
| Perfect 3ms | קָטַל _qāṭal_ | מָלַךְ _mālaḵ_ |
| Imperfect 3ms | יִקְטֹל _yiqṭōl_ | יִמְלֹךְ _yimlōḵ_ |
| Participle ms | קֹטֵל _qōṭēl_ | מֹלֵךְ _mōlēḵ_ |
| Imperative ms | קְטֹל _qəṭōl_ | מְלֹךְ _məlōḵ_ |
| Infinitive construct | קְטֹל _qəṭōl_ | מְלֹךְ _məlōḵ_ |

### 11.3 Niphal — simple passive / reflexive

Often the passive of Qal, or a middle/reflexive sense.

| Form | קטל |
|:-----|:----|
| Perfect 3ms | נִקְטַל _niqṭal_ |
| Imperfect 3ms | יִקָּטֵל _yiqqāṭēl_ |
| Participle ms | נִקְטָל _niqṭāl_ |

### 11.4 Piel — intensive active

Characterised by the doubling (dagesh forte) of the middle root letter and a hireq
under the first root letter. Often factitive or denominative.

| Form | קטל |
|:-----|:----|
| Perfect 3ms | קִטֵּל _qiṭṭēl_ |
| Imperfect 3ms | יְקַטֵּל _yəqaṭṭēl_ |
| Participle ms | מְקַטֵּל _məqaṭṭēl_ |

### 11.5 Pual — intensive passive

The passive counterpart of Piel; characterised by a qibbuts under the first root letter
and patach under the second.

| Form | קטל |
|:-----|:----|
| Perfect 3ms | קֻטַּל _quṭṭal_ |
| Imperfect 3ms | יְקֻטַּל _yəquṭṭal_ |
| Participle ms | מְקֻטָּל _məquṭṭāl_ |

### 11.6 Hiphil — causative active

Characterised by a הִ prefix in the perfect and a יַ...ִי pattern in the imperfect.

| Form | קטל |
|:-----|:----|
| Perfect 3ms | הִקְטִיל _hiqṭîl_ |
| Imperfect 3ms | יַקְטִיל _yaqṭîl_ |
| Participle ms | מַקְטִיל _maqṭîl_ |

### 11.7 Hophal — causative passive

The passive of Hiphil; characterised by a הָ prefix and a qamets ḥaṭuph or qibbuts
under the first root letter.

| Form | קטל |
|:-----|:----|
| Perfect 3ms | הָקְטַל _hāqṭal_ (or הׇקְטַל) |
| Imperfect 3ms | יָקְטַל _yāqṭal_ |
| Participle ms | מָקְטָל _māqṭāl_ |

### 11.8 Hitpael — intensive reflexive

Characterised by a הִתְ prefix and a dagesh in the middle root letter. Expresses
reflexive, reciprocal, or iterative action.

| Form | קטל |
|:-----|:----|
| Perfect 3ms | הִתְקַטֵּל _hiṯqaṭṭēl_ |
| Imperfect 3ms | יִתְקַטֵּל _yiṯqaṭṭēl_ |
| Participle ms | מִתְקַטֵּל _miṯqaṭṭēl_ |

---

## 12. Common Parsing Codes — Hebrew

### 12.1 Stem (Binyan)

| Code | Binyan | Voice/Type |
|:-----|:-------|:-----------|
| Q | Qal | Simple active |
| N | Niphal | Simple passive/reflexive |
| P | Piel | Intensive active |
| Pu | Pual | Intensive passive |
| H | Hiphil | Causative active |
| Ho | Hophal | Causative passive |
| Ht | Hitpael | Intensive reflexive |

### 12.2 Conjugation (main forms)

| Code | Meaning | Example (Qal קטל) |
|:-----|:--------|:-------------------|
| Perf | Perfect (suffix conjugation) — completed action | קָטַל — he killed |
| Impf | Imperfect (prefix conjugation) — incomplete/ongoing action | יִקְטֹל — he will kill / he was killing |
| Impv | Imperative — command | קְטֹל — kill! |
| InfC | Infinitive construct — verbal noun (common) | קְטֹל — to kill |
| InfA | Infinitive absolute — emphatic verbal noun (rare) | קָטוֹל — to kill (emphatic) |
| Ptc | Participle — verbal adjective | קֹטֵל — killing / one who kills |
| wCI | Waw-consecutive imperfect (wayyiqtol) — narrative past | וַיִּקְטֹל — and he killed |
| wCP | Waw-consecutive perfect (wəqāṭal) — future/consequent | וְקָטַל — and he will kill |

### 12.3 Person / Gender / Number

Combined into a single code since Hebrew verbal forms mark person, gender, and number
together in the suffix or prefix.

| Code | Meaning |
|:-----|:--------|
| 3ms | Third person, masculine, singular |
| 3fs | Third person, feminine, singular |
| 2ms | Second person, masculine, singular |
| 2fs | Second person, feminine, singular |
| 1cs | First person, common, singular |
| 3mp | Third person, masculine, plural |
| 3fp | Third person, feminine, plural |
| 2mp | Second person, masculine, plural |
| 2fp | Second person, feminine, plural |
| 1cp | First person, common, plural |

### 12.4 State (for nouns)

| Code | Meaning |
|:-----|:--------|
| Abs | Absolute (standalone form) |
| Cstr | Construct (bound to a following noun) |

### 12.5 Example parse strings

A typical parse code for a Hebrew verb:

> `V-Q-Perf-3ms` = Verb, Qal, Perfect, 3rd person masculine singular (e.g. קָטַל)

> `V-H-Impf-3mp` = Verb, Hiphil, Imperfect, 3rd person masculine plural (e.g. יַקְטִילוּ)

A waw-consecutive form:

> `V-Q-wCI-3ms` = Verb, Qal, Waw-consecutive Imperfect, 3rd person masculine singular
> (e.g. וַיִּקְטֹל)

For a noun:

> `N-ms-Abs` = Noun, masculine, singular, absolute (e.g. סוּס)

> `N-fp-Cstr` = Noun, feminine, plural, construct (e.g. תּוֹרוֹת)

---

## PART C — Scope Notes

## 13. Scope Boundaries

### 13.1 In scope (proposed)

| Category | Coverage |
|:---------|:---------|
| **Alphabet and writing systems** | Full letter tables with transliteration and pronunciation for both languages |
| **Vowel pointing (Hebrew)** | Tiberian system overview with vowel names, signs, and syllable basics |
| **Top-frequency vocabulary** | ~50 most common words per language with primary English glosses |
| **Nominal paradigms** | First, second, and third Greek declensions; Hebrew gender/number/state/suffixes |
| **Verbal paradigms** | Core Greek tenses of λύω + εἰμί; all seven Hebrew binyanim with recognition features |
| **Parsing codes** | Standard academic abbreviation schemas for both languages |
| **Language detection** | Tier A: identify whether input text is Greek or Hebrew (or mixed/meta) |

### 13.2 Out of scope (proposed — may be reconsidered)

| Category | Reason |
|:---------|:-------|
| **Full lexicon** | Beyond the parser's scope; a complete Greek NT or Hebrew Bible lexicon would require a separate build artefact with its own provenance and licence tracking |
| **Syntax and grammar rules** | Clause analysis, word-order conventions, discourse grammar — these belong in a syntax engine or teaching grammar, not a lightweight parser aide |
| **Textual criticism** | Manuscript variants, text-type analysis, critical apparatus data — out of scope |
| **Septuagint or extra-biblical Greek/Hebrew** | The parser targets NT Koine Greek and the Hebrew Bible (Masoretic Text); Hellenistic Greek (LXX, Philo, Josephus) and later Hebrew (Mishnaic, Modern) are not covered |
| **Aramaic** | Portions of Daniel and Ezra are in Biblical Aramaic — not covered in this scope |
| **Audio pronunciation** | IPA transcription and audio playback would require a different tool architecture |
| **Interlinear generation** | Interlinear alignment is a distinct (and substantially more complex) problem |

### 13.3 Tier proposal

Since Parser_guide.md §2.1 leaves the Greek & Hebrew tier unassigned, this file
proposes the following:

**Tier A (offline, rule-based, builds per the Grammar chassis pattern):**

1. Detect whether a word/token is Greek or Hebrew (character-range analysis).
2. Look up the word in the top-frequency vocabulary list; return a primary English gloss.
3. If the word is a recognisable inflected form, attempt a basic morphological parse:
   - For Greek: person, number, tense, voice, mood (verbs); gender, number, case (nouns/articles/adjectives).
   - For Hebrew: stem (binyan), conjugation, person/gender/number (verbs); gender, number, state (nouns).
4. Present the gloss and parse in the Explainer pane.

**Tier B (would require an external LLM call — see Grammar's Tier-B model):**

1. Full morphological analysis of every token, including rare and irregular forms.
2. Syntactic analysis: clause boundaries, phrase relationships, word-order patterns.
3. Discourse analysis: verbal sequence, topic/comment structure, narrative flow.
4. Theological and semantic nuance: word-study depth, LXX parallels, intertextual links.

### 13.4 Explainer format proposal

Pending definition (Parser_guide.md §2.3), this file proposes a **two-panel Explainer:**

- **Upper panel (word-level):** a per-token table. Columns: Token | Language | Lexical Form |
  Gloss | Morphological Parse. For unrecognised tokens, show "?" with a note.
- **Lower panel (summary):** a short prose summary identifying the language of the text,
  the proportion of tokens that matched the top-frequency list, and a note if vocabulary
  appears to be significantly beyond the covered range (suggesting the text may require
  a full lexicon rather than the aide).

### 13.5 Relationship to this project's build pipeline

The `build/` directory inherits the Grammar parser chassis (§5b of Parser_guide.md).
Adaptations needed for Greek & Hebrew:

- Replace the English lexicon (`Grammar_lexicon.db`) with Hebrew and Greek gloss tables
  (or a combined SQLite file holding both).
- Replace the English parsing rules in `template.html` with Greek/Hebrew tokenisation
  and morphological lookup rules.
- Adjust the Explainer rendering to use the two-panel format proposed above.
- The Markdown content in this file would be compiled into the asset as reference material
  (the "reference pane" in the UI) — distinct from the active parsing logic.

### 13.6 Status and next steps

| Item | Status |
|:-----|:-------|
| Content scope (this file) | **Draft — awaiting Luke review** |
| Parser logic | Undefined (Parser_guide.md §2.1, §2.4) |
| Explainer format | Undefined (Parser_guide.md §2.3) — proposal in §13.4 above |
| Tier assignment | Undefined — proposal in §13.3 above |
| Build adaptation | Not started; depends on scope approval |
| Lexicon data file | Not built; depends on scope decisions about vocabulary coverage |

---

*End of draft content source — 2026-07-09*
