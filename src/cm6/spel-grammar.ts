/**
 * SpEL grammar parser for CodeMirror 6 — StreamLanguage adapter.
 *
 * Uses the @agentix-e/spel-ts Tokenizer for token-level parsing, mapped onto CM6
 * StreamParser token names so highlighting cannot drift from the engine's lexer
 * without a Lezer grammar build step.
 *
 * For incremental parsing and richer editor features, a full Lezer grammar can be
 * added later via a @lezer/generator build pipeline.
 */
import { type StringStream, StreamLanguage } from '@codemirror/language';
import { Tokenizer as SpelTokenizer, TokenKind } from '@agentix-e/spel-ts';

/**
 * Map a spel-ts TokenKind to a CM6 highlight style name.
 *
 * Each name is resolved to a tag by `@lezer/highlight`, so the value must be a tag
 * name; a name that is not one loses its colour and makes CodeMirror warn. Exported
 * for testing.
 */
export function tokenKindToStyle(kind: TokenKind): string {
  switch (kind) {
    // Keywords
    case TokenKind.LITERAL_NULL:
      return 'keyword';
    case TokenKind.LITERAL_BOOLEAN:
      return 'bool';
    case TokenKind.MATCHES:
    case TokenKind.BETWEEN:
    case TokenKind.INSTANCEOF:
    case TokenKind.MOD:
    case TokenKind.NEW:
      return 'keyword';
    // Literals
    case TokenKind.LITERAL_INT:
    case TokenKind.LITERAL_LONG:
    case TokenKind.LITERAL_FLOAT:
    case TokenKind.LITERAL_DOUBLE:
    case TokenKind.LITERAL_HEX:
      return 'number';
    case TokenKind.LITERAL_STRING:
      return 'string';
    // Variables
    case TokenKind.IDENTIFIER:
      // A variable reference is decided by the preceding token, in `styleForToken`.
      return 'variableName';
    // Operators
    case TokenKind.PLUS:
    case TokenKind.MINUS:
    case TokenKind.STAR:
    case TokenKind.SLASH:
    case TokenKind.PERCENT:
    case TokenKind.POWER:
    case TokenKind.INC:
    case TokenKind.DEC:
    case TokenKind.ASSIGN:
      return 'operator';
    // Comparison
    case TokenKind.EQ:
    case TokenKind.NE:
    case TokenKind.LT:
    case TokenKind.LE:
    case TokenKind.GT:
    case TokenKind.GE:
    case TokenKind.AND:
    case TokenKind.OR:
    case TokenKind.NOT:
      return 'operator';
    // Type/Bean references
    case TokenKind.HASH:
    case TokenKind.AT:
    case TokenKind.AMP_AT:
      return 'typeName';
    // Punctuation
    case TokenKind.LPAREN:
    case TokenKind.RPAREN:
    case TokenKind.LBRACKET:
    case TokenKind.RBRACKET:
    case TokenKind.LBRACE:
    case TokenKind.RBRACE:
    case TokenKind.COMMA:
    case TokenKind.COLON:
    case TokenKind.DOT:
    case TokenKind.SAFE_NAV:
    case TokenKind.QMARK:
    case TokenKind.ELVIS:
    case TokenKind.DOTDOT:
      return 'punctuation';
    // Selection/Projection
    case TokenKind.PROJECTION:
    case TokenKind.SELECTION:
    case TokenKind.SELECT_FIRST:
    case TokenKind.SELECT_LAST:
      return 'operatorKeyword';
    // Type
    case TokenKind.TYPE_START:
      return 'typeName';
    default:
      // EOF, and anything a future engine version adds: no style rather than a
      // wrong one. A test pins every existing kind to a non-empty style.
      return '';
  }
}

/** A styled range, in offsets relative to the start of its line. */
interface SpelSpan {
  readonly from: number;
  readonly to: number;
  readonly style: string;
}

/**
 * Per-document parser state.
 *
 * CodeMirror's `StreamParser` contract is that `token(stream, state)` depends only on
 * its arguments and that `startState()` yields a fresh state per parse. Holding the
 * token list in the closure instead made one cache serve every document that reused
 * the language: two parses interleaved and each replaced the other's tokens, so an
 * editor could paint itself with a different editor's tokens.
 */
interface SpelStreamState {
  /** The line the cached spans were produced from. */
  line: string | null;
  /** Offsets within the current line, in order. */
  spans: SpelSpan[];
  /** Index of the next span to serve. */
  index: number;
}

/** Create a StreamLanguage-based SpEL language for CodeMirror 6. */
export function createSpelStreamParser() {
  return StreamLanguage.define(createTokenParser());
}

/**
 * Tokenize one line and describe its styled ranges.
 *
 * A line the engine cannot lex — an unterminated string literal, say — yields no
 * spans and is shown unstyled rather than throwing. A stream parser cannot report a
 * diagnostic, since it may only return a token name; the failure is surfaced by the
 * lint source, which runs the same engine and reports the parse error as a
 * diagnostic on the same text.
 */
function spansFor(line: string): SpelSpan[] {
  let tokens: ReturnType<SpelTokenizer['tokenize']>;
  try {
    tokens = new SpelTokenizer(line).tokenize();
  } catch {
    return [];
  }

  const spans: SpelSpan[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!;
    if (token.kind === TokenKind.EOF) break;
    const style = styleForToken(tokens, index);
    if (style === '') continue;
    spans.push({ from: token.startPos, to: token.endPos, style });
  }
  return spans;
}

/**
 * The style for the token at `index`, which for an identifier depends on what
 * precedes it: `#name` is a variable and `.name` is a property.
 */
function styleForToken(tokens: readonly { kind: TokenKind }[], index: number): string {
  const token = tokens[index]!;
  if (token.kind === TokenKind.IDENTIFIER) {
    const previous = index > 0 ? tokens[index - 1] : undefined;
    if (previous?.kind === TokenKind.HASH) return 'variableName';
    if (previous?.kind === TokenKind.DOT || previous?.kind === TokenKind.SAFE_NAV) {
      return 'propertyName';
    }
  }
  return tokenKindToStyle(token.kind);
}

/**
 * Create the token parser spec for `StreamLanguage.define`.
 *
 * Exported for testing, which invokes `token` directly with a hand-made state.
 */
export function createTokenParser(): {
  startState: () => SpelStreamState;
  token: (stream: StringStream, state: SpelStreamState) => string | null;
} {
  const startState = (): SpelStreamState => ({ line: null, spans: [], index: 0 });

  const token = (stream: StringStream, state: SpelStreamState): string | null => {
    // CodeMirror constructs a fresh StringStream per line with `pos` at 0, and a new
    // state per parse. A different line, or a scan restarting from the line start,
    // therefore means the cached spans no longer apply. `stream.start` cannot serve
    // as an identity here: CodeMirror resets it to `stream.pos` before every call.
    if (state.line !== stream.string || stream.pos === 0) {
      state.line = stream.string;
      state.spans = spansFor(stream.string);
      state.index = 0;
    }

    while (state.index < state.spans.length) {
      const span = state.spans[state.index]!;
      state.index += 1;
      if (span.to > stream.pos) {
        stream.pos = span.to;
        return span.style;
      }
    }

    // Every span is behind the cursor: consume the remainder of the line, and return
    // null for it. Advancing is mandatory — CodeMirror throws if a call to `token`
    // leaves `stream.pos` where it found it.
    stream.skipToEnd();
    return null;
  };

  return { startState, token };
}
