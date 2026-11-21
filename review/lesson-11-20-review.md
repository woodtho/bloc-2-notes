# November 20 lesson review

Added lesson 21 from the November 20 export. The raw export remains outside the public repository; its SHA-256 is recorded in `source-manifest.json`.

- All 81 vocabulary rows retained with English usage notes.
- All 24 labeled examples retained in the relevant teaching sections or conjugation tables. The tournament destination is made generic; first-person and family expressions are teaching models, without identifying anyone.
- All 37 source self-test indices retained as inline questions and quiz items, with persistent answers.
- All 45 source flashcards map to practice cards. Vocabulary, question, example and distinct rule fronts produce 181 new cards; repeated fronts share one card.
- Near-future review, regular formation, spelling changes, the complete irregular-stem list, time clauses, conditional preview, pronunciation, negation, corrections, reusable sentence patterns and learning priorities are consolidated by topic. Earlier lessons remain self-contained.
- Three fill-in-the-blank prompts use visible `[blank]` markers so stripping Markdown emphasis cannot erase the exercise gaps.

## Qualifications and repaired source inconsistencies

Traditional forms taught in the source remain, including `je céderai`, `j’espérerai`, `je répéterai` and `je célébrerai`. Accepted rectified spellings are explained alongside them. The existing source alternative `j’essayerai` is retained with `j’essaierai`; -oyer/-uyer patterns and irregular envoyer are distinguished. Appeler/jeter doubling is not generalized to every -eler/-eter verb. [OQLF: future formation and spelling alternatives](https://vitrinelinguistique.oqlf.gouv.qc.ca/24655/la-grammaire/le-verbe/conjugaison/formes-du-futur-simple).

The source’s useful closed /e/ model for future -ai is retained as a Quebec pronunciation model, with regional variation. The source claim that IPA prescribes open /ɛ/ is not reproduced as a rule: IPA is a transcription system. Future and conditional share r; r alone does not identify the tense. [OQLF: final -ai pronunciation](https://vitrinelinguistique.oqlf.gouv.qc.ca/23655/la-prononciation/prononciation-de-certaines-lettres/prononciation-des-verbes-se-terminant-en-8209ai-et-en-8209e).

Future time clauses are distinguished from habitual/present contexts. The source examples beginning Appelle-moi and Vois are imperatives in the main clause; both clauses need not be future. Item 29 asks for two futur simple clauses but supplied an imperative answer: its model is now Quand tu arriveras, nous commencerons. The source’s imperative example remains in the teaching material and the answer explanation. Après que is qualified with indicative future-perfect completion. [OQLF: future usage](https://vitrinelinguistique.oqlf.gouv.qc.ca/24127/la-grammaire/le-verbe/temps-grammaticaux/futur/le-futur-simple), [OQLF: après que](https://vitrinelinguistique.oqlf.gouv.qc.ca/21132/la-grammaire/le-verbe/modes/concordance-des-temps/mode-verbal-avec-apres-que-et-avant-que).

The complete irregular list supplies faudr-, pleuvr- and conquerr- explicitly. Weather pleuvoir is normally impersonal; figurative plural uses exist. Je voudrais remains valid conditional when a request is intended; the correction asks specifically for future meaning. Spoken omission of ne is distinguished from formal written negation. [OQLF: future stems](https://vitrinelinguistique.oqlf.gouv.qc.ca/24655/la-grammaire/le-verbe/conjugaison/formes-du-futur-simple), [Académie française: figurative pleuvoir](https://www.dictionnaire-academie.fr/article/A8P1781).

## Exclusions and generic replacements

Removed teaching/learning biography, health anecdotes, personal attribution, class scheduling, test-date logistics, promotion/level requirements, platform arrangements and the generated-model disclaimer. Item 30 retains the reminder/date language with a generic appointment. Vocabulary such as le test final, le clavardage and la transcription remains. Unspecified videos or recordings are not invented; no audio exercise is claimed to run. Pronunciation practice is described without recommending painful strain or pressing the tongue with objects.

Existing lessons, question/card identities, progress keys and exam-bank items remain intact. Lesson 20 gains a next-lesson link. The data cache version and generated fuzzy-search index are refreshed.

## Validation

Successful R Markdown build; 29 interaction/search tests; 27-page link, structure, privacy and source-coverage audit. All 24 source example forms and 81 vocabulary rows are accounted for in the consolidation ledger; all 37 prompts/answers match the quiz bank; all 45 source flashcards link to usable cards. Browser and deployment evidence is recorded in `verification.json`.

Initial publication verified at content commit 378974e: all 27 pages and seven application/style/search assets matched the local build, and the live lesson loaded in the browser. A final rebuild also synchronizes small wording edits across source, rendered questions and the search index.
