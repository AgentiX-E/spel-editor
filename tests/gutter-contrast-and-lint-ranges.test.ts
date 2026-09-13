/**
 * Gutter legibility, and keeping diagnostics inside the document.
 *
 * The gutter rendered `#9ca3af` on `#f9fafb`, which is 2.43:1 — well under the 4.5:1
 * that WCAG AA requires for text. Line numbers and, more importantly, lint markers
 * drawn in that colour are unreadable for anyone with reduced contrast sensitivity.
 *
 * The lint adapter also forwarded `from`/`to` straight from the engine. CodeMirror
 * rejects a range outside the document, so a single out-of-range diagnostic can take
 * out the whole editor rather than showing a mark.
 */
import { describe, it, expect } from 'vitest';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { linter } from '@codemirror/lint';
import type { Diagnostic } from '@codemirror/lint';
import { DiagnosticSeverity, DiagnosticSource } from '@agentix-e/spel-ts';

import { SpelEditor } from '../src/spel-editor.js';
import { spelLanguage } from '../src/cm6/spel-language.js';
import * as lintInternals from '../src/cm6/lint-source.js';
import { spelLint } from '../src/cm6/lint-source.js';

/** WCAG 2.1 relative luminance of an `#rrggbb` colour. */
function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two `#rrggbb` colours. */
function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

/** The default value of a custom property in the component's stylesheet. */
function fallbackOf(property: string): string {
  const css = SpelEditor.styles.cssText;
  const match = new RegExp(`var\\(\\s*${property}\\s*,\\s*(#[0-9a-fA-F]{3,8})\\s*\\)`).exec(css);
  if (!match) throw new Error(`no fallback declared for ${property}`);
  return match[1]!;
}

describe('gutter contrast', () => {
  it('is at least 4.5:1 against the gutter background', () => {
    const foreground = fallbackOf('--spel-gutter-fg');
    const background = fallbackOf('--spel-gutter-bg');
    const ratio = contrast(foreground, background);

    expect(
      ratio,
      `gutter text ${foreground} on ${background} is ${ratio.toFixed(2)}:1, below 4.5:1`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('documents the contrast the previous colour had, to keep the fix honest', () => {
    // Regression guard on the measurement itself: if this ever passes, the
    // luminance helper is wrong.
    expect(contrast('#9ca3af', '#f9fafb')).toBeLessThan(3);
  });
});

describe('diagnostic ranges', () => {
  const malformed = [
    '1 +',
    "'unterminated",
    '#order.amount >',
    '((a)',
    'a and',
    '#',
    '@',
    'T(',
    'between {',
    'a ? b',
    '1 div',
  ];

  function viewFor(doc: string): EditorView {
    const host = document.body.appendChild(document.createElement('div'));
    return new EditorView({
      state: EditorState.create({
        doc,
        extensions: [spelLanguage(), linter(spelLint(() => null))],
      }),
      parent: host,
    });
  }

  /** Diagnostics for a view, narrowed from the source's possibly-async return. */
  function diagnosticsFor(view: EditorView): readonly Diagnostic[] {
    const result = spelLint(() => null)(view);
    if (typeof (result as Promise<unknown>).then === 'function') {
      throw new Error('spelLint must return diagnostics synchronously');
    }
    return result as readonly Diagnostic[];
  }

  it('keeps every diagnostic inside the document', () => {
    const outside: string[] = [];
    for (const doc of malformed) {
      const view = viewFor(doc);
      for (const diagnostic of diagnosticsFor(view)) {
        if (diagnostic.from < 0 || diagnostic.to > doc.length || diagnostic.from > diagnostic.to) {
          outside.push(
            `${JSON.stringify(doc)} -> from=${diagnostic.from} to=${diagnostic.to} (length ${doc.length})`,
          );
        }
      }
      view.destroy();
    }
    expect(outside).toEqual([]);
  });

  it('does not throw while linting malformed input', () => {
    for (const doc of malformed) {
      const view = viewFor(doc);
      expect(() => diagnosticsFor(view), `linting ${JSON.stringify(doc)}`).not.toThrow();
      view.destroy();
    }
  });

  it('clamps a range that reaches past the end of the document', () => {
    const view = viewFor('a');
    // The adapter is the only thing standing between the engine and CodeMirror's
    // range check, so the clamp has to hold for a range the engine should not emit.
    const { mapToCM6Diagnostic } = lintInternals;
    const clamped = mapToCM6Diagnostic(
      {
        from: 0,
        to: 99,
        message: 'past the end',
        severity: DiagnosticSeverity.ERROR,
        code: 'TEST-RANGE',
        source: DiagnosticSource.SYNTAX,
      },
      view.state.doc.length,
    );
    expect(clamped.to).toBe(1);
    view.destroy();
  });
});
