---
type: content-source
status: draft
title: "Interpretation — Content Source"
description: >
  Exhaustive draft catalogue of interpretive methodologies across social science
  and English literature. Sourced from standard open-source and academic
  reference material. Quote-snippet and matching-elements columns deferred to a
  follow-up build pass.
provenance: >
  Compiled from standard open-source/academic reference material on
  interpretive methodologies, including the Stanford Encyclopedia of
  Philosophy, the Internet Encyclopedia of Philosophy, the Oxford
  Bibliographies in Literary and Critical Theory, and canonical primary
  texts in hermeneutics, critical theory, narratology, and literary
  criticism.
---

> **STATUS: DRAFT — pending Luke review**

# Interpretation — Content Source

This document catalogues the interpretive methodologies that the Interpretation
parser aide (`build_parser.py`) draws upon. Each entry provides a method name,
key representative(s) / proponent(s), and a brief theory summary. The quote-snippet
and matching-elements columns described in the Explainer spec are deferred to a
subsequent build pass.

---

## PART A: Social Science Methodologies

### 1 Hermeneutics

#### 1.1 Schleiermacher — General Hermeneutics
- **Representative/proponent:** Friedrich Schleiermacher (1768–1834)
- **Summary:** Schleiermacher established hermeneutics as a general theory of
  understanding, applicable beyond biblical texts to all forms of human
  expression. Interpretation proceeds through a grammatical pole (analysing the
  shared linguistic system) and a psychological pole (reconstructing the
  author's creative mental act). The interpreter's goal is to understand an
  author's meaning *better* than the author understood it themselves, by making
  explicit what was implicit in the act of composition.

#### 1.2 Dilthey — Hermeneutics as the Foundation of the Human Sciences
- **Representative/proponent:** Wilhelm Dilthey (1833–1911)
- **Summary:** Dilthey distinguished the *Geisteswissenschaften* (human
  sciences) from the natural sciences, arguing that human phenomena require
  *understanding* (*Verstehen*) rather than causal *explanation* (*Erklären*).
  He grounded hermeneutics in the concept of *lived experience* (*Erlebnis*)
  and its expression in cultural artefacts, proposing that we understand
  individual expressions by situating them within the larger whole of a
  historical epoch or life-narrative — the hermeneutic circle. His work
  provided the epistemological foundation for qualitative social research.

#### 1.3 Gadamer — Philosophical Hermeneutics
- **Representative/proponent:** Hans-Georg Gadamer (1900–2002)
- **Summary:** In *Truth and Method* (1960), Gadamer shifted hermeneutics from
  a method for recovering authorial intent to an account of understanding as a
  universal feature of human existence. Understanding always proceeds from
  *prejudices* (fore-structures) shaped by tradition, which are not obstacles to
  be eliminated but conditions of possibility for interpretation. The *fusion of
  horizons* between interpreter and text produces meaning that neither party
  possessed alone, and this fusion is mediated through *effective history*
  (*Wirkungsgeschichte*).

#### 1.4 Ricoeur — Hermeneutics of Suspicion and Retrieval
- **Representative/proponent:** Paul Ricoeur (1913–2005)
- **Summary:** Ricoeur proposed a dialectical hermeneutics that navigates
  between a *hermeneutics of suspicion* (the demystifying strategies of Marx,
  Nietzsche, and Freud, which treat surface meaning as a mask for deeper
  economic, power, or libidinal forces) and a *hermeneutics of faith* or
  retrieval (which seeks to recover the surplus of meaning that texts disclose).
  He developed a theory of narrative identity, arguing that self-understanding
  is mediated through the stories we tell and that textual interpretation
  culminates in a transformed understanding of self and world.

---

### 2 Phenomenology

#### 2.1 Husserl — Transcendental Phenomenology
- **Representative/proponent:** Edmund Husserl (1859–1938)
- **Summary:** Husserl founded phenomenology as a rigorous descriptive science
  of conscious experience, aiming to return "to the things themselves." His
  method of *epoché* (bracketing) suspends the natural attitude — our taken-for-
  granted belief in the existence of the external world — to examine how objects
  are *constituted* in consciousness through intentional acts. The goal is to
  uncover the essential structures of experience (the *eidetic reduction*),
  revealing the invariant features by which consciousness grasps its objects.

#### 2.2 Heidegger — Existential Phenomenology and Hermeneutics
- **Representative/proponent:** Martin Heidegger (1889–1976)
- **Summary:** In *Being and Time* (1927), Heidegger transformed phenomenology
  by shifting the focus from consciousness to the question of Being (*Sein*)
  itself, approached through an analytic of *Dasein* (the being for whom Being
  is an issue). Understanding is not a cognitive operation but the basic mode of
  Dasein's existence — we are always already interpreting our world through a
  fore-structure of understanding rooted in practical engagement. This
  ontological turn fused phenomenology with hermeneutics and profoundly
  influenced existentialism, deconstruction, and qualitative social research.

#### 2.3 Merleau-Ponty — Phenomenology of Embodiment and Perception
- **Representative/proponent:** Maurice Merleau-Ponty (1908–1961)
- **Summary:** Merleau-Ponty developed a phenomenology centred on the *lived
  body* (*corps vécu*) as the primary site of our being-in-the-world, rejecting
  both intellectualist and empiricist accounts of perception. Perception is not
  a mental representation of sense-data but an embodied, pre-reflective
  engagement in which subject and world are co-constitutive — expressed in the
  concept of the *flesh* (*chair*) as the elemental tissue of reversibility
  between perceiver and perceived. His work grounds interpretive practice in the
  irreducible ambiguity and situatedness of embodied experience.

---

### 3 Structuralism

#### 3.1 Saussure — Linguistic Structuralism
- **Representative/proponent:** Ferdinand de Saussure (1857–1913)
- **Summary:** Saussure reconceived language as a system of signs in which
  meaning arises not from a positive correspondence between word and thing but
  from *differences* within the linguistic system itself. He introduced key
  distinctions — *langue* (the abstract system) versus *parole* (individual
  utterances), *signifier* versus *signified*, and *syntagmatic* versus
  *paradigmatic* relations — that became foundational for structuralist analysis
  across the human sciences. His insight that the sign is arbitrary and
  meaning is relational enabled the extension of linguistic models to culture,
  myth, and literature.

#### 3.2 Lévi-Strauss — Structural Anthropology
- **Representative/proponent:** Claude Lévi-Strauss (1908–2009)
- **Summary:** Lévi-Strauss applied Saussurean linguistics to the study of
  kinship systems and myth, arguing that seemingly diverse cultural phenomena
  are surface manifestations of deep, universal mental structures. Myths,
  like language, are structured by binary oppositions (raw/cooked, nature/
  culture) that the human mind unconsciously organises and mediates. His method
  decomposes narratives into constituent units (*mythemes*) and analyses their
  transformations across variants, revealing the invariant logic underlying
  cultural variation.

#### 3.3 Barthes — Semiological Structuralism and the Transition to Post-Structuralism
- **Representative/proponent:** Roland Barthes (1915–1980)
- **Summary:** Barthes's early work extended structuralist analysis to the
  semiotics of everyday culture (*Mythologies*, 1957), exposing how bourgeois
  ideology is naturalised through the signs of mass culture. His structuralist
  narratology ("Introduction to the Structural Analysis of Narratives," 1966)
  proposed a systematic grammar of narrative. His later work — notably "The
  Death of the Author" (1967) and *S/Z* (1970) — shifted toward post-
  structuralism by championing the plurality of the text and the productive role
  of the reader in constituting meaning, dismantling the structuralist ambition
  of a unified science of signs.

---

### 4 Post-Structuralism / Deconstruction

#### 4.1 Derrida — Deconstruction
- **Representative/proponent:** Jacques Derrida (1930–2004)
- **Summary:** Derrida's deconstruction is a practice of close reading that
  exposes the instability of the conceptual oppositions (speech/writing,
  presence/absence, nature/culture) that structure Western metaphysics — what he
  called the *metaphysics of presence*. His key concepts include *différance*
  (the endless deferral and differing by which meaning is produced and never
  fully present), the *trace*, and the logic of the *supplement*. Deconstruction
  does not destroy texts but reveals how they undo their own apparent
  coherence, showing that meaning is always contingent, context-bound, and
  inhabited by an otherness it cannot master.

#### 4.2 Foucault — Archaeology, Genealogy, and Power/Knowledge
- **Representative/proponent:** Michel Foucault (1926–1984)
- **Summary:** Foucault's *archaeological* method (*The Order of Things*, 1966;
  *The Archaeology of Knowledge*, 1969) analyses the unconscious *epistemes* or
  discursive formations that govern what can be thought and said in a given
  historical period, treating discourses as autonomous systems of statements
  rather than expressions of authorial subjects. His later *genealogical*
  method (*Discipline and Punish*, 1975; *The History of Sexuality*, 1976–84)
  examines the entwinement of power and knowledge in the constitution of modern
  subjects — through discipline, surveillance, confession, and biopolitics.
  Interpretation, for Foucault, is always an analysis of the conditions under
  which statements become possible and the power effects they produce.

