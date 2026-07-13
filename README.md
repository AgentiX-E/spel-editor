# @agentix-e/spel-editor

> Web-embeddable Spring Expression Language (SpEL) editor.
> Based on CodeMirror 6 + spel-ts v1.1.0. Framework-agnostic Web Component.

[![GitHub](https://img.shields.io/badge/GitHub-AgentiX--E%2Fspel--editor-blue)](https://github.com/AgentiX-E/spel-editor)

## Quick Start

```bash
npm install @agentix-e/spel-editor
```

```html
<spel-editor
  placeholder="Enter SpEL expression..."
  min-height="100px"
></spel-editor>

<script type="module">
  import '@agentix-e/spel-editor';

  const editor = document.querySelector('spel-editor');
  editor.addEventListener('change', (e) => {
    console.log('Expression:', e.detail.value);
    console.log('Valid:', e.detail.isValid);
  });
</script>
```

## Features

- **Syntax highlighting** — Accurate token-level coloring powered by spel-ts Tokenizer
- **Auto-completion** — Keyword, operator, variable, and context-aware suggestions
- **Real-time diagnostics** — Syntax, semantic, and context validation
- **Hover tooltips** — Node type information on hover
- **Non-invasive theming** — 12 CSS custom properties for complete visual control
- **Framework agnostic** — Works with React, Vue, Angular, Svelte, or plain HTML

## API Reference

### Properties (Attributes)

| Property | Attribute | Type | Default | Description |
|----------|-----------|------|---------|-------------|
| `value` | `value` | `string` | `''` | SpEL expression value |
| `placeholder` | `placeholder` | `string` | `'Enter SpEL expression...'` | Placeholder text when editor is empty |
| `readonly` | `readonly` | `boolean` | `false` | Read-only mode (prevents editing) |
| `disabled` | `disabled` | `boolean` | `false` | Disabled mode (editor becomes inert) |
| `minHeight` | `min-height` | `string` | `'80px'` | Minimum editor height (CSS value) |
| `contextSchema` | — | `ContextSchema \| null` | `null` | Context schema for completions and diagnostics. Set via JavaScript only (not an HTML attribute) |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Get the current expression text from the editor |
| `setValue(value: string)` | `void` | Set the expression text programmatically |
| `validate()` | `SpelDiagnostic[]` | Get the current diagnostics from the debounced validation cache |
| `format()` | `void` | Format the current expression using SpelFormatter |
| `insertSnippet(snippet: string)` | `void` | Insert a text snippet at the current cursor position |
| `getEditorView()` | `EditorView \| null` | Get the underlying CodeMirror 6 EditorView instance |

### Events

| Event | Detail Type | Description |
|-------|-------------|-------------|
| `change` | `SpelEditorDetail` | Fired when the expression value changes. Detail contains `{ value: string; isValid: boolean }` |
| `validate` | `{ diagnostics: SpelDiagnostic[] }` | Fired after debounced diagnostics complete. Detail contains the diagnostic results |

### CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--spel-bg` | `#ffffff` | Editor background |
| `--spel-font-family` | `'JetBrains Mono', monospace` | Editor font |
| `--spel-font-size` | `14px` | Editor font size |
| `--spel-line-height` | `1.6` | Editor line height |
| `--spel-cursor` | `#111827` | Cursor color |
| `--spel-line-highlight` | `#f3f4f6` | Active line highlight color |
| `--spel-selection-bg` | `#bfdbfe` | Selection background color |
| `--spel-gutter-bg` | `#f9fafb` | Gutter background |
| `--spel-gutter-fg` | `#9ca3af` | Gutter foreground (line numbers) |
| `--spel-border-width` | `1px` | Editor border width |
| `--spel-border-color` | `#d0d5dd` | Editor border color |
| `--spel-border-radius` | `6px` | Editor border radius |

## License

MIT © AgentiX-E

## Ecosystem

- [@agentix-e/spel-ts](https://github.com/AgentiX-E/spel-ts) — Core SpEL parser and evaluator
- [@agentix-e/nl2spel](https://github.com/AgentiX-E/nl2spel) — Natural language → SpEL generation (optional)
