/**
 * What a completion inserts, and when the list stays valid.
 *
 * Two defects are covered here.
 *
 * `insertText` in `@agentix-e/spel-ts` carries snippet placeholders (`T($1)`,
 * `between {$1, $2}`). Passing that string straight to `apply` inserts it
 * **literally**, so accepting the completion for `T(...)` typed `T($1)` into the
 * document. CodeMirror's snippet syntax is `${1}` / `${1:default}`, so the adapter
 * has to translate.
 *
 * The completion result also declared `validFor: () => true`, meaning "these
 * options stay valid at any position". CodeMirror trusts that and keeps the list
 * open as the user types anything, including a space, which is a position no SpEL
 * token continues.
 */
import { describe, it, expect } from 'vitest';
import {
  CompletionContext,
  type Completion,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { hasNextSnippetField } from '@codemirror/autocomplete';

import { spelCompletion } from '../src/cm6/completion-source.js';
import { toCm6Snippet } from '../src/cm6/snippet.js';

/** Ask the source for its options at `pos`. */
function completionsAt(doc: string, pos = doc.length): CompletionResult {
  const source = spelCompletion(() => null);
  const state = EditorState.create({ doc });
  const result = source(new CompletionContext(state, pos, true));
  if (!result || typeof (result as Promise<unknown>).then === 'function') {
    throw new Error('spelCompletion must return a CompletionResult synchronously');
  }
  return result as CompletionResult;
}

function optionFor(label: string): Completion {
  const item = completionsAt('').options.find((option) => option.label === label);
  if (!item) throw new Error(`no completion labelled ${label}`);
  return item;
}

/** Apply a completion to a fresh editor and return the resulting document. */
function applyTo(
  item: Completion,
  doc = '',
  from = doc.length,
): { text: string; view: EditorView } {
  const host = document.body.appendChild(document.createElement('div'));
  const view = new EditorView({
    state: EditorState.create({ doc, selection: { anchor: from } }),
    parent: host,
  });
  if (typeof item.apply !== 'function') {
    throw new Error(
      `completion ${item.label} has a string apply, which inserts its text literally`,
    );
  }
  item.apply(view, item, from, doc.length);
  return { text: view.state.sliceDoc(), view };
}

describe('toCm6Snippet', () => {
  it('converts positional placeholders to CodeMirror field syntax', () => {
    expect(toCm6Snippet('T($1)')).toBe('T(${1})');
    expect(toCm6Snippet('?: $1')).toBe('?: ${1}');
    expect(toCm6Snippet('$1 ? $2 : $3')).toBe('${1} ? ${2} : ${3}');
  });

  it('leaves surrounding braces alone, since only a braced placeholder is a field', () => {
    expect(toCm6Snippet('between {$1, $2}')).toBe('between {${1}, ${2}}');
  });

  it('is a no-op for text with no placeholder', () => {
    expect(toCm6Snippet('null')).toBe('null');
    expect(toCm6Snippet('matches')).toBe('matches');
  });

  it('handles a double-digit field number without mangling it', () => {
    expect(toCm6Snippet('$10')).toBe('${10}');
  });

  it('does not turn a bare dollar sign into a field', () => {
    expect(toCm6Snippet('cost $')).toBe('cost $');
  });
});

describe('completion insertion', () => {
  it('inserts T() with the cursor inside the parentheses, not a literal placeholder', () => {
    const item = optionFor('T()');
    const { text, view } = applyTo(item);
    expect(text).toBe('T()');
    expect(text).not.toContain('$');
    // The first field is selected, so the cursor sits where the type name goes.
    expect(view.state.selection.main.from).toBe(2);
  });

  it('inserts a matches() snippet with quoted, focusable content', () => {
    const item = optionFor('matches');
    const { text, view } = applyTo(item);
    expect(text).toBe("matches ''");
    expect(view.state.selection.main.from).toBe("matches '".length);
  });

  it('gives between two tab stops, in order', () => {
    const item = optionFor('between');
    const { text, view } = applyTo(item);
    expect(text).toBe('between {, }');
    expect(hasNextSnippetField(view.state)).toBe(true);
  });

  it('inserts the elvis operator with a trailing field', () => {
    const item = optionFor('?:');
    const { text } = applyTo(item);
    expect(text).toBe('?: ');
  });

  it('inserts the ternary with three fields', () => {
    const item = optionFor('?: ternary');
    const { text, view } = applyTo(item);
    expect(text).toBe(' ?  : ');
    expect(hasNextSnippetField(view.state)).toBe(true);
  });

  it('inserts a projection with a field inside the brackets', () => {
    const item = optionFor('.?[]');
    const { text, view } = applyTo(item);
    expect(text).toBe('.?[]');
    expect(view.state.selection.main.from).toBe(3);
  });

  it('applies an option with no placeholder by inserting its text', () => {
    const item = optionFor('null');
    const { text } = applyTo(item);
    expect(text).toBe('null');
  });

  it('replaces the whole partial token rather than appending after it', () => {
    // `#order.amo` is one token; the completion must span all of it, or CodeMirror
    // inserts after `amo` and leaves the partial name behind.
    const result = completionsAt('#order.amo');
    expect(result.from).toBe(0);
  });

  it('treats a non-ASCII identifier as part of the token', () => {
    const result = completionsAt('年龄');
    expect(result.from).toBe(0);
  });
});

describe('completion validity', () => {
  const staysValid = (validFor: CompletionResult['validFor'], text: string): boolean => {
    if (validFor instanceof RegExp) return validFor.test(text);
    if (typeof validFor === 'function')
      return validFor(text, 0, text.length, EditorState.create({}));
    return true;
  };

  it('stays valid while the token continues', () => {
    const result = completionsAt('');
    expect(staysValid(result.validFor, 'amount')).toBe(true);
    expect(staysValid(result.validFor, '#order.')).toBe(true);
  });

  it('does not claim validity at a position no token continues', () => {
    const result = completionsAt('');
    expect(staysValid(result.validFor, 'a b')).toBe(false);
    expect(staysValid(result.validFor, '1 + 2')).toBe(false);
  });
});
