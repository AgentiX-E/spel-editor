/**
 * The stream parser must keep its state where CodeMirror expects it.
 *
 * CodeMirror's `StreamParser` contract is `token(stream, state)`: the returned token
 * must be a function of the stream and of the state object it is handed, and
 * `startState()` must produce a fresh one per document. The parser instead held its
 * tokenizer, token list and cursor in a closure shared by every document that reuses
 * the language, so two parses interleaved and each clobbered the other's tokens.
 *
 * The style table is checked here too. It is the editor's copy of the engine's token
 * vocabulary, so a token kind the engine adds must not silently lose its colour.
 */
import { describe, it, expect } from 'vitest';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { StringStream, type LanguageSupport } from '@codemirror/language';
import { highlightTree, tags, type Tag } from '@lezer/highlight';
import { TokenKind } from '@agentix-e/spel-ts';

import { createTokenParser, tokenKindToStyle } from '../src/cm6/spel-grammar.js';
import { spelLanguage } from '../src/cm6/spel-language.js';
import { spelHighlightStyle } from '../src/cm6/spel-highlight.js';
import { spelLint } from '../src/cm6/lint-source.js';

type Parser = ReturnType<typeof createTokenParser>;
type State = ReturnType<Parser['startState']>;

/** Read one token from `stream`, or null at the end of the line. */
function step(parser: Parser, stream: StringStream, state: State): string | null {
  return parser.token(stream, state);
}

/** Drain the rest of `stream`, collecting the styles it yields. */
function drain(parser: Parser, stream: StringStream, state: State): string[] {
  const styles: string[] = [];
  let guard = 0;
  while (!stream.eol() && guard++ < 200) {
    const style = step(parser, stream, state);
    if (style) styles.push(style);
  }
  return styles;
}

/** The styles a whole line yields under a state produced by the parser itself. */
function stylesFor(parser: Parser, line: string): string[] {
  const state = parser.startState();
  return drain(parser, new StringStream(line, 4, 2), state);
}

