import {
  snippetCompletion,
  type Completion,
  type CompletionSource,
  type CompletionContext,
} from '@codemirror/autocomplete';
import type { EditorState } from '@codemirror/state';
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
const NAME_CHARACTER = /[\p{L}\p{N}_$#@.]/u;
const NAME_VALID_FOR = /^[\p{L}\p{N}_$#@.]*$/u;

/**
 * The start of the name the cursor sits in, which is the position a completion replaces from.
 *
 * Only the current line is read: a name cannot span a line break, which is also the scope
 * CodeMirror's own `matchBefore` used.
 */
function nameStartAt(state: EditorState, position: number): number {
  const line = state.doc.lineAt(position);
  let start = position;
  while (start > line.from && NAME_CHARACTER.test(state.sliceDoc(start - 1, start))) {
    start--;
  }
  return start;
}

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
      // Scanned in place rather than through `context.matchBefore(NAME_PREFIX)`. A pattern that
      // ends in a quantified class anchored at the cursor retries that class from every offset of
      // a long run of name characters whose end the anchor then rejects, which is quadratic: it
      // measured 662 ms for a 32 000-character line, and a single-line document reaches that.
      // Walking back over the run once gives the same range for a single pass.
      //
      // `matchBefore` could answer null when the pattern did not match at the cursor, and the
      // fallback to `position` guarded that contract. The scan cannot fail — an empty run is a
      // run — so the value is `position` in exactly the case the fallback covered.
      from: nameStartAt(context.state, position),
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
