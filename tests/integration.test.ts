/**
 * Core editor tests — validates spel-editor integration points.
 */
import { describe, it, expect } from "vitest";
import {
  SpelExpressionParser,
  SpelCompletionEngine,
  SpelDiagnosticEngine,
  SpelFormatter,
  AstWalker,
  NodeType,
} from "@agentix-e/spel-ts";

describe("spel-ts v1.1.0 integration", () => {
  const parser = new SpelExpressionParser();

  it("SpelExpressionParser parses valid expressions", () => {
    const expr = parser.parseExpression("1 + 2");
    expect(expr.getValue()).toBe(3);
  });

  it("SpelExpression.getAST() returns AST", () => {
    const expr = parser.parseExpression("2 + 3");
    const ast = expr.getAST();
    expect(ast.nodeType).toBe(NodeType.OP_PLUS);
    expect(ast.getChildCount()).toBe(2);
  });

  it("SpelExpression.getReferences() extracts references", () => {
    const expr = parser.parseExpression("#x > 5");
    const refs = expr.getReferences();
    expect(refs.length).toBeGreaterThan(0);
  });

  it("SpelCompletionEngine returns static completions", () => {
    const items = SpelCompletionEngine.getStaticCompletions();
    expect(items.length).toBeGreaterThan(20);
  });

  it("SpelDiagnosticEngine validates syntax", () => {
    const diags = SpelDiagnosticEngine.checkSyntax("1 + 2");
    expect(diags.length).toBe(0);

    const errs = SpelDiagnosticEngine.checkSyntax("1 +");
    expect(errs.length).toBeGreaterThan(0);
  });

  it("SpelFormatter formats expressions", () => {
    const formatted = SpelFormatter.format("1+2");
    expect(formatted).toBeDefined();
    expect(formatted.length).toBeGreaterThanOrEqual(3);
  });

  it("SpelFormatter.minify removes whitespace", () => {
    const minified = SpelFormatter.minify("  1  +  2  ");
    expect(minified).not.toContain("  ");
    expect(minified).toContain("1");
    expect(minified).toContain("2");
  });

  it("SpelFormatter.semanticallyEqual detects equivalence", () => {
    expect(SpelFormatter.semanticallyEqual("1+2", "1 + 2")).toBe(true);
    expect(SpelFormatter.semanticallyEqual("1+2", "1-2")).toBe(false);
  });

  it("AstWalker visits all nodes", () => {
    const ast = parser.parseRaw("1 + 2");
    let count = 0;
    AstWalker.walk(ast, {
      enterNode() {
        count++;
        return true;
      },
    });
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("NodeType enum is consistent with AST nodes", () => {
    const ast = parser.parseRaw("null");
    expect(ast.nodeType).toBe(NodeType.NULL_LITERAL);

    const ast2 = parser.parseRaw("true");
    expect(ast2.nodeType).toBe(NodeType.BOOLEAN_LITERAL);
  });
});
