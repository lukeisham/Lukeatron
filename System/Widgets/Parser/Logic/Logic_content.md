---
type: content-source
title: "Logic — Content Source"
description: "Exhaustive taxonomy of formal/informal fallacies and syllogism forms for the Logic parser aide; outline-numbered per AD-3 convention."
status: draft
provenance: |
  Content drafted 2026-07-09 from standard open-source logic reference material.
  Fallacy definitions, syllogism forms, and worked examples are drawn from
  well-documented public-domain knowledge in the fields of classical logic,
  informal logic, and critical thinking. No single copyrighted source was
  reproduced; all content is original synthesis of standard logical taxonomies.

  Local Logic folders (Fallacies/, Syllogisms and Fallacies Database/,
  Ways of Thinking/) were found empty per directory listing 2026-07-06.
  This file was therefore drafted from fresh research rather than compiled
  from existing local material.
---

> **STATUS: DRAFT — pending Luke review**

# Logic Content

## 1. Formal Fallacies (Deductive)

1. *Formal Fallacies*
   Errors in the logical structure (form) of a deductive argument that render it invalid regardless of the truth of its premises. An argument commits a formal fallacy when its conclusion does not logically follow from its premises by the rules of the deductive system in use.

1.1 Affirming the Consequent
   A formal fallacy in which the conditional premise "If P then Q" is followed by the assertion of Q, and from this the invalid conclusion that P must therefore be true is drawn. The truth of the consequent does not guarantee the truth of the antecedent.
   Example: "If it rained, the pavement is wet. The pavement is wet. Therefore, it rained." (The pavement could be wet because a sprinkler ran.)

1.2 Denying the Antecedent
   A formal fallacy in which the conditional premise "If P then Q" is followed by the denial of P, and from this the invalid conclusion that Q must therefore be false is drawn. The falsity of the antecedent does not guarantee the falsity of the consequent.
   Example: "If she is the CEO, she has a corner office. She is not the CEO. Therefore, she does not have a corner office." (She could have a corner office for another reason.)

1.3 Affirming a Disjunct
   A formal fallacy involving an exclusive disjunction ("P or Q, but not both") in which one disjunct is affirmed as true, and from this the invalid conclusion that the other must be false is drawn. The fallacy occurs when the disjunction is not genuinely exclusive.
   Example: "Either John is at the library or he is studying. John is at the library. Therefore, he is not studying." (He could be studying at the library.)

1.4 Denying a Conjunct
   A formal fallacy in which the denial of one conjunct of a conjunction is treated as sufficient to deny the entire conjunction or to affirm the opposite of the remaining conjunct. A conjunction is false if any conjunct is false, but this does not license arbitrary inferences about the remaining conjunct.
   Example: "It is not true that the burglar was both tall and left-handed. The burglar was not tall. Therefore, the burglar was left-handed." (The burglar could have been neither tall nor left-handed.)

1.5 Fallacy Fallacy (Argument from Fallacy)
   The error of concluding that a claim is false solely because an argument advanced in its favour contains a logical fallacy. A bad argument for a conclusion does not make the conclusion itself false.
   Example: "Bob's argument for climate change contains a false dilemma, so climate change must not be happening." (The conclusion might be true even if Bob argued for it poorly.)

1.6 Argument from Personal Incredulity
   The error of concluding that a proposition must be false because one finds it personally difficult to understand or imagine. Difficulty of comprehension is not evidence against a claim.
   Example: "I cannot imagine how the eye could have evolved by natural selection; therefore, it must have been designed." (Personal inability to imagine a mechanism does not constitute a refutation of that mechanism.)

1.7 Sunk Cost Fallacy
   A reasoning error in which past irrecoverable investments (time, money, effort) are treated as a reason to continue a course of action, rather than evaluating only future costs and benefits. Past costs are sunk and should not influence forward-looking decisions.
   Example: "We have already spent $10 million on this project; we cannot abandon it now." (The $10 million is gone regardless. The only relevant question is whether future spending will yield a net benefit.)

