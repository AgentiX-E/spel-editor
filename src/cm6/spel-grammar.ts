/**
 * SpEL grammar parser for CodeMirror 6 — StreamLanguage adapter.
 *
 * Uses @agentix-e/spel-ts Tokenizer for precise token-level parsing
 * mapped to CM6 StreamParser tokens. Provides accurate syntax highlighting
 * matching spel-ts v1.1.0 lexer behavior without a full Lezer grammar build step.
 *
 * For incremental parsing and richer editor features, a full Lezer grammar
 * can be added later via @lezer/generator build pipeline.
 */
import { type StringStream, StreamLanguage } from '@codemirror/language';
import { Tokenizer as SpelTokenizer, TokenKind } from '@agentix-e/spel-ts';

/**
 * Map spel-ts TokenKind to CM6 highlight style.
 * Exported for testing.
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
      // Could be a variable reference if preceded by #, handled below
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
      return '';
  }
}

/** Create a StreamLanguage-based SpEL language for CodeMirror 6 */
export function createSpelStreamParser() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return StreamLanguage.define(createTokenParser() as any);
}

/**
 * Create the token parser spec for StreamLanguage.define.
 * Exported for testing — allows direct invocation of the token function.
 */
export function createTokenParser(): {
  startState: () => null;
  token: (stream: StringStream) => string | null;
} {
  let _tokenizer: SpelTokenizer | null = null;
  let _tokens: Array<{ from: number; to: number; style: string }> = [];
  let _tokenIndex = 0;

  const startState = (): null => null;

  const token = (stream: StringStream): string | null => {
    // Tokenize entire input on first call
    if (!_tokenizer || _tokenIndex === 0) {
      _tokenizer = new SpelTokenizer(stream.string);
      let rawTokens: ReturnType<SpelTokenizer['tokenize']>;
      try {
        rawTokens = _tokenizer.tokenize();
      } catch {
        // Tokenizer threw on invalid input (e.g. unterminated string) —
        // treat entire content as unhighlighted plain text
        _tokens = [];
        _tokenIndex = 0;
        stream.skipToEnd();
        return null;
      }
      _tokens = [];
      _tokenIndex = 0;

      for (let i = 0; i < rawTokens.length - 1; i++) {
        // Skip EOF
        const tok = rawTokens[i]!;
        const style = tokenKindToStyle(tok.kind);

        // Handle special cases
        if (tok.kind === TokenKind.IDENTIFIER) {
          const prevTok = i > 0 ? rawTokens[i - 1] : null;
          if (prevTok?.kind === TokenKind.HASH) {
            // #variableName — highlight the variable name
            _tokens.push({
              from: tok.startPos,
              to: tok.endPos,
              style: 'variableName',
            });
            continue;
          }
          if (prevTok?.kind === TokenKind.DOT || prevTok?.kind === TokenKind.SAFE_NAV) {
            // .property or ?.property
            _tokens.push({
              from: tok.startPos,
              to: tok.endPos,
              style: 'propertyName',
            });
            continue;
          }
        }

        _tokens.push({ from: tok.startPos, to: tok.endPos, style });
      }
    }

    // Return tokens in order
    while (_tokenIndex < _tokens.length) {
      const t = _tokens[_tokenIndex]!;
      if (t.from >= stream.pos) {
        stream.pos = t.to;
        _tokenIndex++;
        return t.style || null;
      }
      _tokenIndex++;
    }

    // Skip to end
    stream.skipToEnd();
    _tokenIndex = 0; // Reset for next parse
    return null;
  };

  return { startState, token };
}
