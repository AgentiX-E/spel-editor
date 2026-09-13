# Integrating `@agentix-e/spel-editor`

A guide to embedding the editor, theming it, and wiring provider-backed natural-language
translation without shipping a credential to the browser.

## 1. Installing

```bash
pnpm add @agentix-e/spel-editor
```

`@agentix-e/spel-ts` is a direct dependency and needs no separate install.
`@agentix-e/nl2spel` is an **optional peer dependency** — only install it if you want
natural-language input.

Importing the package registers the custom element:

```js
import '@agentix-e/spel-editor';
```

```html
<spel-editor min-height="120px" placeholder="amount > 1000"></spel-editor>
```

The component is a framework-agnostic custom element, so it works the same way in plain
HTML and in every framework. Assign properties rather than attributes when the value is
not a string:

```js
const editor = document.querySelector('spel-editor');
editor.contextSchema = schema;   // object — JavaScript only, not an attribute
editor.minHeight = '200px';
```

## 2. Setting and reading the expression

Both directions work, and they are safe to mix:

```js
editor.value = '#order.amount > 1000';   // property assignment reaches the document
editor.setAttribute('value', '#a == 1'); // so does the attribute
editor.setValue('#a == 1');              // and the method

editor.getValue();                       // current text
editor.format();                         // format in place using SpelFormatter
editor.insertSnippet(' and ');           // insert at the cursor
```

Assigning `value` when the document already holds that text is a no-op, so a binding that
writes back what was typed does not move the cursor.

Two events carry the state outwards:

| Event | `detail` | Fired |
|---|---|---|
| `change` | `{ value, isValid }` | On every edit. `isValid` is a synchronous syntax verdict |
| `validate` | `{ diagnostics }` | After the debounced full validation (syntax, semantic, context) |

```js
editor.addEventListener('change', (event) => {
  console.log(event.detail.value, event.detail.isValid);
});
```

## 3. Theming

Every visual is a CSS custom property, so a host stylesheet is enough — no rebuild and no
dependency on internal class names.

```css
spel-editor {
  --spel-bg: #0d1117;
  --spel-font-family: 'Fira Code', monospace;
  --spel-font-size: 13px;
  --spel-gutter-bg: #161b22;
  --spel-gutter-fg: #8b949e;
  --spel-border-color: #30363d;
  --spel-token-keyword: #c678dd;
  --spel-token-string: #98c379;
  --spel-token-number: #d19a66;
}
```

See the README for the full list. The token properties are what syntax highlighting is
painted with, so a dark theme is a palette swap rather than an override of generated
classes.

## 4. Accessibility

The component exposes a single editable region and does not add a second one:

- CodeMirror's content element is the only `role="textbox"`; it carries
  `aria-multiline="true"` and is the only tab stop for the editor.
- `aria-label` is taken from `placeholder`; `aria-readonly` and `aria-disabled` follow the
  `readonly` and `disabled` properties.
- Gutter text is `#5b6472` on `#f9fafb` by default — 5.72:1, above the 4.5:1 that WCAG AA
  requires. Override `--spel-gutter-fg` with a colour that keeps that ratio against
  `--spel-gutter-bg`.

## 5. Natural-language input — and where the API key must live

`@agentix-e/nl2spel` turns a sentence into SpEL. Register it only when you want that:

```bash
pnpm add @agentix-e/nl2spel @agentix-e/nl2spel-openai
```

### Do not put a provider key in the browser

A browser bundle is public. Anything compiled into it — including a key passed to a
provider constructor — is readable by every visitor, and an operator key becomes a public
one. This applies to any provider that authenticates with a secret: DeepSeek, OpenAI,
GLM, and the rest.

There are two ways to do this correctly.

**Route through your own server.** Keep the key server-side and give the provider a
`baseURL` that points at your endpoint, which forwards to the provider and returns the
completion. The client then holds no credential at all:

```js
import { NL2SpelEngine } from '@agentix-e/nl2spel';
import { OpenAICompatibleProvider } from '@agentix-e/nl2spel-openai';

const engine = new NL2SpelEngine();
engine.registerProvider(
  new OpenAICompatibleProvider({
    custom: {
      name: 'spel-proxy',
      baseURL: '/api/spel-llm',   // your server; it holds the provider key
      apiKey: 'not-a-secret',     // opaque to the browser, ignored by your server
      model: 'deepseek-chat',
    },
  }),
);
```

The server side has to accept an OpenAI-compatible chat-completions request, inject the
real key, and stream the response back. It should also rate-limit: the endpoint is public.

**Or run the model in the browser.** `@agentix-e/nl2spel-webllm` runs a small model
locally through WebLLM. No key exists, so none can leak; the trade-off is a large first
download and lower quality than a hosted model.

### Without any provider

The engine has an offline path that needs no key and no network: pattern matching and
templates. A compound rule that cannot be decomposed is refused with the clause named,
rather than answered with a partial expression, so a silent half-rule is never returned.

```js
const { expression } = await engine.generate('金额大于1000且金额小于5000', { offlineOnly: true });
// (#amount > 1000) and (#amount < 5000)
```

### Improve results with a context schema

A schema sharpens both diagnostics and completions, because the validator can then tell a
typo from an undeclared name:

```js
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

editor.contextSchema = schema;
```

The same object configures completion, hover and validation, so it is worth passing even
when you are not calling a provider.

## 6. Known limits

- Diagnostics run on a 300 ms debounce; `change` carries the synchronous syntax verdict, so
  read `validate()` or the `validate` event when you need the full set.
- The highlighter parses line by line, so a string literal left open across a newline is
  shown unstyled rather than coloured. The lint source reports it as a diagnostic.
- CodeMirror's syntax tree is built by a stream parser rather than a Lezer grammar, which
  is what keeps the editor's token vocabulary identical to the engine's at the cost of
  incremental parsing.
