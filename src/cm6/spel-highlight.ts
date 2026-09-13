import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

/**
 * The SpEL highlight style.
 *
 * `LanguageSupport` installs no highlighting of its own: its constructor is
 * `constructor(language, support = [])` and the extension it exposes is
 * `[language, support]`. A language built with `new LanguageSupport(language)` alone
 * therefore assigns tags to every token and colours none of them, which is how the
 * editor shipped "syntax highlighting" that never appeared on screen. The style has
 * to be installed with `syntaxHighlighting`, which `spelLanguage` now does.
 *
 * Every colour is a CSS custom property with a literal fallback, so the style works
 * with no stylesheet of its own and can be rethemed without a rebuild — set
 * `--spel-token-keyword` and the keyword colour follows:
 *
 * ```css
 * spel-editor {
 *   --spel-token-keyword: #a855f7;
 *   --spel-token-string: #16a34a;
 * }
 * ```
 *
 * The tags are the ones `tokenKindToStyle` emits by name. `tags` resolves a name to
 * a tag, so a token kind whose style name is not a tag would be reported by
 * CodeMirror's own "Unknown highlighting tag" warning and silently lose its colour;
 * a test pins the two lists together.
 */
export const spelHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--spel-token-keyword, #7c3aed)' },
  { tag: tags.bool, color: 'var(--spel-token-bool, #b45309)' },
  { tag: tags.number, color: 'var(--spel-token-number, #0f766e)' },
  { tag: tags.string, color: 'var(--spel-token-string, #15803d)' },
  { tag: tags.variableName, color: 'var(--spel-token-variable, #1d4ed8)' },
  { tag: tags.propertyName, color: 'var(--spel-token-property, #0369a1)' },
  { tag: tags.operator, color: 'var(--spel-token-operator, #475569)' },
  { tag: tags.typeName, color: 'var(--spel-token-type, #9333ea)' },
  { tag: tags.punctuation, color: 'var(--spel-token-punctuation, #64748b)' },
  {
    tag: tags.operatorKeyword,
    color: 'var(--spel-token-operator-keyword, #7c3aed)',
    fontStyle: 'italic',
  },
]);