---

### 5 Critical Theory

#### 5.1 Horkheimer & Adorno — Frankfurt School Critique of Instrumental Reason
- **Representative/proponent:** Max Horkheimer (1895–1973) & Theodor W. Adorno
  (1903–1969)
- **Summary:** The Frankfurt School developed a form of Marxist critique that
  integrated Freudian psychoanalysis and Weberian sociology to analyse the
  pathologies of modernity. In *Dialectic of Enlightenment* (1947), Horkheimer
  and Adorno argued that Enlightenment rationality, intended to liberate
  humanity from myth, reverts into a new mythology of instrumental reason
  epitomised by the *culture industry*, which administers mass deception and
  extinguishes critical thought. Their method of *immanent critique* evaluates
  social phenomena against the normative ideals those phenomena themselves
  proclaim, exposing the gap between promise and reality.

#### 5.2 Habermas — Communicative Action and Discourse Ethics
- **Representative/proponent:** Jürgen Habermas (1929–)
- **Summary:** Habermas reconstructs critical theory on the foundation of
  *communicative rationality* — the rationality immanent in language use
  oriented toward mutual understanding, as distinct from strategic or
  instrumental rationality. His theory of *communicative action* (1981)
  identifies the idealising presuppositions (validity claims to truth,
  rightness, and sincerity) that speakers necessarily raise in communication,
  providing a normative basis for critique. The concept of the *ideal speech
  situation* — a counterfactual condition of uncoerced discourse — serves as a
  regulative ideal for democratic deliberation and emancipatory social critique.

---

### 6 Psychoanalytic Criticism

#### 6.1 Freud — Classical Psychoanalysis and the Unconscious
- **Representative/proponent:** Sigmund Freud (1856–1939)
- **Summary:** Freud's psychoanalysis provides interpretive methods for
  uncovering the unconscious desires, anxieties, and conflicts that shape human
  behaviour and cultural production. Key interpretive concepts include the
  Oedipus complex, repression, the return of the repressed, dream-work
  (condensation and displacement), and the tripartite structure of the psyche
  (id, ego, superego). Applied to texts, psychoanalytic criticism reads
  manifest content as a compromise formation that both conceals and reveals
  latent unconscious material, treating narrative and figurative language as
  analogous to dream-work.

