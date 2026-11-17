# Bloc 2 notes

[Website](https://woodtho.github.io/bloc-2-notes/) · [Repository](https://github.com/woodtho/bloc-2-notes)

An R Markdown website built from 19 French lesson exports dated September 9–November 16, 2026.

## Use

Open `docs/index.html` in a browser, or serve `docs/` with a static HTTP server. JavaScript enables search, quizzes and flashcards. The site works without accounts or remote data requests.

Each lesson is self-contained. Repeated overviews, rules and corrections within a lesson are merged into topic sections. English explanations retain French examples, full conjugations, pronunciation, register, distinct examples and exceptions. Personal material is removed or replaced with generic teaching examples.

- 19 editable lesson Rmd sources.
- 622 reviewed original self-test questions, plus supplementary practice: 932 quiz items.
- All 419 source example-bank entries and 1,152 vocabulary entries retained in the notes or reference sections. Repeated entries are merged; their locations are recorded in `review/consolidation-ledger.json`.
- 2,503 flashcards, filterable by lesson, topic and material.

Lesson answer drafts and Known/To review ratings save automatically in browser local storage, shared with the corresponding quiz questions. Flashcard ratings also persist. Saved progress belongs to that browser and website address; it does not sync between devices or move automatically from local files to the published site. If storage is unavailable, practice still works and the page reports that answers cannot be saved.

Original self-tests use model-answer self-assessment because valid wording can vary. Supplementary short-answer drills check accepted forms; accents matter. Quiz results count only answers submitted in that session. Audio is not included; written listening examples are text practice.

## Edit and rebuild

Edit `lesson-MM-DD.Rmd` for lessons. The other Rmd files define the home, library, quiz and flashcard pages. `_site.yml` controls rendering. `assets/style.css`, `assets/app.js` and `assets/data.js` provide the layout, interactions and practice content. Update interactive data when changing practice material; keep question IDs stable to preserve saved progress.

Requires R, the `rmarkdown` package and Pandoc:

```text
Rscript build.R
```

The build writes `docs/` and its `.nojekyll` marker. Windows builds discover the usual user R library and Pandoc folder; `R_LIBS_USER` and `RSTUDIO_PANDOC` can specify alternatives.

## GitHub Pages

Publish the `main` branch’s `/docs` directory using Settings → Pages → Deploy from a branch. Commit rebuilt `docs/` whenever source changes; GitHub Pages serves the already rendered site without needing R. All page and asset links are relative so the site works beneath a repository URL.

## Verification

```text
node --test tests/study.test.cjs
python tests/audit.py
```

The 12 interaction tests cover grading, filters, answer reveal, retry, shared answer persistence, ratings, reload, blank edits and unavailable/malformed storage. The built-site audit checks 23 pages, links, structure, headings, source counts, stable question IDs and retained French examples/vocabulary.

An optional local-only source-name blocklist can be supplied using `BLOC2_PRIVACY_PATTERNS_FILE`. The blocklist and raw exports are outside this repo. Automated checks complement editorial review; they cannot independently prove semantic completeness or anonymization.

Browser checks verified saved drafts and ratings after reload, including changing a Known answer back to To review and clearing a draft. Evidence: `review/persistent-answers.jpg` and `review/consolidated-lesson.jpg`. Coverage, consolidation decisions and previous formatting/design reviews are in `review/`. Plaud originals were not modified.

The plain visual design applies [unslop](https://github.com/heydamir/unslop), created by Damir Sokolovsky, licensed CC BY 4.0.
