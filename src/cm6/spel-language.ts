import { LanguageSupport, syntaxHighlighting } from '@codemirror/language';
import { createSpelStreamParser } from './spel-grammar.js';
import { spelHighlightStyle } from './spel-highlight.js';

/**
 * SpEL language support for CodeMirror 6.
 *
 * Provides syntax highlighting via the spel-ts tokenizer and a CM6 StreamLanguage,
 * with highlights that are present as soon as this extension is used: the highlight
 * style is part of the support rather than something every consumer has to remember
 * to add. `LanguageSupport` alone installs no highlighting, so a language built
 * without this colours nothing while still assigning tags to tokens.
 */
export function spelLanguage(): LanguageSupport {
  return new LanguageSupport(createSpelStreamParser(), [syntaxHighlighting(spelHighlightStyle)]);
}