#### 6.2 Lacan — Structural Psychoanalysis and the Return to Freud
- **Representative/proponent:** Jacques Lacan (1901–1981)
- **Summary:** Lacan "returned to Freud" through the lens of Saussurean
  linguistics and structural anthropology, famously asserting that "the
  unconscious is structured like a language." His rereading of Freud centres on
  three registers — the *Imaginary* (the realm of identification and
  misrecognition, epitomised by the mirror stage), the *Symbolic* (the order
  of language, law, and lack, governed by the Name-of-the-Father), and the
  *Real* (that which resists symbolisation). Lacanian literary criticism attends
  to the ways texts stage the subject's relation to desire, lack, and the
  signifier's inexhaustible play.

#### 6.3 Kristeva — Semiotic, Abjection, and Intertextuality
- **Representative/proponent:** Julia Kristeva (1941–)
- **Summary:** Kristeva introduced the distinction between the *semiotic* (the
  pre-Oedipal, rhythmic, bodily dimension of language associated with the
  maternal *chora*) and the *symbolic* (the rule-governed, propositional order),
  arguing that poetic language is a site where the semiotic erupts within and
  disrupts the symbolic. Her concept of *intertextuality* — that every text is a
  mosaic of quotations,的吸收 and transformation of other texts — reconceived
  authorship and influence. Her work on *abjection* (*Powers of Horror*, 1980)
  analyses how the subject is constituted through the violent expulsion of what
  threatens the boundaries of the self, offering a powerful lens for reading
  horror, the grotesque, and border phenomena.

---

### 7 Marxist Criticism / Materialist Analysis

#### 7.1 Marx — Base/Superstructure, Ideology, and Commodity Fetishism
- **Representative/proponent:** Karl Marx (1818–1883)
- **Summary:** Marx's historical materialism holds that the economic *base*
  (the forces and relations of production) conditions the legal, political, and
  cultural *superstructure*, though not in a mechanically deterministic way.
  His concept of *ideology* — the ruling ideas of any epoch are the ideas of
  its ruling class — treats cultural forms as expressions of class interests
  that naturalise historically contingent arrangements. The analysis of
  *commodity fetishism* in *Capital* reveals how social relations between
  persons assume the fantastic form of relations between things, providing a
  model for ideological critique of cultural artefacts.

#### 7.2 Althusser — Structural Marxism, Ideology, and Interpellation
- **Representative/proponent:** Louis Althusser (1918–1990)
- **Summary:** Althusser proposed an *epistemological break* between the early
  humanist Marx and the mature scientific Marx of *Capital*, developing a
  structural Marxism that decentres the subject and emphasises the relative
  autonomy of different social practices within a *structure in dominance*.
  His theory of ideology — elaborated in "Ideology and Ideological State
  Apparatuses" (1970) — argues that ideology "interpellates" individuals as
  subjects, hailing them into complicity with the existing order. Literature is
  understood as situated within the ideological field but capable, through its
  formal operations, of making ideology visible and thus open to critique.

#### 7.3 Jameson — Postmodernism, the Political Unconscious, and Cognitive Mapping
- **Representative/proponent:** Fredric Jameson (1934–2024)
- **Summary:** In *The Political Unconscious* (1981), Jameson argued that
  every literary text is a socially symbolic act and that interpretation must
  reconstruct the political unconscious of the narrative — the repressed
  historical contradictions that the text formally resolves at the level of the
  imaginary. His analysis of postmodernism as the "cultural logic of late
  capitalism" (*Postmodernism*, 1991) diagnosed the waning of historicity, the
  depthlessness of pastiche, and the fragmentation of the subject. Jameson's
  interpretive method insists on the horizon of totality, reading the aesthetic
  as the ideological and the individual text as a field of social forces.

#### 7.4 Eagleton — Rhetorical Materialism and the Politics of Criticism
- **Representative/proponent:** Terry Eagleton (1943–)
- **Summary:** Eagleton synthesises Marxist, psychoanalytic, and post-
  structuralist thought into a politically engaged mode of criticism that
  historicises the very category of the "literary" as an ideological
  construct. In *Literary Theory: An Introduction* (1983), he argued that all
  critical methods are political and that the task of criticism is not to
  contemplate aesthetic objects but to contribute to human emancipation. His
  work consistently examines the material conditions of cultural production and
  the relationship between aesthetic form and political ideology.

---

### 8 Feminist Criticism / Gender Theory

#### 8.1 Beauvoir — Existentialist Feminism and the Second Sex
- **Representative/proponent:** Simone de Beauvoir (1908–1986)
- **Summary:** In *The Second Sex* (1949), Beauvoir applied existentialist
  categories to the condition of women, arguing that "one is not born, but
  rather becomes, a woman" — that femininity is a social-historical
  construction, not a biological destiny. She analysed how patriarchal culture
  positions woman as the *Other* against which man defines himself as the
  transcendent Subject, condemning women to *immanence* (repetitive, bodily
  existence) while reserving transcendence (creative, self-defining action)
  for men. This distinction between sex and gender laid the groundwork for
  subsequent feminist theory.

#### 8.2 Cixous — Écriture Féminine and the Laugh of the Medusa
- **Representative/proponent:** Hélène Cixous (1937–)
- **Summary:** Cixous's concept of *écriture féminine* (feminine writing) is
  not writing *by* women but writing that escapes the phallogocentric order —
  the patriarchal symbolic system in which binary oppositions are hierarchically
  organised around the privilege of the masculine term. In "The Laugh of the
  Medusa" (1975), she called on women to "write themselves" from and through
  the body, producing a writing that overflows linear, rationalist, and
  proprietary modes of meaning. Her work links feminist liberation to a
  revolutionary practice of writing that undoes the closure of masculine
  discourse.

