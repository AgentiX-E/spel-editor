# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2026-07-14

### Changed
- Remove unused imports across source files
- Add `.prettierrc` configuration for consistent formatting
- Tighten `tsconfig.json` strictness checks

### Added
- Playwright browser integration tests (`test:browser` / `test:browser:ui`)
- nl2spel integration tests with DeepSeek provider
- `DEEPSEEK_API_KEY` secret handling for integration tests

## [0.1.0] - 2026-07-12

### Added
- Initial release of `@agentix-e/spel-editor`
- `<spel-editor>` Web Component with CodeMirror 6 integration
- Syntax highlighting via spel-ts Tokenizer + StreamLanguage adapter
- Auto-completion with keyword, operator, and context-aware suggestions
- Real-time diagnostics (syntax, semantic, and context validation)
- Hover tooltips showing node type information
- Non-invasive theming via 12 CSS custom properties
- Programmatic API: `getValue()`, `setValue()`, `validate()`, `format()`, `insertSnippet()`
- `change` event with `value` and `isValid` detail
- Framework-agnostic — works with React, Vue, Angular, Svelte, or plain HTML

[0.1.1]: https://github.com/AgentiX-E/spel-editor/releases/tag/v0.1.1
[0.1.0]: https://github.com/AgentiX-E/spel-editor/releases/tag/v0.1.0