describe('stream parser state', () => {
  it('startState returns an independent state object', () => {
    const parser = createTokenParser();
    const first = parser.startState();
    const second = parser.startState();

    expect(first).not.toBeNull();
    expect(first).not.toBe(second);
  });

  it('token reads from the state it is given, not from shared memory', () => {
    const parser = createTokenParser();
    const streamA = new StringStream('true and null', 4, 2);
    const streamB = new StringStream('#x > 1', 4, 2);
    const stateA = parser.startState();
    const stateB = parser.startState();

    // Interleave: one token from A, then all of B, then finish A. With the token
    // list held in a closure, B's parse replaces A's and A finishes with B's styles.
    const firstA = step(parser, streamA, stateA);
    const stylesB = drain(parser, streamB, stateB);
    const restA = drain(parser, streamA, stateA);

    expect([firstA, ...restA]).toEqual(stylesFor(parser, 'true and null'));
    expect(stylesB).toEqual(stylesFor(parser, '#x > 1'));
  });

  it('replaying a line against a fresh state reproduces the same styles', () => {
    const parser = createTokenParser();
    const first = stylesFor(parser, '#order.amount >= 1000');
    const second = stylesFor(parser, '#order.amount >= 1000');

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it('keeps the property style for an identifier after a dot', () => {
    expect(stylesFor(createTokenParser(), '#order.amount')).toContain('propertyName');
  });

  it('degrades an unlexable line to plain text without throwing', () => {
    const parser = createTokenParser();
    const state = parser.startState();

    expect(() => drain(parser, new StringStream("'unterminated", 4, 2), state)).not.toThrow();
    // The next line must still be styled: a failure on one line is not a failure
    // of the document.
    expect(drain(parser, new StringStream('true', 4, 2), parser.startState())).toContain('bool');
  });
});

describe('language instances are independent', () => {
  /**
   * Highlight a document through the language's own parser.
   *
   * Driving this through two `EditorView`s was the first attempt, but CodeMirror's
   * viewport measurement needs `Range#getClientRects`, which jsdom does not
   * implement, so the failure it produced was the environment's rather than the
   * code's. Parsing the tree directly exercises the same language object without a
   * DOM in the way.
   */
  function styledRanges(language: LanguageSupport, doc: string): string[] {
    const tree = language.language.parser.parse(doc);
    const out: string[] = [];
    highlightTree(tree, spelHighlightStyle, (from, to, classes) => {
      out.push(`${from}-${to}:${classes}`);
    });
    return out;
  }

  it('lets two documents share one LanguageSupport without mixing tokens', () => {
    const shared = spelLanguage();

    const first = styledRanges(shared, 'true and null');
    const other = styledRanges(shared, '#x > 1');
    const again = styledRanges(shared, 'true and null');

    expect(first.length).toBeGreaterThan(0);
    expect(other.length).toBeGreaterThan(0);
    // A fresh language must agree with the shared one: had the two documents shared
    // a token cache, parsing the second would change how the first comes out.
    expect(again).toEqual(first);
    expect(other).toEqual(styledRanges(spelLanguage(), '#x > 1'));
  });

  it('keeps a keyword and a variable distinct across documents', () => {
    const shared = spelLanguage();
    const keywordClass = spelHighlightStyle.style([tags.keyword]);
    const variableClass = spelHighlightStyle.style([tags.variableName]);

    expect(styledRanges(shared, 'null')).toContain(`0-4:${keywordClass}`);
    expect(styledRanges(shared, '#name')).toContain(`1-5:${variableClass}`);
  });
});

/**
 * Words the engine resolves in its parser rather than its tokenizer.
 *
 * spel-ts 2.0.0 stopped classifying nine words in the lexer, so the token stream no
 * longer says what they are and the grammar has to decide from the text. Both
 * directions are pinned here: the negative cases matter as much as the positive ones,
 * because the engine also accepts these words as names.
 */
describe('words the parser resolves', () => {
  it('styles the literals the tokenizer no longer classifies', () => {
    const parser = createTokenParser();

    expect(stylesFor(parser, 'true')).toEqual(['bool']);
    expect(stylesFor(parser, 'false')).toEqual(['bool']);
    expect(stylesFor(parser, 'null')).toEqual(['keyword']);
  });

  it('is case-insensitive, as the engine is', () => {
    const parser = createTokenParser();

    expect(stylesFor(parser, 'TRUE')).toEqual(['bool']);
    expect(stylesFor(parser, 'Null')).toEqual(['keyword']);
  });

  it('styles the connectives the tokenizer no longer classifies', () => {
    const parser = createTokenParser();

    expect(stylesFor(parser, 'true and false')).toEqual(['bool', 'operator', 'bool']);
    expect(stylesFor(parser, 'a or b')).toEqual(['variableName', 'operator', 'variableName']);
    expect(stylesFor(parser, 'x matches y')).toEqual(['variableName', 'keyword', 'variableName']);
    expect(stylesFor(parser, 'x between y')).toEqual(['variableName', 'keyword', 'variableName']);
    expect(stylesFor(parser, 'x instanceof y')).toEqual([
      'variableName',
      'keyword',
      'variableName',
    ]);
    expect(stylesFor(parser, 'new T()')).toEqual([
      'keyword',
      'variableName',
      'punctuation',
      'punctuation',
    ]);
  });

  it('leaves those words alone when they are used as names', () => {
    const parser = createTokenParser();

    // `#and` is a variable and `obj.and` is a property. The engine accepts both,
    // because it compares with `equalsIgnoreCase` instead of reserving the words, so
    // colouring every occurrence as an operator would be the opposite mistake.
    expect(stylesFor(parser, '#and')).toEqual(['typeName', 'variableName']);
    expect(stylesFor(parser, 'obj.and')).toEqual(['variableName', 'punctuation', 'propertyName']);
  });

  it('still styles the operators the tokenizer does classify', () => {
    const parser = createTokenParser();

    // `not`, `div`, `mod`, `eq`, `ne`, `lt`, `le`, `gt` and `ge` keep token kinds of
    // their own. A word listed in the text lookup as well would be a second source of
    // truth for the same decision.
    expect(stylesFor(parser, 'not true')).toEqual(['operator', 'bool']);
    expect(stylesFor(parser, 'a div b')).toEqual(['variableName', 'keyword', 'variableName']);
    expect(stylesFor(parser, 'a mod b')).toEqual(['variableName', 'keyword', 'variableName']);
    expect(stylesFor(parser, 'a eq b')).toEqual(['variableName', 'operator', 'variableName']);
  });
});

describe('style table covers the engine vocabulary', () => {
  it('maps every TokenKind except EOF to a non-empty style', () => {
    const kinds = Object.values(TokenKind).filter(
      (value): value is TokenKind => typeof value === 'number',
    );
    expect(kinds.length).toBeGreaterThan(0);

    const blank = kinds
      .filter((kind) => TokenKind[kind] !== 'EOF')
      .filter((kind) => tokenKindToStyle(kind) === '')
      .map((kind) => TokenKind[kind]);
    expect(blank).toEqual([]);
  });

  it('resolves every style name to a tag the highlight style covers', () => {
    const kinds = Object.values(TokenKind).filter(
      (value): value is TokenKind => typeof value === 'number',
    );
    const names = new Set(
      kinds.map((kind) => tokenKindToStyle(kind)).filter((name) => name !== ''),
    );

    const unresolved: string[] = [];
    for (const name of names) {
      const value = (tags as Record<string, unknown>)[name];
      const tag: Tag | null =
        typeof value === 'function' || value === undefined ? null : (value as Tag);
      if (tag === null || !spelHighlightStyle.style([tag])) {
        unresolved.push(name);
      }
    }
    expect(unresolved).toEqual([]);
  });
});

describe('a lex failure is surfaced as a diagnostic', () => {
  it('reports an unterminated string literal in the lint source', () => {
    const host = document.body.appendChild(document.createElement('div'));
    const view = new EditorView({
      state: EditorState.create({ doc: "'unterminated", extensions: [spelLanguage()] }),
      parent: host,
    });

    const result = spelLint(() => null)(view);
    if (typeof (result as Promise<unknown>).then === 'function') {
      throw new Error('spelLint must return diagnostics synchronously');
    }
    expect((result as readonly unknown[]).length).toBeGreaterThan(0);
    view.destroy();
  });
});
