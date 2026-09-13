import {
  snippetCompletion,
  type Completion,
  type CompletionSource,
  type CompletionContext,
} from '@codemirror/autocomplete';
import { SpelCompletionEngine, type CompletionItem, type ContextSchema } from '@agentix-e/spel-ts';

import { toCm6Snippet } from './snippet.js';

/**
 * The characters a SpEL name may contain, and therefore the characters that keep the
 * completion list valid.
 *
 * `\w` is not enough for either role. An identifier may be any Unicode letter — the
 * engine accepts them so the natural-language pipeline can emit a field named in
 * Chinese — and a reference is written `#order.amount`, so `#`, `@` and `.` belong to
 * the token as well. Matching only `\w` made the list replace the ASCII tail of
 * `#order.amo` instead of the whole reference, and left `validFor` with no way to
 * notice that a space ends the token.
 */
const NAME_PREFIX = /[\p{L}\p{N}_$#@.]*$/u;
const NAME_VALID_FOR = /^[\p{L}\p{N}_$#@.]*$/u;

/**
 * Adapter: spel-ts CompletionEngine → CM6 CompletionSource.
 *
 * Maps SpelCompletionEngine items to CM6 Completion objects at the cursor position.
 * When a ContextSchema provider is registered, context-aware completions
 * (variables, properties, methods, beans, types) are included.
 */
export function spelCompletion(getContextSchema?: () => ContextSchema | null): CompletionSource {
  return (context: CompletionContext) => {
    const expression = context.state.sliceDoc();
    const position = context.pos;
    const schema = getContextSchema?.() ?? undefined;

    const items = SpelCompletionEngine.getCompletions(expression, position, schema);

    return {
      // `matchBefore` answers null when the pattern does not match at the cursor, so the
      // fallback stays even though NAME_PREFIX, which may match empty, always matches
      // today. It guards CodeMirror's contract rather than a case this adapter can reach,
      // and a future narrowing of the pattern would make it live.
      from: context.matchBefore(NAME_PREFIX)?.from ?? position,
      options: items.map((item) => mapToCM6Completion(item)),
      // Stated rather than omitted, so the list stays open only while the cursor is
      // still inside a name. `() => true` claimed every position continues a token,
      // including the space that ends one.
      validFor: NAME_VALID_FOR,
    };
  };
}

/**
 * Map a spel-ts CompletionItem to a CM6 Completion.
 *
 * The engine describes what to insert as a snippet template, so the completion is
 * built with `snippetCompletion`: a plain string `apply` would insert the template
 * verbatim, placeholders and all, typing `T($1)` for the `T(...)` item.
 */
function mapToCM6Completion(item: CompletionItem): Completion {
  return snippetCompletion(toCm6Snippet(item.insertText), {
    label: item.label,
    type: mapKindToCM6Type(item.kind),
    detail: item.detail,
    info: item.documentation,
    // Higher priority items appear first
    boost: item.sortPriority / 100,
  });
}

function mapKindToCM6Type(kind: string): string {
  switch (kind) {
    case 'keyword':
      return 'keyword';
    case 'operator':
      return 'operator';
    case 'variable':
      return 'variable';
    case 'property':
      return 'property';
    case 'method':
      return 'method';
    case 'function':
      return 'function';
    case 'type':
      return 'type';
    default:
      return 'text';
  }
}
