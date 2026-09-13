# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — 2026-09-13
### Added
- `docs/integration.md` — embedding, theming, accessibility, and how to call a provider
  without shipping its key to the browser.
- Ten `--spel-token-*` custom properties, one per token class, so the syntax palette can be
  replaced from CSS.

### Changed
- **`@agentix-e/spel-ts` moves to `^2.0.0`.** This package uses spel-ts at runtime — the
  tokenizer and `TokenKind` for the grammar, the parser behind lint and hover, and the
  completion, formatter and diagnostic engines — so the major bump is a real dependency
  change rather than a formality. `TokenKind`'s ordinals are renumbered in 2.0.0 and an
  unsuffixed integer literal above `int` range is no longer accepted. The grammar refers
  to members by name and no literal above `int` range appears anywhere in this package's
  sources or tests, so neither change should reach its behaviour — and the suite, not
  that reasoning, is what establishes it.
- `typecheck` now also checks the tests, which `tsconfig.json` had excluded by including
  `src` alone. Fifty-two errors surfaced, all of them real, and are fixed.
- Coverage thresholds raised to 95 on all four dimensions, from 85/80/85/85.

### Fixed
- **`true`, `false`, `null`, `and`, `or`, `matches`, `between`, `instanceof` and `new`
  were painted as ordinary variables.** spel-ts 2.0.0 moved those words out of its
  tokenizer — it resolves them in the parser, with `equalsIgnoreCase`, which is also
  what lets a field be called `and` — so all nine now arrive as `IDENTIFIER` instead of
  token kinds of their own. The grammar decides them from the text, and only when they
  are not names: `#and` is still a variable and `obj.and` still a property.
- **`div` was painted as nothing.** spel-ts 2.0.0 gives the textual division operator a
  token kind of its own and the style table had no case for it, so `a div b` left it
  unstyled. `a mod b` was already covered; the two now behave alike.
- **Syntax highlighting did nothing.** `spelLanguage()` wrapped the stream parser in a
  `LanguageSupport` without a highlight style, and `LanguageSupport` installs none of its
  own, so every token was tagged and none was coloured. The style is now part of the
  language support.
- **Accepting a completion typed a placeholder into the document.** The engine describes
  insertions as snippets (`T($1)`, `between {$1, $2}`, `$1 ? $2 : $3`), which were passed
  to CodeMirror's `apply` as plain strings. They are translated to CodeMirror's field
  syntax and applied as snippets, so the placeholders became tab-through fields.
- **A completion replaced only the ASCII tail of a reference.** The prefix was matched with
  `\w`, so completing `#order.amo` inserted after `amo` instead of replacing the
  reference, and a field named in Chinese was not treated as part of the token at all.
- **The completion list stayed open where no token continues.** `validFor` was `() => true`,
  which claims every position — including the space that ends a name.
- **Assigning `value` did not reach the document.** `setValue()` dispatched, but
  `el.value = …` and the `value` attribute only updated the element's state, so a
  declarative binding showed the previous expression.
- **The highlighter's token cache was shared by every document.** The tokenizer, token list
  and cursor lived in a closure rather than in the state CodeMirror passes per document, so
  two parses interleaved and each replaced the other's tokens.
- **Two nested textboxes for one editable region.** The wrapper carried `role="textbox"`
  and `tabindex="0"` while CodeMirror's content already carries `role="textbox"`; the label
  and disabled state now live on the content element, and the wrapper is no longer a
  separate tab stop.
- **Gutter text was below the contrast floor.** `#9ca3af` on `#f9fafb` measured 2.43:1;
  the default is now `#5b6472`, which measures 5.72:1.
- **A diagnostic outside the document would have taken out every mark.** Ranges from the
  engine are clamped to the document, which CodeMirror requires.
- Test fixtures that did not match the interfaces they claimed: `variables` was written as a
  list, `MethodSchema`/`TypeSchema`/`FunctionSchema` were given a `type` field they do not
  have, and a method key of `toString()` produced the label `toString()()`.

## [1.1.3] — 2026-07-20
### Changed
- Unified badge style with CI/Docs/Coverage/License/TypeScript/Node.js badges
- Added GitHub Pages deployment job to CI (TypeDoc + coverage)
- Added `typedoc.json` for API docs generation
- Added SEO-optimized GitHub Pages landing page
- Bumped `spel-ts` to `^1.2.2`, `nl2spel` to `^1.3.0`

## [1.1.2] — 2026-07-19
### Changed
- Updated `nl2spel` dependency to `^1.2.2`

## [1.1.1] — 2026-07-19
### Fixed
- Removed arbitrary depth limit

## [1.1.0] — 2026-07-18
### Added
- Recursive context schema extraction
- NL2SpEL integration documentation and interactive demo page

## [1.0.0] — 2026-07-17
### Added
- 100% language service coverage (completion, diagnostics, hover, formatting)
- OIDC npm provenance publishing
- Playwright browser tests + nl2spel integration tests
- `getEditorView()` method for direct CodeMirror access

### Changed
- `strictFunctionTypes` enabled
- Coverage thresholds raised to 85/80/85/85
- Vitest upgraded to v3.x
- CI: fixed browser-tests job (ESM needs bundler)

## [0.1.1] — 2026-07-14
### Changed
- Code quality: unused imports, config consistency, type safety
- CI: explicit pnpm version 10.28.2
- Restored npm badge

### Fixed
- Package.json repo URL
- Cross-repo ecosystem coherence (links, consistency, badges)

## [0.1.0] — 2026-07-12
### Added
- Initial release: Web-embeddable SpEL editor Web Component
- CodeMirror 6 integration with syntax highlighting
- Auto-completion adapter (spel-ts powered)
- Real-time diagnostics / lint adapter
- Hover tooltips adapter
- SpEL grammar tokenizer (StreamLanguage)
- `validate` event with `SpelDiagnostic` detail
- `change` event with `value` and `isValid` detail
- 12 CSS custom properties for non-invasive theming
- Framework-agnostic Web Component (`<spel-editor>`)
- Programmatic API: `getValue()`, `setValue()`, `validate()`, `format()`, `insertSnippet()`, `getEditorView()`

---
*Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).*