1.8 Existential Fallacy
   A formal fallacy in categorical logic in which a universal proposition (All S are P, or No S are P) is used to infer a particular proposition (Some S are P, or Some S are not P) without establishing that the subject class S has any members. Under modern (Boolean) interpretation, universal statements carry no existential import.
   Example: "All unicorns have a single horn. Therefore, some unicorns have a single horn." (If the class of unicorns is empty, the conclusion does not follow.)

## 2. Informal Fallacies

2. *Informal Fallacies*
   Errors in reasoning that arise not from a flaw in logical form but from the content, context, or manner of the argument — including appeals to irrelevant considerations, ambiguous language, unwarranted presumptions, and faulty generalisations.

### 2.1 Fallacies of Relevance

2.1.0 *Fallacies of Relevance*
   Arguments in which the premises are logically irrelevant to the truth of the conclusion but are presented as though they provide support. The premises may be psychologically persuasive but do not constitute genuine evidence for the claim.

2.1.1 Ad Hominem (Abusive)
   Attacking the person making an argument rather than addressing the argument itself. The character, circumstances, or actions of the arguer are irrelevant to the logical merit of their argument.
   Example: "You cannot trust Dr. Smith's research on nutrition — he is overweight." (Dr. Smith's weight has no bearing on whether his data and methods are sound.)

2.1.2 Tu Quoque (Appeal to Hypocrisy)
   A subtype of ad hominem that dismisses an argument by alleging that the arguer's own behaviour is inconsistent with their position. Hypocrisy does not falsify a claim.
   Example: "You tell me to stop smoking, but you smoke yourself. Therefore, smoking cannot be that harmful." (The speaker's behaviour does not change the medical evidence.)

2.1.3 Genetic Fallacy
   Judging a claim as true or false based on its origin or history rather than on its current merits. Where an idea came from is irrelevant to whether it is correct.
   Example: "That mathematical theorem was first proposed in a dream, so it cannot be reliable." (The origin of the idea does not affect its mathematical validity.)

2.1.4 Appeal to Authority (Argumentum ad Verecundiam)
   Claiming a proposition is true because an authority figure says it is true, without the authority being a legitimate expert in the relevant domain. Even legitimate authorities can be wrong; their say-so is not a substitute for evidence.
   Example: "A Nobel Prize–winning physicist says that this investment strategy is sound, so it must be." (Expertise in physics does not transfer to finance.)

2.1.5 Appeal to Emotion (Argumentum ad Passiones)
   Manipulating an emotional response in place of presenting a valid argument. Emotions may be salient to a decision but do not constitute logical support for a factual claim.
   Example: "You must find the defendant not guilty. Think of the suffering his family will endure if he is convicted." (The family's suffering, while real, is irrelevant to whether the defendant committed the crime.)

2.1.6 Appeal to Pity (Argumentum ad Misericordiam)
   A specific form of appeal to emotion in which pity or compassion is elicited to support a conclusion that does not logically follow.
   Example: "I know I failed every exam, but my grandmother is ill and I have been under so much stress. Please give me a passing grade." (The circumstances, however sympathetic, do not demonstrate mastery of the material.)

2.1.7 Appeal to Force (Argumentum ad Baculum)
   Using a threat of harm or negative consequence, whether explicit or implied, as a substitute for reasoning. Coercion does not constitute logical justification.
   Example: "You should agree that this policy is correct, unless you want to find yourself looking for a new job." (The threat does not make the policy correct.)

2.1.8 Irrelevant Conclusion (Ignoratio Elenchi)
   Presenting an argument that may itself be valid but whose conclusion is not the one at issue. The arguer proves something other than what was to be established.
   Example: "The prosecution has shown that the defendant was near the crime scene and had a motive. Therefore, the defendant is guilty." (Proximity and motive do not by themselves establish guilt; the argument fails to address whether the defendant actually committed the act.)

2.1.9 Straw Man
   Misrepresenting an opponent's position — typically by exaggerating, oversimplifying, or fabricating a weaker version of it — and then attacking that misrepresentation rather than the actual argument.
   Example: "Senator Jones wants to reduce defence spending by 5%. He clearly wants to leave our country defenceless against our enemies." (A 5% reduction is not equivalent to total disarmament.)

2.1.10 Red Herring
   Introducing an irrelevant topic into a discussion in order to divert attention from the original issue. The distraction may be subtle or overt but serves to change the subject.
   Example: "You ask whether the new tax policy is fair, but what we should really be talking about is whether taxpayers are getting value for their money in other areas." (The question of fairness is evaded by shifting to a different issue.)

2.1.11 Poisoning the Well
   Discrediting a source or person before they have presented their argument, so that any evidence they subsequently offer is pre-emptively dismissed. The tactic taints the audience's reception before the argument can be heard.
   Example: "Before my opponent speaks, you should know that he has been caught lying to the press on three separate occasions. Take anything he says with a grain of salt." (The audience is primed to reject the argument before it is even presented.)

2.1.12 Guilt by Association
   Rejecting a claim or discrediting a person because of their association with a disliked group or individual. The merits of a claim are independent of the company the claimant keeps.
   Example: "You support that policy? That is the same policy endorsed by the extremist fringe." (The identity of others who hold the view does not determine its truth.)

### 2.2 Fallacies of Ambiguity

2.2.0 *Fallacies of Ambiguity*
   Errors that arise from ambiguous, vague, or shifting meanings of words or grammatical constructions within an argument. The argument's apparent plausibility depends on the ambiguity.

2.2.1 Equivocation
   Using a word or phrase in two different senses within the same argument, treating the shift in meaning as though the word were used consistently. The argument is valid only if the term is used univocally.
   Example: "A feather is light. What is light cannot be dark. Therefore, a feather cannot be dark." (The word "light" shifts from "low in weight" to "illuminated.")

2.2.2 Amphiboly
   A fallacy arising from ambiguous grammatical structure in a sentence, allowing it to be interpreted in two different ways. The ambiguity is syntactic rather than lexical.
   Example: "The duke yet lives that Henry shall depose." (Does Henry depose the duke, or does the duke depose Henry? The grammar makes both readings possible, and an argument that treats one reading as the only one commits amphiboly.)

2.2.3 Accent (Fallacy of Emphasis)
   Changing the meaning of a statement by placing stress or emphasis on a particular word or phrase, or by quoting a statement out of its original context in a way that alters its intended sense.
   Example: "I never said she stole the money." (Depending on which word is stressed — I, never, said, she, stole, money — the meaning shifts. An argument that exploits this shift commits the fallacy.)

2.2.4 Composition
   Assuming that what is true of the parts of a whole must be true of the whole itself. The properties of constituents do not necessarily transfer to the composite entity.
   Example: "Every player on this team is the best in the league at their position. Therefore, this team is the best in the league." (A collection of individual stars does not guarantee a cohesive, winning team.)

2.2.5 Division
   The converse of composition: assuming that what is true of a whole must be true of each of its parts. The properties of the whole do not necessarily distribute to its constituents.
   Example: "This corporation is highly profitable. Therefore, every division of the corporation must be highly profitable." (The corporation could be profitable overall while containing loss-making divisions.)

2.2.6 Etymological Fallacy
   Arguing that the present meaning of a word must be determined by, or is the same as, its historical or etymological origin. Language changes over time, and current usage determines current meaning.
   Example: "The word 'awful' originally meant 'full of awe' or 'inspiring wonder.' Therefore, describing something as awful should be understood as high praise." (Modern usage has shifted the meaning to "very bad" or "terrible.")

2.2.7 Quoting Out of Context
   Selectively extracting words or passages from a source in a way that distorts or reverses the intended meaning, and using the extracted fragment as though it represented the source's actual position. Also known as contextomy.
   Example: A film review states: "The movie was a non-stop thrill ride — if by 'thrill ride' you mean a slow, grinding descent into boredom." The poster quotes only: "A non-stop thrill ride!" (The excerpt reverses the reviewer's actual judgment.)

### 2.3 Fallacies of Presumption

2.3.0 *Fallacies of Presumption*
   Arguments that depend on an unwarranted or hidden assumption embedded within the premises. The conclusion may follow from the premises, but at least one premise is itself unsupported, question-begging, or false.

2.3.1 Begging the Question (Petitio Principii)
   Assuming the truth of the conclusion within one of the premises. The argument's premise restates or presupposes what it is supposed to prove, creating a circular structure.
   Example: "This medicine works because it has therapeutic efficacy." (The claim that it "works" and that it has "therapeutic efficacy" are the same claim in different words.)

2.3.2 Complex Question (Plurium Interrogationum)
   Framing a question that contains an embedded, unproven assumption, such that any direct answer to the question implicitly concedes the assumption. Also known as a loaded question.
   Example: "Have you stopped cheating on your taxes?" (Either a "yes" or "no" answer concedes that the respondent has cheated on their taxes at some point.)

2.3.3 False Dilemma (False Dichotomy)
   Presenting a limited set of alternatives — typically two — as though they are the only available options, when in fact other possibilities exist. The argument forces a choice between artificially restricted options.
   Example: "Either you support the war, or you are against our troops." (One could oppose the war while still supporting the welfare of the troops — these are not the only two positions.)

2.3.4 Special Pleading
   Applying a standard, rule, or principle to others while claiming an exemption for oneself or one's own case without providing a relevant justification for the exception. The exemption is arbitrary.
   Example: "All politicians should be subject to the same financial disclosure laws — except for me, because disclosure would compromise my privacy." (The appealed-to principle of privacy applies equally to all politicians, yet only the speaker claims exemption.)

2.3.5 No True Scotsman
   A defence of a universal generalisation by redefining the category to exclude counter-examples ad hoc, rather than revising the original claim. The definition is shifted to protect the generalisation from falsification.
   Example: "No Scotsman puts sugar on his porridge." "My uncle Angus is a Scotsman and he puts sugar on his porridge." "Well, no true Scotsman puts sugar on his porridge." (The definition of "Scotsman" is retroactively modified to preserve the claim.)

2.3.6 Moving the Goalposts
   Changing the standard of evidence required for a claim after the original standard has been met, so that the claim can never be satisfied. The criterion for success is continually shifted.
   Example: "If you can show me one peer-reviewed study supporting that treatment, I will believe it." (Study is presented.) "Well, one study is not enough. I need to see a meta-analysis of at least ten studies." (The evidentiary requirement was raised after being met.)

2.3.7 Burden of Proof (Shifting the Burden)
   Illegitimately placing the burden of disproof on the opponent rather than accepting the obligation to provide evidence for one's own claim. The party making a positive claim bears the burden of supporting it.
   Example: "I believe that telepathy is real. Prove that it is not." (The claimant bears the burden of providing evidence for the existence of telepathy, not the sceptic for disproving it.)

2.3.8 Loaded Language
   Using emotionally charged or value-laden terms in the framing of a premise so that the conclusion is smuggled into the language itself, bypassing rational evaluation.
   Example: "This courageous freedom fighter stood against the brutal regime." (The terms "courageous" and "brutal" embed value judgments as though they were neutral descriptions.)

2.3.9 False Cause (Non Causa Pro Causa)
   Treating something as a cause of an event when it is not actually a cause. The inferred causal relationship does not exist or is unsupported.
   Example: "Every time I wash my car, it rains. My car-washing causes rain." (The temporal coincidence does not establish a causal connection.)

2.3.10 Post Hoc Ergo Propter Hoc
   A specific form of false cause in which one event is assumed to be caused by another simply because it occurred after it. Temporal sequence alone does not establish causation.
   Example: "The rooster crows before sunrise every morning. Therefore, the rooster's crowing causes the sun to rise." (The rooster's crow precedes the sunrise, but does not cause it.)

2.3.11 Cum Hoc Ergo Propter Hoc
   A form of false cause in which correlation between two variables is taken as evidence that one causes the other, without considering that both might be caused by a third factor, or that the correlation is coincidental.
   Example: "Ice cream sales and drowning deaths both increase in summer. Therefore, eating ice cream causes drowning." (Both are correlated with a third variable: warm weather.)

2.3.12 Slippery Slope
   Asserting that a relatively small first step will inevitably lead to a chain of related events culminating in a significant (usually negative) outcome, without providing adequate evidence that the chain of causation is necessary or probable.
   Example: "If we allow students to redo failed exams, next they will expect to redo every assignment, and eventually no one will take any assessment seriously, and educational standards will collapse." (Each link in the chain requires its own justification.)

2.3.13 Circular Reasoning
   A broader form of begging the question in which the conclusion is supported by a chain of reasoning that ultimately loops back to rely on the conclusion itself. The argument provides no independent support.
   Example: "The Bible is the word of God because the Bible says it is the word of God, and what God says must be true." (The authority of the Bible is used to prove itself.)

### 2.4 Statistical & Generalisation Fallacies

2.4.0 *Statistical & Generalisation Fallacies*
   Errors in reasoning that involve drawing unwarranted conclusions from data, samples, or statistical patterns — or failing to account for the limitations of the evidence on which a generalisation is based.

2.4.1 Hasty Generalisation
   Drawing a broad conclusion from a sample that is too small, unrepresentative, or biased to support it. The inference leaps beyond what the data warrant.
   Example: "I met two people from that city and they were both rude. The people in that city must all be rude." (A sample of two is insufficient to characterise an entire population.)

2.4.2 Sweeping Generalisation (Accident)
   Applying a general rule to a specific case to which the rule was not intended to apply, without considering the relevant exceptional circumstances. The generalisation is applied too rigidly.
   Example: "Cutting people with a knife is a crime. Surgeons cut people with knives. Therefore, surgeons are criminals." (The general rule against cutting people does not apply to consensual medical procedures.)

2.4.3 Anecdotal Evidence
   Using a personal story or isolated example as though it were compelling evidence for a general claim, ignoring broader statistical or systematic data.
   Example: "My grandfather smoked two packs a day and lived to be 95. Smoking cannot be that bad for you." (One anecdote does not overturn population-level epidemiological evidence.)

2.4.4 Texas Sharpshooter Fallacy
   Clustering conclusions around a pattern found in data after the fact, analogous to a marksman who fires randomly at a barn and then paints a target around the tightest cluster of bullet holes. The pattern is an artefact of selective attention, not a pre-existing hypothesis.
   Example: "Look at this cluster of cancer cases in this neighbourhood — there must be something in the environment causing them." (Without a prior hypothesis, random clusters are statistically expected and do not by themselves constitute evidence of a cause.)

2.4.5 Gambler's Fallacy (Monte Carlo Fallacy)
   Believing that a departure from the expected long-run frequency of an independent random event is corrected in the short run — that past outcomes influence future independent trials. Each independent event has the same probability regardless of preceding outcomes.
   Example: "The roulette wheel has landed on red five times in a row. Black is due next." (The wheel has no memory; the probability of black on the next spin remains unchanged.)

2.4.6 Survivorship Bias
   Drawing conclusions from an incomplete data set in which only the successes or survivors are visible, while failures or non-survivors are excluded from the analysis. The sample is biased by the filtering process itself.
   Example: "Businesses succeed when their founders drop out of college — look at Bill Gates and Steve Jobs." (The many college drop-outs whose businesses failed are not counted in this analysis.)

2.4.7 Appeal to Popularity (Argumentum ad Populum)
   Concluding that a proposition is true because many or most people believe it to be true. The number of people who hold a belief is independent of its truth value.
   Example: "Millions of people believe in astrology. It must have something to it." (Popularity does not constitute evidence of validity.)

2.4.8 Appeal to Tradition (Argumentum ad Antiquitatem)
   Asserting that a claim or practice is correct or good because it has been done or believed for a long time. Longevity does not establish correctness.
   Example: "This procedure has been done this way for two hundred years, so it must be the best way." (Tradition is not a substitute for evidence of effectiveness.)

2.4.9 Appeal to Nature (Argumentum ad Naturam)
   Claiming that something is good, right, or acceptable because it is natural, or that something is bad, wrong, or unacceptable because it is unnatural. The natural/unnatural distinction does not map to good/bad without additional argument.
   Example: "Herbal remedies are natural, so they are safer than pharmaceutical drugs." (Natural substances can be toxic; synthetic drugs can be safe. The origin of a substance does not determine its safety profile.)

2.4.10 Middle Ground (Argumentum ad Temperantiam)
   Concluding that the compromise between two opposing positions must be the correct one, simply because it occupies the middle. Truth is not a function of the midpoint between competing claims.
   Example: "You say the earth is round; my opponent says it is flat. The truth must be somewhere in between." (One position may simply be correct and the other false; the middle has no special claim to truth.)

## 3. Syllogism Forms

3. *Syllogisms*
   A syllogism is a deductive argument consisting of two premises and a conclusion. Each premise and the conclusion is a categorical, hypothetical, or disjunctive proposition. The validity of a syllogism depends on its logical form.

### 3.1 Categorical Syllogisms

3.1.0 *Categorical Syllogisms*
   A syllogism composed of three categorical propositions (two premises and a conclusion), involving exactly three terms — a major term (predicate of the conclusion), a minor term (subject of the conclusion), and a middle term (appearing in both premises but not the conclusion). The medieval logicians assigned mnemonic names to the valid moods, where the vowels encode the proposition types: A (universal affirmative: All S are P), E (universal negative: No S are P), I (particular affirmative: Some S are P), O (particular negative: Some S are not P).

3.1.1 *First Figure (Sub-Prae)*
   The middle term is the subject of the major premise and the predicate of the minor premise. Form: M–P, S–M, therefore S–P.

3.1.1.1 Barbara (AAA-1)
   All M are P. All S are M. Therefore, all S are P.
   Example: "All humans are mortal. All Greeks are humans. Therefore, all Greeks are mortal."

3.1.1.2 Celarent (EAE-1)
   No M are P. All S are M. Therefore, no S are P.
   Example: "No reptiles have fur. All snakes are reptiles. Therefore, no snakes have fur."

3.1.1.3 Darii (AII-1)
   All M are P. Some S are M. Therefore, some S are P.
   Example: "All rabbits are mammals. Some pets are rabbits. Therefore, some pets are mammals."

3.1.1.4 Ferio (EIO-1)
   No M are P. Some S are M. Therefore, some S are not P.
   Example: "No homework is fun. Some reading is homework. Therefore, some reading is not fun."

3.1.2 *Second Figure (Prae-Sub)*
   The middle term is the predicate of both premises. Form: P–M, S–M, therefore S–P.

3.1.2.1 Cesare (EAE-2)
   No P are M. All S are M. Therefore, no S are P.
   Example: "No bird is a mammal. All dogs are mammals. Therefore, no dog is a bird."

3.1.2.2 Camestres (AEE-2)
   All P are M. No S are M. Therefore, no S are P.
   Example: "All horses are animals. No stone is an animal. Therefore, no stone is a horse."

3.1.2.3 Festino (EIO-2)
   No P are M. Some S are M. Therefore, some S are not P.
   Example: "No dog is a cat. Some pets are cats. Therefore, some pets are not dogs."

3.1.2.4 Baroco (AOO-2)
   All P are M. Some S are not M. Therefore, some S are not P.
   Example: "All oranges are fruit. Some round things are not fruit. Therefore, some round things are not oranges."

3.1.3 *Third Figure (Sub-Sub)*
   The middle term is the subject of both premises. Form: M–P, M–S, therefore S–P.

3.1.3.1 Darapti (AAI-3)
   All M are P. All M are S. Therefore, some S are P. (Valid only under the traditional interpretation, which assumes the class M is not empty.)
   Example: "All squares are rectangles. All squares are quadrilaterals. Therefore, some quadrilaterals are rectangles."

3.1.3.2 Felapton (EAO-3)
   No M are P. All M are S. Therefore, some S are not P. (Valid only under the traditional interpretation.)
   Example: "No cat is a dog. All cats are mammals. Therefore, some mammals are not dogs."

3.1.3.3 Disamis (IAI-3)
   Some M are P. All M are S. Therefore, some S are P.
   Example: "Some books are boring. All books are things made of paper. Therefore, some things made of paper are boring."

3.1.3.4 Datisi (AII-3)
   All M are P. Some M are S. Therefore, some S are P.
   Example: "All emeralds are green. Some emeralds are jewels. Therefore, some jewels are green."

3.1.3.5 Bocardo (OAO-3)
   Some M are not P. All M are S. Therefore, some S are not P.
   Example: "Some cats are not black. All cats are animals. Therefore, some animals are not black."

3.1.3.6 Ferison (EIO-3)
   No M are P. Some M are S. Therefore, some S are not P.
   Example: "No bicycle is a car. Some bicycles are vehicles. Therefore, some vehicles are not cars."

3.1.4 *Fourth Figure (Sub-Prae)*
   The middle term is the predicate of the major premise and the subject of the minor premise. Form: P–M, M–S, therefore S–P.

3.1.4.1 Camenes (AEE-4)
   All P are M. No M are S. Therefore, no S are P.
   Example: "All thoroughbreds are horses. No horse is a donkey. Therefore, no donkey is a thoroughbred."

3.1.4.2 Dimaris (IAI-4)
   Some P are M. All M are S. Therefore, some S are P.
   Example: "Some birds are penguins. All penguins are flightless creatures. Therefore, some flightless creatures are birds."

3.1.4.3 Fresison (EIO-4)
   No P are M. Some M are S. Therefore, some S are not P.
   Example: "No pig is a bird. Some birds are pets. Therefore, some pets are not pigs."

3.1.4.4 Calemos (AEO-4)
   All P are M. No M are S. Therefore, some S are not P. (Valid only under the traditional interpretation.)
   Example: "All whales are mammals. No mammal is a fish. Therefore, some fish are not whales."

3.1.4.5 Fesapo (EAO-4)
   No P are M. All M are S. Therefore, some S are not P. (Valid only under the traditional interpretation.)
   Example: "No tree is an animal. All animals are living things. Therefore, some living things are not trees."

### 3.2 Hypothetical Syllogisms

3.2.0 *Hypothetical Syllogisms*
   A syllogism in which at least one premise is a conditional ("if-then") proposition. Valid hypothetical syllogisms follow strict rules about the direction of inference from the conditional.

3.2.1 Modus Ponens (Affirming the Antecedent)
   A valid conditional argument: If P then Q. P is true. Therefore, Q is true.
   Example: "If it is raining, the ground is wet. It is raining. Therefore, the ground is wet."

3.2.2 Modus Tollens (Denying the Consequent)
   A valid conditional argument: If P then Q. Q is not true. Therefore, P is not true.
   Example: "If the battery is charged, the light will turn on. The light does not turn on. Therefore, the battery is not charged." (Note: this is valid; cf. the formal fallacy of denying the antecedent at 1.2.)

3.2.3 Hypothetical Syllogism (Chain Argument)
   A valid argument from two conditionals with a shared component: If P then Q. If Q then R. Therefore, if P then R.
   Example: "If it rains, the picnic will be cancelled. If the picnic is cancelled, we will go to the cinema. Therefore, if it rains, we will go to the cinema."

### 3.3 Disjunctive Syllogisms

3.3.0 *Disjunctive Syllogisms*
   A syllogism in which one premise is a disjunction ("either-or" proposition). The validity of the inference depends on whether the disjunction is interpreted inclusively or exclusively.

3.3.1 Disjunctive Syllogism (Modus Tollendo Ponens)
   A valid argument from a disjunction and the denial of one disjunct to the affirmation of the other: P or Q. Not P. Therefore Q. (Valid for both inclusive and exclusive disjunctions, since removing one option from a true disjunction forces the other.)
   Example: "Either the key is in the drawer or it is in my coat. The key is not in the drawer. Therefore, it is in my coat."

3.3.2 Modus Ponendo Tollens
   An argument form that is valid only for exclusive disjunctions ("P or Q, but not both"): P or Q (exclusive). P is true. Therefore, not Q. (Cf. the formal fallacy of affirming a disjunct at 1.3, which occurs when the disjunction is not genuinely exclusive.)
   Example: "The light is either on or off. The light is on. Therefore, it is not off." (Valid because on and off are mutually exclusive states.)

3.4 *Constructive and Destructive Dilemmas*
   Compound argument forms combining conditional and disjunctive premises.

3.4.1 Constructive Dilemma
   (P → Q) and (R → S). P or R. Therefore Q or S.
   Example: "If I take the train I will be late; if I drive I will pay for parking. I must take the train or drive. Therefore, I will be late or I will pay for parking."

3.4.2 Destructive Dilemma
   (P → Q) and (R → S). Not Q or not S. Therefore, not P or not R.
   Example: "If the theory is correct, the prediction holds; if the experiment was sound, the result is reproducible. The prediction does not hold or the result is not reproducible. Therefore, the theory is not correct or the experiment was not sound."
