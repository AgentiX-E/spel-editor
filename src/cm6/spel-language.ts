import { LanguageSupport } from "@codemirror/language";
import { createSpelStreamParser } from "./spel-grammar.js";

/**
 * SpEL language support for CodeMirror 6.
 * Provides syntax highlighting via spel-ts Tokenizer + CM6 StreamLanguage.
 */
export function spelLanguage(): LanguageSupport {
  return new LanguageSupport(createSpelStreamParser());
}
