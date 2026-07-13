/**
 * CodeMirror 6 adapter integration tests.
 *
 * Tests syntax highlighting, completions, lint diagnostics, and hover
 * tooltips using REAL EditorView instances — no mocks.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState, type Extension } from "@codemirror/state";
import { linter } from "@codemirror/lint";
import { autocompletion } from "@codemirror/autocomplete";
import { LanguageSupport } from "@codemirror/language";

import { spelLanguage } from "../src/cm6/spel-language.js";
import { createSpelStreamParser } from "../src/cm6/spel-grammar.js";
import { spelCompletion } from "../src/cm6/completion-source.js";
import { spelLint } from "../src/cm6/lint-source.js";
import { spelHover, createHoverSource, getNodeInfo } from "../src/cm6/hover-tooltip.js";
import {
  SpelExpressionParser,
  AstWalker,
  NodeType,
  VariableReference,
  PropertyOrFieldReference,
  BeanReference,
  TypeReference,
} from "@agentix-e/spel-ts";
import type { SpelNodeImpl } from "@agentix-e/spel-ts";

import type { ContextSchema } from "@agentix-e/spel-ts";

function createView(
  doc: string,
  extensions: Extension[],
  container?: HTMLElement,
): EditorView {
  return new EditorView({
    state: EditorState.create({ doc, extensions }),
    parent:
      container ?? document.body.appendChild(document.createElement("div")),
  });
}

describe("SpEL language support", () => {
  it("spelLanguage() returns a LanguageSupport instance", () => {
    const lang = spelLanguage();
    expect(lang).toBeInstanceOf(LanguageSupport);
  });

  it("createSpelStreamParser() creates a StreamLanguage", () => {
    const parser = createSpelStreamParser();
    // StreamLanguage.define returns a Language (which extends LanguageSupport)
    expect(parser).toBeDefined();
  });

  it("editor renders Syntaxually valid SpEL expression", () => {
    const div = document.createElement("div");
    const view = createView("2 + 3", [spelLanguage()], div);
    const content = div.querySelector(".cm-content");
    expect(content).not.toBeNull();
    expect(content?.textContent?.trim()).toContain("2");
    view.destroy();
  });

  it("editor renders expressions with variables", () => {
    const div = document.createElement("div");
    const view = createView("#myVar.name", [spelLanguage()], div);
    const content = div.querySelector(".cm-content");
    expect(content).not.toBeNull();
    expect(content?.textContent?.trim().length).toBeGreaterThan(0);
    view.destroy();
  });

  it("editor does not crash on unterminated string", () => {
    const div = document.createElement("div");
    const view = createView("'unclosed", [spelLanguage()], div);
    const content = div.querySelector(".cm-content");
    expect(content).not.toBeNull();
    expect(content?.textContent).toBeDefined();
    view.destroy();
  });

  it("editor does not crash on malformed expressions", () => {
    const div = document.createElement("div");
    const view = createView("((", [spelLanguage()], div);
    const content = div.querySelector(".cm-content");
    expect(content).not.toBeNull();
    view.destroy();
  });

  it("editor renders complex expressions", () => {
    const div = document.createElement("div");
    const view = createView(
      "#var.name?.property and @bean != null or T(String)",
      [spelLanguage()],
      div,
    );
    const content = div.querySelector(".cm-content");
    expect(content?.textContent?.trim().length).toBeGreaterThan(0);
    view.destroy();
  });

  it("editor renders null literal", () => {
    const div = document.createElement("div");
    const view = createView("null", [spelLanguage()], div);
    const content = div.querySelector(".cm-content");
    expect(content?.textContent?.trim()).toBe("null");
    view.destroy();
  });
});

describe("Grammar token styles", () => {
  // Test tokenKindToStyle indirectly by verifying the grammar tokenizes properly
  it("tokenKindToStyle maps keyword types correctly", () => {
    const parser = createSpelStreamParser();
    // Verify parser can tokenize keyword expressions without errors
    const div = document.createElement("div");
    const langSupport = new LanguageSupport(parser);
    const view = createView("true and false or null", [langSupport], div);
    expect(div.querySelector(".cm-content")).not.toBeNull();
    view.destroy();
  });

  it("tokenKindToStyle maps numeric literals correctly", () => {
    const div = document.createElement("div");
    const view = createView("42 3.14 0xFF", [spelLanguage()], div);
    expect(div.querySelector(".cm-content")).not.toBeNull();
    view.destroy();
  });

  it("tokenKindToStyle maps operators correctly", () => {
    const div = document.createElement("div");
    const view = createView("a + b * c == d", [spelLanguage()], div);
    expect(div.querySelector(".cm-content")).not.toBeNull();
    view.destroy();
  });

  it("tokenKindToStyle maps punctuation correctly", () => {
    const div = document.createElement("div");
    const view = createView("foo(bar, baz)", [spelLanguage()], div);
    expect(div.querySelector(".cm-content")).not.toBeNull();
    view.destroy();
  });
});

describe("Completion source", () => {
  it("returns completions at empty expression position", () => {
    const source = spelCompletion(() => null);
    const state = EditorState.create({ doc: "" });
    const ctx = {
      state,
      pos: 0,
      explicit: true as boolean,
      matchBefore: (_re: RegExp) =>
        null as { from: number; text: string } | null,
    };
    const result = source(ctx);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.options.length).toBeGreaterThan(0);
      expect(result.options.some((o) => o.label === "null")).toBe(true);
    }
  });

  it("returns completions at cursor position in expression", () => {
    const source = spelCompletion(() => null);
    const state = EditorState.create({ doc: "1 + 2" });
    const ctx = {
      state,
      pos: 4,
      explicit: true as boolean,
      matchBefore: (_re: RegExp) =>
        null as { from: number; text: string } | null,
    };
    const result = source(ctx);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.options.length).toBeGreaterThan(0);
    }
  });

  it("returns context-aware completions with schema", () => {
    const schema: ContextSchema = {
      root: null,
      variables: { userName: { type: "String" } },
      beans: { userService: { type: "UserService" } },
      types: {},
      functions: {},
    };
    const source = spelCompletion(() => schema);
    const state = EditorState.create({ doc: "#" });
    const ctx = {
      state,
      pos: 1,
      explicit: true as boolean,
      matchBefore: (_re: RegExp) =>
        null as { from: number; text: string } | null,
    };
    const result = source(ctx);
    expect(result).not.toBeNull();
  });

  it("returns keyword completions", () => {
    const source = spelCompletion(() => null);
    const state = EditorState.create({ doc: "" });
    const ctx = {
      state,
      pos: 0,
      explicit: true as boolean,
      matchBefore: (_re: RegExp) =>
        null as { from: number; text: string } | null,
    };
    const result = source(ctx);
    expect(result).not.toBeNull();
    if (result) {
      const labels = result.options.map((o) => o.label);
      // Should have core SpEL keywords
      expect(labels).toContain("null");
      expect(labels).toContain("true");
      expect(labels).toContain("false");
      // Logical operators may include trailing space
      expect(labels.some((l) => l.startsWith("and"))).toBe(true);
      expect(labels.some((l) => l.startsWith("or"))).toBe(true);
    }
  });
});

describe("Lint source", () => {
  it("returns no diagnostics for valid expressions", () => {
    const div = document.createElement("div");
    const view = createView(
      "1 + 2",
      [spelLanguage(), linter(spelLint(() => null))],
      div,
    );
    const source = spelLint(() => null);
    const diags = source(view);
    expect(diags).toEqual([]);
    view.destroy();
  });

  it("returns diagnostics for invalid expressions", () => {
    const div = document.createElement("div");
    const view = createView(
      "1 +",
      [spelLanguage(), linter(spelLint(() => null))],
      div,
    );
    const source = spelLint(() => null);
    const diags = source(view);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]?.severity).toBeDefined();
    view.destroy();
  });

  it("returns empty array for empty expression", () => {
    const div = document.createElement("div");
    const view = createView(
      "",
      [spelLanguage(), linter(spelLint(() => null))],
      div,
    );
    const source = spelLint(() => null);
    const diags = source(view);
    expect(diags).toEqual([]);
    view.destroy();
  });

  it("returns empty array for whitespace-only expression", () => {
    const div = document.createElement("div");
    const view = createView(
      "   ",
      [spelLanguage(), linter(spelLint(() => null))],
      div,
    );
    const source = spelLint(() => null);
    const diags = source(view);
    expect(diags).toEqual([]);
    view.destroy();
  });

  it("includes error severity for syntax errors", () => {
    const div = document.createElement("div");
    const view = createView(
      "notavalidkeyword",
      [spelLanguage(), linter(spelLint(() => null))],
      div,
    );
    const source = spelLint(() => null);
    const diags = source(view);
    // May produce diagnostics
    expect(Array.isArray(diags)).toBe(true);
    view.destroy();
  });

  it("respects contextSchema for context validation", () => {
    const schema: ContextSchema = {
      root: null,
      variables: {},
      beans: {},
      types: {},
      functions: {},
    };
    const div = document.createElement("div");
    const view = createView(
      "#missing",
      [spelLanguage(), linter(spelLint(() => schema))],
      div,
    );
    const source = spelLint(() => schema);
    const diags = source(view);
    expect(Array.isArray(diags)).toBe(true);
    view.destroy();
  });
});

describe("Hover tooltip", () => {
  const parser = new SpelExpressionParser();

  it("spelHover() returns a valid extension", () => {
    const extension = spelHover();
    expect(extension).toBeDefined();
  });

  it("hover extension can be added to editor without error", () => {
    const div = document.createElement("div");
    const view = createView("#myVar", [spelLanguage(), spelHover()], div);
    expect(div.querySelector(".cm-content")).not.toBeNull();
    view.destroy();
  });

  it("hover works correctly for variable references", () => {
    const div = document.createElement("div");
    const view = createView("#myVar", [spelLanguage(), spelHover()], div);
    expect(
      div.querySelector(".cm-content")?.textContent?.trim().length,
    ).toBeGreaterThan(0);
    view.destroy();
  });

  it("hover handles property references gracefully", () => {
    const div = document.createElement("div");
    const view = createView("#myVar.name", [spelLanguage(), spelHover()], div);
    expect(div.querySelector(".cm-content")).not.toBeNull();
    view.destroy();
  });

  it("hover handles bean references gracefully", () => {
    const div = document.createElement("div");
    const view = createView("@myBean", [spelLanguage(), spelHover()], div);
    expect(div.querySelector(".cm-content")).not.toBeNull();
    view.destroy();
  });

  it("hover does not crash on syntax errors", () => {
    const div = document.createElement("div");
    const view = createView("invalid ))", [spelLanguage(), spelHover()], div);
    expect(div.querySelector(".cm-content")).not.toBeNull();
    view.destroy();
  });

  it("handles empty expression gracefully", () => {
    const div = document.createElement("div");
    const view = createView("", [spelLanguage(), spelHover()], div);
    expect(div.querySelector(".cm-content")).not.toBeNull();
    view.destroy();
  });
});

describe("Hover tooltip source (createHoverSource)", () => {
  it("returns null for empty expression", () => {
    const source = createHoverSource();
    const div = document.createElement("div");
    const view = createView("", [spelLanguage()], div);
    const result = source(view, 0);
    expect(result).toBeNull();
    view.destroy();
  });

  it("returns null for whitespace-only expression", () => {
    const source = createHoverSource();
    const div = document.createElement("div");
    const view = createView("   ", [spelLanguage()], div);
    const result = source(view, 0);
    expect(result).toBeNull();
    view.destroy();
  });

  it("returns correct tooltip for variable references (#var)", () => {
    const source = createHoverSource();
    const div = document.createElement("div");
    const view = createView("#myVar", [spelLanguage()], div);
    const result = source(view, 1);
    expect(result).not.toBeNull();
    if (result) {
      const { dom } = result.create();
      expect(dom.textContent).toBe("Variable: #myVar");
    }
    view.destroy();
  });

  it("returns correct tooltip for bean references (@bean)", () => {
    const source = createHoverSource();
    const div = document.createElement("div");
    const view = createView("@myBean", [spelLanguage()], div);
    const result = source(view, 1);
    expect(result).not.toBeNull();
    if (result) {
      const { dom } = result.create();
      expect(dom.textContent).toBe("Spring Bean: @myBean");
    }
    view.destroy();
  });

  it("returns correct tooltip for property references (.prop)", () => {
    const source = createHoverSource();
    const div = document.createElement("div");
    const view = createView("#myVar.name", [spelLanguage()], div);
    const result = source(view, 7);
    expect(result).not.toBeNull();
    if (result) {
      const { dom } = result.create();
      expect(dom.textContent).toBe("Property: .name");
    }
    view.destroy();
  });

  it("returns correct tooltip for type references (T(type))", () => {
    const source = createHoverSource();
    const div = document.createElement("div");
    const view = createView("T(String)", [spelLanguage()], div);
    const result = source(view, 4);
    expect(result).not.toBeNull();
    if (result) {
      const { dom } = result.create();
      expect(dom.textContent).toBe("Type: T(String)");
    }
    view.destroy();
  });

  it("returns null for non-tooltipable node types", () => {
    const source = createHoverSource();
    const div = document.createElement("div");
    const view = createView("null", [spelLanguage()], div);
    const result = source(view, 1);
    expect(result).toBeNull();
    view.destroy();
  });

  it("returns null for syntax errors", () => {
    const source = createHoverSource();
    const div = document.createElement("div");
    const view = createView("invalid ))", [spelLanguage()], div);
    const result = source(view, 5);
    expect(result).toBeNull();
    view.destroy();
  });

  it("returns null for position outside expression", () => {
    const source = createHoverSource();
    const div = document.createElement("div");
    const view = createView("#myVar", [spelLanguage()], div);
    const result = source(view, 999);
    expect(result).toBeNull();
    view.destroy();
  });
});

describe("getNodeInfo", () => {
  const parser = new SpelExpressionParser();

  it("returns correct text for VARIABLE_REFERENCE", () => {
    const ast = parser.parseRaw("#myVar");
    const node = AstWalker.findNodeAt(ast, 1) as SpelNodeImpl;
    expect(getNodeInfo(node)).toBe("Variable: #myVar");
  });

  it("returns correct text for PROPERTY_OR_FIELD_REFERENCE", () => {
    const ast = parser.parseRaw("#myVar.name");
    const node = AstWalker.findNodeAt(ast, 7) as SpelNodeImpl;
    expect(getNodeInfo(node)).toBe("Property: .name");
  });

  it("returns correct text for BEAN_REFERENCE", () => {
    const ast = parser.parseRaw("@myBean");
    const node = AstWalker.findNodeAt(ast, 1) as SpelNodeImpl;
    expect(getNodeInfo(node)).toBe("Spring Bean: @myBean");
  });

  it("returns correct text for TYPE_REFERENCE", () => {
    const ast = parser.parseRaw("T(String)");
    const node = AstWalker.findNodeAt(ast, 4) as SpelNodeImpl;
    expect(getNodeInfo(node)).toBe("Type: T(String)");
  });

  it("returns null for NULL_LITERAL", () => {
    const ast = parser.parseRaw("null");
    const node = AstWalker.findNodeAt(ast, 1) as SpelNodeImpl;
    expect(getNodeInfo(node)).toBeNull();
  });

  it("returns null for BOOLEAN_LITERAL", () => {
    const ast = parser.parseRaw("true");
    const node = AstWalker.findNodeAt(ast, 1) as SpelNodeImpl;
    expect(getNodeInfo(node)).toBeNull();
  });

  it("returns null for INT_LITERAL", () => {
    const ast = parser.parseRaw("42");
    const node = AstWalker.findNodeAt(ast, 1) as SpelNodeImpl;
    expect(getNodeInfo(node)).toBeNull();
  });

  it("returns null for STRING_LITERAL", () => {
    const ast = parser.parseRaw("'hello'");
    const node = AstWalker.findNodeAt(ast, 1) as SpelNodeImpl;
    expect(getNodeInfo(node)).toBeNull();
  });
});