#### 8.3 Butler — Gender Performativity and the Heterosexual Matrix
- **Representative/proponent:** Judith Butler (1956–)
- **Summary:** In *Gender Trouble* (1990), Butler argued that gender is not an
  expression of an inner essence or a stable identity but a *performative*
  effect — constituted through the repeated stylisation of the body within a
  regulatory framework that she terms the *heterosexual matrix*. Drawing on
  Foucault, Austin's speech-act theory, and psychoanalysis, Butler showed that
  the apparent naturalness of sex-gender-desire coherence is produced through
  citational practices that simultaneously produce the "abject" bodies they
  exclude. This framework transformed gender from a noun to a verb, opening
  interpretation to the subversive possibilities of parodic repetition and
  resignification.

---

### 9 Postcolonial Criticism

#### 9.1 Said — Orientalism and Contrapuntal Reading
- **Representative/proponent:** Edward W. Said (1935–2003)
- **Summary:** In *Orientalism* (1978), Said demonstrated that the Western
  academic and literary discourse on "the Orient" is not a neutral description
  of an external reality but a system of representations that produced and
  managed the Orient as the West's silent, feminised, and inferior Other —
  simultaneously enabling and justifying colonial domination. Drawing on
  Foucault's discourse theory and Gramsci's concept of hegemony, Said examined
  how knowledge is implicated in power. His later concept of *contrapuntal
  reading* (*Culture and Imperialism*, 1993) calls for reading canonical
  Western texts against the grain, attending to the submerged colonial
  geographies and histories they both depend on and disavow.

#### 9.2 Spivak — Subaltern Studies and Strategic Essentialism
- **Representative/proponent:** Gayatri Chakravorty Spivak (1942–)
- **Summary:** In "Can the Subaltern Speak?" (1988), Spivak interrogated the
  epistemic violence by which Western intellectual discourse — including
  progressive scholarship — silences the *subaltern* (those structurally
  excluded from circuits of representation). She argued that the subaltern
  cannot speak and be heard within dominant discursive frameworks because the
  very act of representation appropriates and re-inscribes subaltern
  experience. Her concept of *strategic essentialism* acknowledges that
  marginalised groups may need to provisionally deploy essentialised identity
  claims for political purposes while remaining critically aware of their
  constructed character.

#### 9.3 Bhabha — Hybridity, Mimicry, and the Third Space
- **Representative/proponent:** Homi K. Bhabha (1949–)
- **Summary:** Bhabha theorises colonial discourse as fundamentally ambivalent
  rather than monolithic: the coloniser's demand that the colonised subject
  *mimic* colonial norms produces not replication but *hybridity* — a partial,
  distorted repetition that destabilises the authority it ostensibly
  reproduces. His concept of the *Third Space* of enunciation posits that
  cultural meaning is produced in the interstices between fixed identities,
  challenging binary models of coloniser/colonised and self/other. Bhabha's
  work opens interpretation to the "in-between" moments where cultural
  authority is negotiated and transformed.

---

### 10 New Historicism / Cultural Materialism

#### 10.1 Greenblatt — New Historicism and the Circulation of Social Energy
- **Representative/proponent:** Stephen Greenblatt (1943–)
- **Summary:** New Historicism, inaugurated by Greenblatt's *Renaissance Self-
  Fashioning* (1980), treats literary texts not as autonomous aesthetic objects
  but as embedded within a network of non-literary discourses (legal, medical,
  religious, colonial) with which they *circulate* and negotiate *social
  energy*. The method proceeds through the anecdote — seizing on a striking
  fragment of the historical archive and reading it alongside a literary text
  to reveal the shared cultural logic governing both. New Historicism rejects
  the totalising narratives of traditional historicism in favour of a
  Foucauldian attention to power's capillary operations and the text's
  capacity both to subvert and to contain subversion.
- **Note (Cultural Materialism):** The related British tradition of *Cultural
  Materialism* (Raymond Williams, Jonathan Dollimore, Alan Sinfield) shares New
  Historicism's attention to texts-in-context but retains a stronger commitment
  to political intervention, reading literature as a site of contestation
  between dominant, residual, and emergent cultural forces.

---

### 11 Reader-Response Criticism

#### 11.1 Iser — The Implied Reader and the Act of Reading
- **Representative/proponent:** Wolfgang Iser (1926–2007)
- **Summary:** Iser's phenomenological reader-response theory (*The Act of
  Reading*, 1978) shifts interpretive attention from the text as object to the
  reading process by which the text is *concretised*. Literary texts contain
  *gaps* or *blanks* (*Leerstellen*) — indeterminacies that the reader must
  fill through acts of ideation, connecting textual segments and constructing
  consistency. The *implied reader* is not an empirical individual but a
  textual structure that prefigures the repertoire of possible responses,
  making reading an act of co-creation negotiated between the text's
  instructions and the reader's disposition.

#### 11.2 Jauss — Reception Aesthetics and the Horizon of Expectation
- **Representative/proponent:** Hans Robert Jauss (1921–1997)
- **Summary:** Jauss's *reception aesthetics* (*Rezeptionsästhetik*) argues
  that the meaning of a literary work is constituted in the history of its
  reception, not fixed at the moment of its production. The *horizon of
  expectation* — the set of cultural, ethical, and literary norms that readers
  bring to a text in a given historical moment — is the framework against which
  a work is received; a work's aesthetic value is measured by the degree to
  which it disrupts, transcends, or fulfils this horizon. Literary history is
  thus a dialectical process of successive horizons of understanding.

#### 11.3 Fish — Interpretive Communities and Affective Stylistics
- **Representative/proponent:** Stanley Fish (1938–)
- **Summary:** Fish radicalised reader-response theory by arguing that meaning
  is not extracted from texts but produced by *interpretive communities* —
  groups of readers who share interpretive strategies, assumptions, and
  conventions that determine what counts as a fact, a meaningful pattern, or a
  valid reading. In *Is There a Text in This Class?* (1980), he contended that
  there is no stable textual object prior to interpretation because the
  interpretive strategies that constitute the text are the same strategies that
  produce its meaning. Interpretive disagreement is not a failure of method but
  evidence of competing interpretive communities.

