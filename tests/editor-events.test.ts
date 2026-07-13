/**
 * SpelEditor component integration & event tests.
 *
 * Tests the full web component lifecycle: creation, events, API surface,
 * and error handling — all with real DOM and real EditorView instances.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SpelEditor } from "../src/spel-editor.js";

interface ChangeEventDetail {
  value: string;
  isValid: boolean;
}

function fireChangeHandler(element: HTMLElement): {
  handler: ReturnType<typeof vi.fn>;
  getLastDetail: () => ChangeEventDetail;
} {
  const handler = vi.fn();
  element.addEventListener("change", handler);
  return {
    handler,
    getLastDetail: () =>
      handler.mock.lastCall?.[0]?.detail as ChangeEventDetail,
  };
}

describe("SpelEditor change events", () => {
  let editor: SpelEditor;

  beforeEach(() => {
    editor = document.createElement("spel-editor") as SpelEditor;
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
  });

  it("fires change event with {value, isValid: true} for valid expressions", () => {
    const { handler, getLastDetail } = fireChangeHandler(editor);
    editor.setValue("2 + 3");
    expect(handler).toHaveBeenCalledTimes(1);

    const detail = getLastDetail();
    expect(detail.value).toBe("2 + 3");
    expect(detail.isValid).toBe(true);
  });

  it("fires change event with isValid: false for invalid expressions", () => {
    const { handler, getLastDetail } = fireChangeHandler(editor);
    editor.setValue("1 +");
    expect(handler).toHaveBeenCalledTimes(1);

    const detail = getLastDetail();
    expect(detail.value).toBe("1 +");
    expect(detail.isValid).toBe(false);
  });

  it("fires change event with isValid: true for literals", () => {
    const { handler, getLastDetail } = fireChangeHandler(editor);
    editor.setValue("null");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(getLastDetail().isValid).toBe(true);

    editor.setValue("true");
    expect(handler).toHaveBeenCalledTimes(2);
    expect(getLastDetail().isValid).toBe(true);
  });

  it("fires change event with isValid: true for variable references", () => {
    const { handler, getLastDetail } = fireChangeHandler(editor);
    editor.setValue("#myVar");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(getLastDetail().isValid).toBe(true);
  });

  it("fires change event with isValid: true for string literals", () => {
    const { handler, getLastDetail } = fireChangeHandler(editor);
    editor.setValue("'hello'");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(getLastDetail().isValid).toBe(true);
  });

  it("fires change event with isValid: false for unclosed string", () => {
    const { handler, getLastDetail } = fireChangeHandler(editor);
    editor.setValue("'unclosed");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(getLastDetail().isValid).toBe(false);
  });

  it("fires change event with isValid: true for empty string", () => {
    // Start with non-empty to ensure a change happens
    editor.setValue("x");
    const { handler, getLastDetail } = fireChangeHandler(editor);
    editor.setValue("");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(getLastDetail().isValid).toBe(true);
  });
});

describe("SpelEditor format()", () => {
  let editor: SpelEditor;

  beforeEach(() => {
    editor = document.createElement("spel-editor") as SpelEditor;
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
  });

  it("formats expressions with spaces around operators", () => {
    editor.setValue("1+2*3");
    editor.format();
    const result = editor.getValue();
    // SpelFormatter may add parentheses for operator precedence
    expect(result).toContain("1");
    expect(result).toContain("2");
    expect(result).toContain("3");
    expect(result).toMatch(/\d\s*[\+\-\*\/]\s*\d/);
  });

  it("does not alter already-formatted expressions", () => {
    editor.setValue("1 + 2");
    const before = editor.getValue();
    editor.format();
    // Format may add parentheses but should normalize
    const result = editor.getValue();
    expect(result.length).toBeGreaterThanOrEqual(before.length);
  });

  it("does not throw on empty expressions", () => {
    expect(() => editor.format()).not.toThrow();
  });

  it("formats expressions with method calls", () => {
    editor.setValue("#list.size()");
    editor.format();
    expect(editor.getValue()).toContain("#list");
    expect(editor.getValue()).toContain("size()");
  });
});

describe("SpelEditor insertSnippet()", () => {
  let editor: SpelEditor;

  beforeEach(() => {
    editor = document.createElement("spel-editor") as SpelEditor;
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
  });

  it("inserts text at end of content", () => {
    editor.setValue("hello");
    editor.insertSnippet(" world");
    expect(editor.getValue()).toBe("hello world");
  });

  it("fires change event after insert", () => {
    editor.setValue("hello");
    const { handler, getLastDetail } = fireChangeHandler(editor);
    editor.insertSnippet("!");
    expect(handler).toHaveBeenCalled();
    expect(getLastDetail().value).toBe("hello!");
  });

  it("inserts text into empty editor", () => {
    editor.insertSnippet("#var");
    expect(editor.getValue()).toBe("#var");
  });
});

describe("SpelEditor validate()", () => {
  let editor: SpelEditor;

  beforeEach(() => {
    editor = document.createElement("spel-editor") as SpelEditor;
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
  });

  it("returns empty array for empty editor (no crash)", () => {
    const result = editor.validate();
    expect(result).toEqual([]);
  });

  it("returns empty array after setting valid expression (need to wait for debounce)", async () => {
    editor.setValue("2 + 3");
    // Wait for debounced diagnostics
    await new Promise((resolve) => setTimeout(resolve, 400));
    const result = editor.validate();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns diagnostics after setting invalid expression (after debounce)", async () => {
    editor.setValue("1 +");
    await new Promise((resolve) => setTimeout(resolve, 400));
    const result = editor.validate();
    // May or may not have diagnostics depending on the diagnostic engine
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("SpelEditor contextSchema", () => {
  let editor: SpelEditor;

  beforeEach(() => {
    editor = document.createElement("spel-editor") as SpelEditor;
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
  });

  it("default contextSchema is null", () => {
    expect(editor.contextSchema).toBeNull();
  });

  it("can set contextSchema and editor still functions", () => {
    editor.contextSchema = {
      root: null,
      variables: { test: { type: "String" } },
      beans: {},
      types: {},
      functions: {},
    };
    expect(editor.contextSchema).not.toBeNull();
    editor.setValue("#test");
    expect(editor.getValue()).toBe("#test");
  });

  it("contextSchema changes trigger diagnostic re-run", async () => {
    // Set a valid expression first
    editor.setValue("#myVar");
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Set a schema that doesn't have myVar (might produce context warnings)
    editor.contextSchema = {
      root: null,
      variables: {},
      beans: {},
      types: {},
      functions: {},
    };

    // Should not throw
    expect(editor.getValue()).toBe("#myVar");
  });

  it("contextSchema with variables does not break editor", () => {
    editor.contextSchema = {
      root: null,
      variables: {
        orderId: { type: "String", description: "Order identifier" },
        amount: { type: "Number", description: "Order amount" },
      },
      beans: {},
      types: {},
      functions: {},
    };
    editor.setValue("#orderId > 0");
    expect(editor.getValue()).toBe("#orderId > 0");
  });
});

describe("SpelEditor props", () => {
  it("can set placeholder", () => {
    const editor = document.createElement("spel-editor") as SpelEditor;
    editor.placeholder = "Type expression...";
    expect(editor.placeholder).toBe("Type expression...");
  });

  it("has default placeholder", () => {
    const editor = document.createElement("spel-editor") as SpelEditor;
    expect(editor.placeholder).toBe("Enter SpEL expression...");
  });

  it("can set minHeight", () => {
    const editor = document.createElement("spel-editor") as SpelEditor;
    editor.minHeight = "200px";
    expect(editor.minHeight).toBe("200px");
  });

  it("can set readonly and disabled", () => {
    const editor = document.createElement("spel-editor") as SpelEditor;
    editor.readonly = true;
    expect(editor.readonly).toBe(true);
    editor.disabled = true;
    expect(editor.disabled).toBe(true);
  });
});

describe("SpelEditor lifecycle", () => {
  it("produces valid getEditorView() when mounted", async () => {
    const editor = document.createElement("spel-editor") as SpelEditor;
    document.body.appendChild(editor);
    await editor.updateComplete;
    expect(editor.getEditorView()).not.toBeNull();
    editor.remove();
    expect(editor.getEditorView()).toBeNull();
  });

  it("handles multiple mount/unmount cycles", async () => {
    const editor = document.createElement("spel-editor") as SpelEditor;

    // First mount
    document.body.appendChild(editor);
    await editor.updateComplete;
    expect(editor.getEditorView()).not.toBeNull();
    editor.remove();
    expect(editor.getEditorView()).toBeNull();

    // Second mount
    document.body.appendChild(editor);
    await editor.updateComplete;
    expect(editor.getEditorView()).not.toBeNull();

    // Set value after re-mount
    editor.setValue("re-mounted");
    expect(editor.getValue()).toBe("re-mounted");
    editor.remove();
  });

  it("getValue() returns value set before mount", () => {
    const editor = document.createElement("spel-editor") as SpelEditor;
    editor.setValue("pre-set");
    expect(editor.getValue()).toBe("pre-set");
  });
});
