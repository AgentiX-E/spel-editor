# @agentix-e/spel-editor

> Web-embeddable Spring Expression Language (SpEL) editor.
> Based on CodeMirror 6 + spel-ts v1.1.0. Framework-agnostic Web Component.

[![npm version](https://img.shields.io/npm/v/@agentix-e/spel-editor-core)](https://www.npmjs.com/package/@agentix-e/spel-editor-core)

## Quick Start

```bash
npm install @agentix-e/spel-editor-core
```

```html
<spel-editor
  placeholder="Enter SpEL expression..."
  min-height="100px"
></spel-editor>

<script type="module">
  import '@agentix-e/spel-editor-core';

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
- **Non-invasive theming** — 48 CSS custom properties for complete visual control
- **Framework agnostic** — Works with React, Vue, Angular, Svelte, or plain HTML

## API

### Attributes/Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `value` | `string` | `''` | SpEL expression value |
| `placeholder` | `string` | `'Enter SpEL expression...'` | Placeholder text |
| `readonly` | `boolean` | `false` | Read-only mode |
| `disabled` | `boolean` | `false` | Disabled mode |
| `min-height` | `string` | `'80px'` | Minimum editor height |
| `context-schema` | `ContextSchema \| null` | `null` | Context schema for completions/diagnostics |

### Methods

- `getValue(): string` — Get current expression
- `setValue(value: string): void` — Set expression programmatically
- `validate(): SpelDiagnostic[]` — Get current diagnostics
- `format(): void` — Format the expression

## Theming

Customize the editor appearance via CSS custom properties:

```css
spel-editor {
  --spel-bg: #1e1e2e;
  --spel-fg: #cdd6f4;
  --spel-font-family: 'Fira Code', monospace;
  --spel-border-color: #45475a;
}
```

See the full token reference in the [API docs](https://agentix-e.github.io/spel-editor/).

## License

MIT © AgentiX-E