---

### 12 Discourse Analysis

#### 12.1 Foucault — Discursive Formations and the Order of Discourse
- **Representative/proponent:** Michel Foucault (1926–1984)
- **Summary:** (See also §4.2.) Foucault's discourse analysis treats discourse
  not as a mere collection of signs referring to objects but as *practices
  that systematically form the objects of which they speak*. A *discursive
  formation* is a regular dispersion of statements governed by rules of
  formation — rules that determine what can be said, by whom, from what
  institutional position, and with what authority. Foucault's inaugural lecture
  *The Order of Discourse* (1971) identifies the *procedures of exclusion*
  (prohibition, the division between reason and madness, the will to truth),
  *internal procedures* (commentary, the author-function, disciplines), and
  *procedures of rarefaction* (ritual, discursive societies, doctrine, social
  appropriation) that control discourse production.

#### 12.2 Fairclough — Critical Discourse Analysis (CDA)
- **Representative/proponent:** Norman Fairclough (1941–)
- **Summary:** Fairclough's *Critical Discourse Analysis* (CDA) is a
  transdisciplinary method that analyses language use as a form of social
  practice, focusing on how discourse reproduces, legitimises, or challenges
  power relations and ideologies. His three-dimensional framework examines (1)
  the *text* (linguistic features such as vocabulary, grammar, cohesion), (2)
  *discursive practice* (the processes of text production, distribution, and
  consumption), and (3) *social practice* (the broader ideological and
  hegemonic structures within which discourse operates). CDA is explicitly
  normative, aiming not merely to describe but to expose and intervene in
  discursive dimensions of social injustice.

#### 12.3 Gee — Sociolinguistic Discourse Analysis and "Big D" Discourse
- **Representative/proponent:** James Paul Gee (1948–)
- **Summary:** Gee distinguishes between *discourse* (with a lowercase "d") —
  language-in-use, the stretches of connected speech or writing — and
  *Discourse* (with a capital "D") — the ways of being, doing, thinking,
  valuing, and interacting that integrate language with other symbolic systems,
  material practices, and social identities. Interpretation requires analysing
  how speakers and writers *build* seven things through language: significance,
  practices/activities, identities, relationships, politics, connections, and
  sign systems/knowledge. Gee's framework provides a toolkit for close analysis
  of how individuals enact and negotiate social positioning in situated
  language use.

---

### 13 Semiotics

#### 13.1 Peirce — Triadic Semiotics and the Interpretant
- **Representative/proponent:** Charles Sanders Peirce (1839–1914)
- **Summary:** Peirce developed a *triadic* theory of the sign in which a sign
  (or *representamen*) stands for an *object* to an *interpretant* — the effect
  or further sign produced in the mind of the interpreter. Unlike Saussure's
  dyadic model, Peirce's account is irreducibly triadic and involves a
  potentially unlimited process of *semiosis*: every interpretant is itself a
  sign that generates further interpretants. Peirce's famous trichotomy
  classifies signs as *icons* (resemblance), *indexes* (causal or physical
  connection), and *symbols* (convention), providing a nuanced taxonomy for
  analysing how different modes of signification operate.

#### 13.2 Eco — Interpretive Semiotics, the Open Work, and the Model Reader
- **Representative/proponent:** Umberto Eco (1932–2016)
- **Summary:** Eco synthesised Peircean semiotics with structuralism and
  reader-response theory, developing an *interpretive semiotics* that navigates
  between the Scylla of authorial intention (the text means whatever the author
  intended) and the Charybdis of unlimited semiosis (the text means whatever
  any reader takes it to mean). His concept of the *open work* (*opera aperta*,
  1962) argues that the artwork is a field of possibilities that invites the
  performer or reader's active collaboration while constraining the range of
  legitimate interpretations. The *Model Reader* is not an empirical reader but
  a textual strategy — the set of competences and moves the text presupposes
  and attempts to produce — and interpretation is the dialectic between the
  text's *intentio operis* and the reader's *intentio lectoris*.

---

## PART B: English Literature Methodologies

### 1 Close Reading / Practical Criticism

#### 1.1 Richards — Practical Criticism and the Analysis of Reading
- **Representative/proponent:** I. A. Richards (1893–1979)
- **Summary:** Richards pioneered *Practical Criticism* (1929) through an
  experiment in which Cambridge undergraduates were given anonymised poems to
  analyse, revealing widespread failures of close attention — stock responses,
  sentimentality, doctrinal adherence, and technical confusion. He developed a
  systematic framework for analysing the *meaning* of a text across four
  functions (sense, feeling, tone, intention) and investigated the
  psychological processes of reading. His work established the close-reading
  protocols that became the pedagogical backbone of English studies.

#### 1.2 Empson — Seven Types of Ambiguity
- **Representative/proponent:** William Empson (1906–1984)
- **Summary:** Empson's *Seven Types of Ambiguity* (1930) transformed the
  analysis of poetic language by demonstrating that *ambiguity* — a word or
  grammatical structure that gives "room for alternative reactions to the same
  piece of language" — is not a flaw but a fundamental resource of literary
  meaning. His method of verbal analysis traces the interplay of multiple
  senses compressed into a single word or phrase, showing how ambiguity
  condenses complex attitudes and tensions. Empson's work embodies the
  conviction that the closest possible attention to language yields the richest
  interpretive insight.

#### 1.3 New Criticism — Brooks, Ransom, Wimsatt & Beardsley
- **Representative/proponent:** Cleanth Brooks (1906–1994), John Crowe Ransom
  (1888–1974), W. K. Wimsatt (1907–1975) & Monroe C. Beardsley (1915–1985)
