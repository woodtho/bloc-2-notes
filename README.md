# Bloc 2 notes

[Website](https://woodtho.github.io/bloc-2-notes/) · [Repository](https://github.com/woodtho/bloc-2-notes)

An R Markdown website built from 21 French lesson exports dated September 9–November 20, 2026.

## Use

Open `docs/index.html` in a browser, or serve `docs/` with a static HTTP server. JavaScript enables search, quizzes and flashcards. The site works without accounts or remote data requests.

Each lesson is self-contained. Repeated overviews, rules and corrections within a lesson are merged into topic sections. English explanations retain French examples, full conjugations, pronunciation, register, distinct examples and exceptions. Personal material is removed or replaced with generic teaching examples.

- 21 editable lesson Rmd sources.
- Global fuzzy search across lesson notes, vocabulary, questions, flashcards and exam prep. Use Search, Ctrl/Cmd+K or `/`; accents and minor typos are optional. Results link directly to the relevant section or practice item. The full search page supports bookmarkable queries and material filters.
- 696 reviewed original self-test questions, plus supplementary practice: 1,006 quiz items.
- All 462 source example-bank entries and 1,302 vocabulary entries retained in the notes or reference sections. Repeated entries are merged; their locations are recorded in `review/consolidation-ledger.json`.
- 2,828 flashcards, filterable by lesson, topic and material.
- Final exam prep: 78 multiple-choice questions across all 13 checklist topics. Full review covers every question; shorter mixed sessions balance the topics. Topic practice, English feedback, scores by topic and missed/unanswered-question retries are included.

Exam selections, checked answers, option order and session position also survive reloads.

Lesson answer drafts and Known/To review ratings save automatically in browser local storage, shared with the corresponding quiz questions. Flashcard ratings also persist. Saved progress belongs to that browser and website address; it does not sync between devices or move automatically from local files to the published site. If storage is unavailable, practice still works and the page reports that answers cannot be saved.

Open questions use model-answer self-assessment because valid wording can vary. Short-answer questions with explicit accepted forms use automatic checks; accents matter. Quiz results count only answers submitted in that session. Audio is not included; written listening examples are text practice.

## Edit and rebuild

Edit `lesson-MM-DD.Rmd` for lessons. The other Rmd files define the home, library, quiz and flashcard pages. `_site.yml` controls rendering. `assets/style.css`, `assets/app.js` and `assets/data.js` provide the layout, interactions and practice content. Update interactive data when changing practice material; keep question IDs stable to preserve saved progress.

Requires R, the `rmarkdown` package, Pandoc and Python 3:

```text
Rscript build.R
```

The build writes `docs/`, its `.nojekyll` marker and a search index generated from the curated content. The index loads only when searching and contains no saved user answers. Windows builds discover the usual user R library, Pandoc and Python folders; `R_LIBS_USER`, `RSTUDIO_PANDOC` and `BLOC2_PYTHON` can specify alternatives. Search links to exam questions use a separate saved practice session, preserving the main exam attempt.

## GitHub Pages

Publish the `main` branch’s `/docs` directory using Settings → Pages → Deploy from a branch. Commit rebuilt `docs/` whenever source changes; GitHub Pages serves the already rendered site without needing R. All page and asset links are relative so the site works beneath a repository URL.

## Verification

```text
node --test tests/study.test.cjs tests/exam.test.cjs tests/search.test.cjs
python tests/audit.py
```

The 29 tests cover search matching and filters, direct links, exam session isolation, grading, answer reveal, retry, shared answer persistence, ratings, reload, blank edits and unavailable/malformed storage. The built-site audit checks 27 pages, search targets, links, structure, headings, source counts, stable question IDs and retained French examples/vocabulary.

An optional local-only source-name blocklist can be supplied using `BLOC2_PRIVACY_PATTERNS_FILE`. The blocklist and raw exports are outside this repo. Automated checks complement editorial review; they cannot independently prove semantic completeness or anonymization.

Browser checks verified saved drafts and ratings after reload, including changing a Known answer back to To review and clearing a draft. Evidence: `review/persistent-answers.jpg` and `review/consolidated-lesson.jpg`. Coverage, consolidation decisions and previous formatting/design reviews are in `review/`. Plaud originals were not modified.

The plain visual design applies [unslop](https://github.com/heydamir/unslop), created by Damir Sokolovsky, licensed CC BY 4.0.
