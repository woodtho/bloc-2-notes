# Compact UI review

Applied [unslop](https://github.com/heydamir/unslop), created by Damir Sokolovsky, CC BY 4.0. This is a polish pass within the existing design, scoped to the requested reduction in spacing.

## Direction

- Product: French study notes and practice.
- Character: practical, legible, restrained.
- World: a reference book.
- Focus: French examples and model answers.
- Signature: lesson numbers and dates.

## Audit

The existing palette, type family and plain navigation suit this site. Extra space was concentrated in the 64px header, 32px heading margins, double separation after the lesson outline, 41px table rows and approximately 59px collapsed question rows. Question editors and flashcards also had more padding than their content needed. No new visuals, promotional copy or motion are needed for this density pass.

## Passes

1. Spacing: reduced heading/paragraph gaps, header height, table padding, lesson-list padding and practice-panel spacing. Removed the duplicate divider before the first reading section.
2. Color: retained the existing neutral surfaces, blue accent and semantic feedback colors.
3. Icons: retained the existing text controls and native disclosure markers.
4. Copy: retained the existing labels and lesson content.
5. Type: kept 16px reading text, with line-height 1.6. Page headings use 28px on desktop; supporting headings use 22px/18px. Existing system fonts and weights remain.
6. Layout: retained the content order, reading width and responsive structure. Compact table rows and controls account for most of the density improvement.
7. Details: desktop controls use approximately 36px height, mobile controls retain 40px. Answer textareas are 72px minimum. Focus outlines, ratings and reveal states remain distinct.
8. Visuals: the French examples remain the visual focus. No image asset was needed.
9. Motion: retained the static interaction model.

## Verification

At the same 1280px viewport, lesson 19 changed from 24,185px to 21,699px tall (about 10% less scrolling). Header: 64px to 56px. First table row: 41px to 37px. First collapsed question row: about 59px to 49px. Reading text remains 16px.

At 390px, the document width was 375px and the question textarea width 335px, with no page-level horizontal overflow. Question-toolbar buttons were 40px tall. Answer reveal worked. The viewport override was reset after review. The lesson library, quiz setup and flashcard setup also had no horizontal overflow at the desktop viewport.

Ten interaction tests passed. The built-HTML audit passed for all 23 pages, including local links, names/contact patterns, site titles and lesson-heading coverage. Three screenshots were used: compact-before.jpg, compact-after.jpg and compact-mobile.jpg.