- **Summary:** The American New Critics established close reading as the
  discipline's central interpretive practice, insisting that the literary text
  should be analysed as an autonomous, self-contained verbal object.
  Foundational doctrines include the *intentional fallacy* (Wimsatt & Beardsley,
  1946: the author's intention is neither available nor relevant as a standard
  for judging a work's meaning) and the *affective fallacy* (the reader's
  emotional response is equally unreliable). Brooks's *The Well Wrought Urn*
  (1947) argued that poetry is structured by *paradox*, *irony*, and
  *ambiguity* — the poem does not state a proposition but dramatises tensions
  that are held in organic unity by its formal structure. Ransom's concept of
  *texture* versus *structure* distinguished the irreducible particularity of
  poetic language from the paraphrasable argument.

---

### 2 Biographical Criticism

#### 2.1 Life-and-Works Approach and the Intentionalist Tradition
- **Representative/proponent:** Samuel Johnson (1709–1784), various
- **Summary:** Biographical criticism reads literary works as expressions of
  their author's life, personality, and formative experiences, treating the
  text as a document from which the contours of a lived existence can be
  reconstructed and against which it can be illuminated. The nineteenth century
  elevated this approach into a dominant paradigm — Sainte-Beuve's *portraits
  littéraires* and the Victorian "life and letters" tradition. While New
  Criticism's intentional fallacy challenged the equation of meaning with
  authorial psychology, biographical criticism persists in historically
  informed scholarship that treats the author's circumstances not as a key to
  definitive meaning but as a context among others that enriches interpretive
  possibility.

---

### 3 Historical Criticism / Source Criticism

#### 3.1 Historicist Method and the Study of Sources and Influences
- **Representative/proponent:** Various; foundational in nineteenth-century
  philology and literary history
- **Summary:** Historical criticism situates literary texts within the
  intellectual, political, social, and material conditions of their period of
  production, tracing sources, influences, and intertextual relationships to
  reconstruct the work's original horizon of meaning. Source criticism
  (*Quellenforschung*) developed in nineteenth-century German philology as a
  rigorous method for identifying a text's precursors and charting the
  transmission and transformation of motifs, plots, and ideas. While older
  historicism sought to establish the single correct meaning by reference to
  the work's original context, contemporary historical criticism — influenced
  by New Historicism (§A.10) and reception theory (§A.11) — acknowledges the
  multiplicity of historical contexts and the interpreter's own historical
  situatedness.

---

### 4 Archetypal / Myth Criticism

#### 4.1 Jung — Archetypes and the Collective Unconscious
- **Representative/proponent:** Carl Gustav Jung (1875–1961)
- **Summary:** Jung's theory of the *collective unconscious* posits that
  beneath the personal unconscious lies a deeper layer of inherited
  psychological structures — *archetypes* — primordial images and narrative
  patterns (the Hero, the Shadow, the Anima/Animus, the Wise Old Man, the Great
  Mother) that recur across cultures and historical periods. Archetypal
  criticism reads literary works as expressions of these universal psychic
  structures, tracing the recurrence of archetypal figures, symbols, and
  situations. Jung's work on *individuation* — the lifelong process of
  integrating conscious and unconscious elements of the psyche — provides a
  narrative template for reading character development and quest narratives.

#### 4.2 Frye — Anatomy of Criticism and the Mythoi
- **Representative/proponent:** Northrop Frye (1912–1991)
- **Summary:** In *Anatomy of Criticism* (1957), Frye proposed a comprehensive,
  systematic framework for literary interpretation organised around four
  archetypal *mythoi* (narrative categories) aligned with the seasons: *comedy*
  (spring), *romance* (summer), *tragedy* (autumn), and *irony/satire* (winter).
  He argued that literature constitutes an autonomous order of words — a self-
  contained universe — and that criticism should be a systematic science rather
  than a belletristic adjunct to reading. Frye displaced the evaluative
  question "Is this a good work?" with the analytic question "What is its
  place in the total structure of literature?"

#### 4.3 Campbell — The Monomyth and the Hero's Journey
- **Representative/proponent:** Joseph Campbell (1904–1987)
- **Summary:** In *The Hero with a Thousand Faces* (1949), Campbell proposed
  the *monomyth* — a universal narrative pattern underlying myths, legends, and
  stories across cultures — structured in three stages: *departure*,
  *initiation*, and *return*. The hero ventures from the ordinary world into a
  realm of supernatural wonder, confronts and overcomes trials, and returns
  bearing a boon for the community. While Campbell's universalising claims have
  been critiqued for flattening cultural difference, the monomyth remains a
  widely used interpretive template in literary and media analysis.

---

### 5 Narrative Theory / Narratology

