# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
