# Global search review

Search is available from every page, with Ctrl/Cmd+K and `/` shortcuts and a standalone, bookmarkable search page. A plain native dialog keeps the existing compact layout. Results can be filtered to notes, vocabulary, questions, flashcards or exam prep; 20 results display initially, with additional results on request.

The dependency-free matcher normalizes accents, case, punctuation and ligatures; it supports prefixes and small edit distances, including adjacent swaps. Short French pronouns such as en and y require exact tokens. All significant query terms must match. Matching note headings rank prominently; lesson metadata alone does not create matches.

`build_search.py` generates 2,861 searchable entries from all 20 curated lessons, 969 lesson questions, 2,647 cards and 78 exam questions. Matching card/reference content shares a result with a practice link. The HTML parser verifies lossless serialization before adding stable row and question anchors. Teaching text, rules and examples are unchanged. The index loads on demand as a local script, including from file URLs, and its content hash updates the cache version on every rebuild. Original private exports and browser-saved answers are never input to the index.

Direct links open the relevant heading, vocabulary/example row, inline question, quiz item or card. Same-page question links reveal filtered/collapsed questions and dismiss search without scrolling back to the header. Search-linked exam questions use a separate saved practice session, preserving the main exam attempt.

Validation: successful R Markdown build; 28 Node tests; 26-page link/structure/privacy/material audit; all search destinations and cache versions validated. Browser checks covered typo/missing-accent queries, material filters, card and lesson/question links, same-page scroll, persistent question drafts, keyboard/focus behavior, pagination, no matches, and a 390px viewport without horizontal overflow. See search-desktop.jpg and search-mobile.jpg.