#### 5.1 Propp — Morphology of the Folktale
- **Representative/proponent:** Vladimir Propp (1895–1970)
- **Summary:** In *Morphology of the Folktale* (1928), Propp analysed a corpus
  of Russian fairy tales and identified thirty-one invariant *functions* —
  fundamental units of narrative action (e.g., "villainy," "departure," "the
  hero is tested," "struggle," "victory") — that always appear in the same
  sequence, though not every tale contains every function. He also identified
  seven *character spheres* or *dramatis personae* (villain, donor, helper,
  princess/sought-for-person, dispatcher, hero, false hero). Propp's
  morphological approach established the foundation for structuralist
  narratology.

#### 5.2 Genette — Narrative Discourse and the Categories of Narratology
- **Representative/proponent:** Gérard Genette (1930–2018)
- **Summary:** In *Narrative Discourse* (1972), Genette developed a rigorous
  analytical taxonomy of narrative organised around five central categories:
  *order* (the relationship between the chronological sequence of events and
  their arrangement in the narrative, including analepsis and prolepsis),
  *duration* (the ratio of narrative time to story time, including scene,
  summary, ellipsis, and pause), *frequency* (whether an event is narrated
  once, multiple times, or repeatedly), *mood* (the regulation of narrative
  information through *distance* and *focalisation*), and *voice* (the
  narrating instance — who speaks, at what level, and from what temporal
  position). This framework remains narratology's standard reference point.

#### 5.3 Bal — Narratology: A Systematic Introduction
- **Representative/proponent:** Mieke Bal (1946–)
- **Summary:** Bal's *Narratology* (1985) systematised and extended earlier
  structuralist narratology into an accessible, pedagogically rigorous
  framework centred on the distinction between three layers: *fabula* (the
  chronological, causal sequence of events), *story* (the events as arranged
  and focalised — seen from a particular perspective), and *text* (the
  linguistic or medial articulation). Her treatment of *focalisation* — who
  sees versus who speaks — refined Genette's categories and has become a
  standard analytical tool. Bal insists that narratology is not a value-free
  formalism but a cultural analysis that reveals the ideological work performed
  by narrative structures.

#### 5.4 Chatman — Story and Discourse
- **Representative/proponent:** Seymour Chatman (1928–2015)
- **Summary:** In *Story and Discourse* (1978), Chatman provided a lucid
  synthesis of narratological theory, building on the formalist distinction
  between *story* (the *what* — the chain of events and existents: characters
  and settings) and *discourse* (the *how* — the means by which the story is
  communicated). He analysed narrative structure through the interplay of
  events (kernels and satellites) and existents, and he contributed
  significantly to the theory of narrative point of view and the implied
  author/implied reader relationship. Chatman's work bridged continental
  narratology and Anglo-American narrative theory.

---

### 6 Rhetorical Criticism

#### 6.1 Booth — The Rhetoric of Fiction and the Implied Author
- **Representative/proponent:** Wayne C. Booth (1921–2005)
- **Summary:** In *The Rhetoric of Fiction* (1961), Booth argued that every
  narrative is an act of communication in which an *implied author* — the
  version of the author constructed by the text — makes available to the reader
  the norms, values, and judgments that govern the narrative world. He
  introduced the concept of the *unreliable narrator* and analysed the ethical
  dimension of narrative technique, arguing that the choices a narrator makes
  about what to tell and how to tell it are always also rhetorical choices that
  shape the reader's moral and affective alignment. Booth later developed these
  concerns into a full theory of ethical criticism (*The Company We Keep*,
  1988), proposing that texts function as "friends" with whom readers enter
  into ethically evaluable relationships.

#### 6.2 Burke — Dramatism, Identification, and Literature as Equipment for Living
- **Representative/proponent:** Kenneth Burke (1897–1993)
- **Summary:** Burke's *dramatism* analyses human action — including literary
  works — through the *dramatistic pentad*: act, scene, agent, agency, and
  purpose, providing a grammar of motives that can be used to analyse any
  symbolic action. His concept of *identification* reconfigures rhetoric from
  persuasion to the processes by which individuals form and maintain
  consubstantiality with others — shared substance — often at the unconscious
  level. Burke's essay "Literature as Equipment for Living" (1938) argued that
  literary works are strategic, stylised responses to recurring human
  situations, functioning as proverbs writ large: they name and provide
  attitudes toward typical social and existential predicaments. His method
  reads literature as a form of symbolic action oriented toward the management
  of social and psychological tensions.

---

### 7 Genre Criticism

#### 7.1 Genre Theory, Generic Expectations, and the Social Life of Forms
- **Representative/proponent:** Various; key theorists include Northrop Frye
  (see §B.4.2), Tzvetan Todorov (1939–2017), and Fredric Jameson (see §A.7.3)
- **Summary:** Genre criticism analyses literary works through the categories,
  conventions, and expectations that constitute literary kinds — tragedy,
  comedy, epic, lyric, novel, romance, Gothic, and so forth. Genre is
  understood not as a prescriptive taxonomy but as a *horizon of expectation*
  (Jauss) that shapes both production and reception: writers work within, against,
  and across generic conventions, and readers activate generic frameworks to
  orient their interpretation. Todorov argued that genres are *institutions*
  that function as "contracts" between writer and reader, while more recent
  genre theory (influenced by Jameson and cultural studies) treats genres as
  *social forms* — sedimented responses to historical conditions — whose
  mutations and hybridisations register ideological change.

---

### 8 Thematic Criticism

#### 8.1 Thematics — Motif, Theme, and Thematisation
- **Representative/proponent:** Various; formalised by scholars including
  Menachem Brinker, Shlomith Rimmon-Kenan, and Claude Bremond
- **Summary:** Thematic criticism takes the *theme* — the abstract idea, issue,
  or concern that a literary work explores — as its primary interpretive
  object, tracing how motifs (recurrent concrete elements: images, objects,
  phrases) are patterned and transformed into thematic structures. Unlike
  allegorical criticism, which decodes a text's surface to uncover a hidden
  message, thematic criticism treats theme as an emergent property of the
  work's total formal organisation — something the work *enacts* rather than
  merely *states*. The method attends to the tension between the uniqueness of
  a work's concrete particulars and the generalisability of the themes they
  embody, and it often proceeds comparatively, mapping thematic constellations
  across oeuvres, periods, or national traditions.

---

### 9 Comparative Literature Approach

#### 9.1 Comparative Method — Influence, Reception, and Transnational Literary Relations
- **Representative/proponent:** Various; foundational figures include Johann
  Wolfgang von Goethe (concept of *Weltliteratur*), Hugo Meltzl de Lomnitz, and
  more recently David Damrosch, Gayatri Spivak, and Emily Apter
- **Summary:** Comparative literature eschews the framework of the single
  national tradition, studying literary phenomena across linguistic, cultural,
  and temporal boundaries. The approach encompasses the study of *influence*
  and *reception* (how one writer or tradition is taken up and transformed by
  another), *thematology* (the transnational migration of themes, motifs, and
  myths), *genre studies* across traditions, and the relationship between
  literature and other arts and disciplines. In its contemporary inflection —
  influenced by postcolonial criticism and translation studies — comparative
  literature interrogates the very categories (national tradition, period,
  "major" vs. "minor" literature) that organise literary study, attending to
  the asymmetries of power that shape global literary circulation.

---

### 10 Stylistics / Linguistic Criticism

#### 10.1 Linguistic Stylistics — Foregrounding, Deviation, and the Grammar of Style
- **Representative/proponent:** Roman Jakobson (1896–1982), Geoffrey Leech
  (1936–2014), Michael Halliday (1925–2018), Roger Fowler (1938–1999)
- **Summary:** Stylistics applies the analytical tools of linguistics —
  phonology, morphology, syntax, semantics, pragmatics, and discourse analysis —
  to literary texts, treating style as motivated choice rather than decorative
  surface. The Russian Formalist concept of *foregrounding* (*ostranenie* or
  defamiliarisation) — whereby literary language deviates from or
  over-regularises ordinary usage to make perception fresh and strange — is
  foundational. Halliday's functional grammar provides tools for analysing how
  transitivity patterns, modality, and thematic structure construct point of
  view and world-view, while Fowler's *linguistic criticism* insists that the
  linguistic analysis of style is inseparable from social and ideological
  analysis.

---

### 11 Cognitive Poetics

#### 11.1 Cognitive Approaches to Literature — Figure/Ground, Mental Spaces, and Conceptual Blending
- **Representative/proponent:** Reuven Tsur, Peter Stockwell, Mark Turner,
  Lisa Zunshine
- **Summary:** Cognitive poetics draws on cognitive science, cognitive
  linguistics, and cognitive psychology to analyse how literary texts engage
  and manipulate the general cognitive processes by which humans make sense of
  the world. Key concepts include *figure and ground* (the perceptual
  organisation of attention in textual worlds), *schema theory* (how readers
  activate, refresh, and disrupt cognitive frames), *mental spaces* and
  *conceptual blending* (Fauconnier & Turner: the cognitive operation by which
  elements from different mental spaces are projected into a new, integrated
  space to produce emergent meaning — fundamental to metaphor, counterfactual
  thought, and narrative understanding). Cognitive poetics reframes traditional
  literary-critical questions about interpretation, emotion, and aesthetic
  effect in terms of empirically grounded models of mind.

---

### 12 Ecocriticism / Green Reading

#### 12.1 Ecocriticism — Literature, Environment, and the Anthropocene
- **Representative/proponent:** Lawrence Buell, Cheryll Glotfelty, Greg
  Garrard, Timothy Morton
- **Summary:** Ecocriticism is the study of the relationship between literature
  and the physical environment, motivated by an ethical commitment to
  ecological thinking in an era of environmental crisis. The approach examines
  how literary texts represent nature, construct human relationships to the
  non-human world, and encode or challenge the anthropocentric assumptions
  underlying ecological destruction. Key concepts include *pastoral* (and its
  ideological functions), *wilderness* (as cultural construct), *place* and
  *bioregionalism*, *environmental justice*, and, in more recent work, the
  *Anthropocene* — the proposed geological epoch in which human activity is the
  dominant force shaping the planet. Morton's concept of *dark ecology*
  challenges the romanticisation of nature, insisting on the entanglement of
  the human and the non-human in networks of coexistence that are as unsettling
  as they are sustaining.

---

### 13 Queer Theory in Literary Studies

#### 13.1 Sedgwick — Epistemology of the Closet and Queer Reading
- **Representative/proponent:** Eve Kosofsky Sedgwick (1950–2009)
- **Summary:** In *Epistemology of the Closet* (1990), Sedgwick argued that the
  homo/heterosexual binary is not a marginal concern but a central organising
  category of modern Western culture, structuring fundamental epistemological
  questions about knowledge, ignorance, secrecy, and disclosure. She developed
  the concept of *homosocial desire* — the continuum of male bonds that are
  simultaneously required and policed by patriarchal culture — and drew
  attention to the *paranoid reading* practices that dominate critical theory,
  proposing a reparative alternative. Queer reading, as Sedgwick practised it,
  attends to the non-normative desires, identifications, and pleasures that
  texts encode and enable, refusing the reduction of queer meaning to a single
  diagnostic gesture and instead multiplying the possibilities for relation and
  inhabitation that texts afford.

---

### 14 Disability Studies in Literature

#### 14.1 Disability Theory — The Social Model, Narrative Prosthesis, and Cripistemology
- **Representative/proponent:** Lennard J. Davis, Rosemarie Garland-Thomson,
  David T. Mitchell & Sharon L. Snyder, Tobin Siebers
- **Summary:** Disability studies in literature challenges medical and
  deficit-based models of disability, which locate the "problem" in the
  individual body, in favour of a *social model* that analyses disability as
  produced by environments, attitudes, and representational practices that
  exclude non-normative bodies and minds. Mitchell and Snyder's concept of
  *narrative prosthesis* argues that disability is a "crutch" upon which
  narrative leans — a device that drives plot and generates meaning while the
  disabled character's own experience is effaced. The approach analyses how
  literary texts deploy disability as metaphor (the blind seer, the crippled
  villain), how disabled characters are positioned within narrative structures,
  and how disabled writers and artists have developed alternative aesthetic
  practices — what some theorists term *cripistemology* — that refuse the
  demand for cure or normalisation and instead explore disability as a site of
  knowledge, creativity, and community.

---

*End of draft content catalogue. Methodologies A.1–A.13 and B.1–B.14 as
enumerated above comprise the interpretive schema for the parser aide. The
quote-snippet and matching-elements columns (Explainer spec) are to be
populated in a subsequent build pass.*
