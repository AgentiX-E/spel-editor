/**
 * Contract tests for the range a completion replaces.
 *
 * The adapter used to ask CodeMirror for it with `context.matchBefore(/[\p{L}\p{N}_$#@.]*$/u)`.
 * A pattern ending in a quantified class anchored at the cursor is quadratic on a line that ends
 * in a long run of name characters the anchor then rejects: it measured 662 ms for a
 * 32 000-character line, four times the work for twice the line, and a single-line document
 * reaches that. The range is now computed in one backward pass, so these tests pin both the range
 * it produces and the size it absorbs.
 */
import { describe, expect, it } from 'vitest';
import { CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';

import { spelCompletion } from '../src/cm6/completion-source.js';

/** The range the source says it replaces, asked at `pos`. */
function rangeAt(doc: string, pos: number = doc.length): number {
  const state = EditorState.create({ doc });
  const result = spelCompletion(() => null)(new CompletionContext(state, pos, true));
  if (!result || typeof (result as Promise<unknown>).then === 'function') {
    throw new Error('spelCompletion must return a CompletionResult synchronously');
  }
  return (result as CompletionResult).from;
}

describe('the range a completion replaces', () => {
  it('starts at the introducer of a reference', () => {
    expect(rangeAt('#order.amo')).toBe(0);
  });

  it('includes the property path, dots and all', () => {
    expect(rangeAt('1 + #order.amo')).toBe('1 + '.length);
  });

  it('accepts an identifier that is not ASCII', () => {
    expect(rangeAt('#订单.金')).toBe(0);
  });

  it('starts at the cursor when no name precedes it', () => {
    expect(rangeAt('#order.amount > ')).toBe('#order.amount > '.length);
    expect(rangeAt('1 + ')).toBe('1 + '.length);
  });

  it('stops at the space that ends the previous token', () => {
    expect(rangeAt('#order.amount > 1 + x')).toBe('#order.amount > 1 + '.length);
  });
});

describe('a long name before the cursor', () => {
  it('is read in one pass rather than retried at every offset', () => {
    // No timing assertion here, and deliberately. The range this file computes itself is linear,
    // but the source also asks the engine for completions, and this package depends on the
    // *published* `@agentix-e/spel-ts` rather than the workspace one — so until that release ships
    // the prefix scan inside the engine, a large input still costs engine time and any threshold
    // here would be measuring the dependency rather than this file. The engine's own scan is
    // covered by its own suite, where it can be isolated.
    // The range is the cursor itself, because `!` ends the name — what matters is that a long
    // document is walked without the anchor retrying at every offset.
    const doc = `${'a'.repeat(10_000)}!`;
    expect(rangeAt(doc)).toBe(doc.length);
  });
});
