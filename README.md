# @agentix-e/spel-editor

> Web-embeddable Spring Expression Language (SpEL) editor.
> Based on CodeMirror 6 + spel-ts v1.1.0. Framework-agnostic Web Component.

[![CI](https://github.com/AgentiX-E/spel-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/AgentiX-E/spel-editor/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@agentix-e/spel-editor?color=blue)](https://www.npmjs.com/package/@agentix-e/spel-editor)
[![Docs](https://img.shields.io/badge/docs-TypeDoc-blue)](https://AgentiX-E.github.io/spel-editor/api/)
[![Coverage](https://img.shields.io/badge/coverage-report-blue)](https://AgentiX-E.github.io/spel-editor/coverage/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)](https://nodejs.org/)

## What is @agentix-e/spel-editor?

`@agentix-e/spel-editor` is a **drop-in Web Component** that adds a full-featured SpEL expression editor to any web application. Built on CodeMirror 6 and powered by `@agentix-e/spel-ts` for real-time syntax validation, it provides syntax highlighting, auto-completion, diagnostics, and hover tooltips — with zero framework lock-in. Optionally integrates with `@agentix-e/nl2spel` for natural-language-to-SpEL generation.

### When should I use it?

- You're building a **rules engine UI** that users edit SpEL expressions in
- You need a **code editor for expression languages** (not general-purpose code)
- You want **natural language input** converted to valid SpEL (via optional NL2SpEL integration)
- You need a **framework-agnostic** component that works with React, Vue, Angular, Svelte, or plain HTML

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

> 📚 Full TypeDoc API documentation: [AgentiX-E.github.io/spel-editor/api/](https://AgentiX-E.github.io/spel-editor/api/)

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

## NL Integration — Natural Language → SpEL

`@agentix-e/spel-editor` accepts `@agentix-e/nl2spel` as an **optional peer dependency**.
You can wire nl2spel into the editor to translate natural language input into valid SpEL expressions.

### Pattern Matching (Zero Dependencies, No API Key)

nl2spel ships with 63 built-in patterns that cover common SpEL constructs without any LLM call:

```html
<spel-editor id="editor" min-height="100px"></spel-editor>

<script type="module">
  import '@agentix-e/spel-editor';
  import { NL2SpelEngine } from '@agentix-e/nl2spel';

  const editor = document.querySelector('#editor');
  const engine = new NL2SpelEngine();

  async function generateSpEL(naturalLanguage) {
    const result = await engine.generate(naturalLanguage, { offlineOnly: true });
    if (result.expression) {
      editor.setValue(result.expression);
    }
  }

  // Usage:
  await generateSpEL('amount greater than 500');
  // Editor now shows: #amount > 500
</script>
```

### LLM-Powered: DeepSeek / OpenAI-Compatible

```bash
npm install @agentix-e/nl2spel-openai
```

```html
<spel-editor id="editor" min-height="100px"></spel-editor>

<script type="module">
  import '@agentix-e/spel-editor';
  import { NL2SpelEngine } from '@agentix-e/nl2spel';
  import { OpenAICompatibleProvider } from '@agentix-e/nl2spel-openai';

  const editor = document.querySelector('#editor');
  const engine = new NL2SpelEngine();

  // Register DeepSeek as the LLM provider
  engine.registerProvider(
    new OpenAICompatibleProvider({
      provider: 'deepseek',
      apiKey: 'sk-your-deepseek-key-here',
    })
  );

  async function generateSpEL(naturalLanguage, contextSchema) {
    const result = await engine.generate(naturalLanguage, { contextSchema });
    if (result.expression) {
      editor.setValue(result.expression);
    }
  }

  // With context schema for smarter completions:
  const schema = {
    root: {
      name: 'order',
      type: 'Order',
      fields: {
        amount: { type: 'number', description: 'Order amount' },
        status: { type: 'string', description: 'Order status' },
      },
      methods: {},
    },
    variables: {},
    beans: {},
    types: {},
    functions: {},
  };

  // Wire the schema for context-aware diagnostics
  editor.contextSchema = schema;

  // Generate SpEL with full context
  await generateSpEL('orders where amount exceeds one thousand and status is active', schema);
  // Editor shows: #order.amount > 1000 and #order.status == 'active'
</script>
```

### Browser-Local LLM: WebLLM (Gemma)

```bash
npm install @agentix-e/nl2spel-webllm @mlc-ai/web-llm
```

```html
<spel-editor id="editor" min-height="100px"></spel-editor>

<script type="module">
  import '@agentix-e/spel-editor';
  import { NL2SpelEngine } from '@agentix-e/nl2spel';
  import { WebLLMProvider } from '@agentix-e/nl2spel-webllm';

  const editor = document.querySelector('#editor');
  const engine = new NL2SpelEngine();

  const provider = new WebLLMProvider({
    modelId: 'gemma-2-2b-it',          // 2B parameter model
    maxTokens: 256,
    temperature: 0.1,
    debug: false,                       // Set true to see model logs
  });

  await provider.initialize();
  engine.registerProvider(provider);

  async function generateSpEL(naturalLanguage) {
    const result = await engine.generate(naturalLanguage);
    if (result.expression) {
      editor.setValue(result.expression);
    }
  }

  // First call loads the model (~1.5 GB download, cached in IndexedDB)
  await generateSpEL('amount greater than 500');
  // Subsequent calls are fast — model stays in memory
  await generateSpEL('status is not null and not empty');
</script>
```

### Integration Pattern Summary

| Mode | Package | API Key | Data Leaves Browser | Setup |
|------|---------|---------|-------------------|-------|
| **Pattern matching** | `@agentix-e/nl2spel` | ❌ None | ❌ No | `npm install` |
| **DeepSeek / OpenAI** | `+ nl2spel-openai` | ✅ Required | ✅ Yes | `npm install` + API key |
| **Browser-local LLM** | `+ nl2spel-webllm` | ❌ None | ❌ No | 1.5 GB model download |

## FAQ

### Which frameworks does it support?
All of them. `@agentix-e/spel-editor` is a native Web Component (`<spel-editor>`) that works with React, Vue, Angular, Svelte, or plain HTML with no framework-specific wrappers needed.

### Do I need to install spel-ts separately?
No. `@agentix-e/spel-ts` is a direct dependency and is bundled automatically. NL2SpEL integration is an optional peer dependency — install it only if you need natural language → SpEL generation.

### Can I customize the appearance?
Yes. 12 CSS custom properties (`--spel-bg`, `--spel-font-family`, `--spel-border-color`, etc.) give you complete visual control without forking or CSS hacks.

### How does the NL integration work?
Three modes: **Pattern matching** (offline, zero deps), **LLM API** (DeepSeek/OpenAI, requires API key), and **browser-local LLM** (WebGPU + Gemma, ~1.5 GB model download). Choose based on your latency, privacy, and cost requirements.

## License

MIT © AgentiX-E

## Ecosystem

- [@agentix-e/spel-ts](https://github.com/AgentiX-E/spel-ts) — Core SpEL parser and evaluator
- [@agentix-e/nl2spel](https://github.com/AgentiX-E/nl2spel) — Natural language → SpEL generation (optional)
