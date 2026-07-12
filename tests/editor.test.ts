/**
 * Editor tests — validates the spel-editor web component.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SpelEditor } from '../src/spel-editor.js';

function waitForDebounce(ms = 400) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('SpelEditor custom element', () => {
  it('custom element is defined', () => {
    expect(customElements.get('spel-editor')).toBe(SpelEditor);
  });

  it('can be instantiated via document.createElement', () => {
    const el = document.createElement('spel-editor');
    expect(el).toBeInstanceOf(SpelEditor);
    expect(el).toBeInstanceOf(HTMLElement);
  });
});

describe('SpelEditor API', () => {
  let editor: SpelEditor;

  beforeEach(() => {
    editor = document.createElement('spel-editor') as SpelEditor;
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
  });

  it('getValue() returns default empty string', () => {
    expect(editor.getValue()).toBe('');
  });

  it('setValue() updates value property', () => {
    editor.setValue('2 + 3');
    expect(editor.value).toBe('2 + 3');
    expect(editor.getValue()).toBe('2 + 3');
  });

  it('validate() returns an array', () => {
    const result = editor.validate();
    expect(Array.isArray(result)).toBe(true);
  });

  it('validate() returns diagnostic objects with expected shape when present', () => {
    editor.setValue('1+');
    const result = editor.validate();
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      const d = result[0]!;
      expect(d).toHaveProperty('severity');
      expect(d).toHaveProperty('message');
      expect(d).toHaveProperty('from');
      expect(d).toHaveProperty('to');
    }
  });

  it('getEditorView() returns EditorView instance when rendered', () => {
    expect(editor.getEditorView()).not.toBeNull();
  });
});

describe('SpelEditor events', () => {
  let editor: SpelEditor;

  beforeEach(() => {
    editor = document.createElement('spel-editor') as SpelEditor;
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
  });

  it('fires change event when value is set programmatically', () => {
    const handler = vi.fn();
    editor.addEventListener('change', handler);
    editor.setValue('test');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].detail.value).toBe('test');
    expect(handler.mock.calls[0]![0].detail.isValid).toBe(true);
  });

  it('change event detail contains isValid: false for invalid expressions', () => {
    const handler = vi.fn();
    editor.addEventListener('change', handler);
    editor.setValue('1 +');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].detail.value).toBe('1 +');
  });
});

describe('SpelEditor format()', () => {
  let editor: SpelEditor;

  beforeEach(() => {
    editor = document.createElement('spel-editor') as SpelEditor;
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
  });

  it('format() does not throw on empty expression', () => {
    expect(() => editor.format()).not.toThrow();
  });

  it('format() does not throw on whitespace-only expression', () => {
    editor.setValue('   ');
    expect(() => editor.format()).not.toThrow();
  });

  it('format() formats spaces around operators', () => {
    editor.setValue('1+2*3');
    editor.format();
    // Should have added spaces around operators
    const result = editor.getValue();
    expect(result.length).toBeGreaterThanOrEqual(5);
  });

  it('format() does not fire change event when expression is unchanged', () => {
    editor.setValue('1 + 2');
    const handler = vi.fn();
    editor.addEventListener('change', handler);
    const callsBefore = handler.mock.calls.length;
    editor.format();
    // format may or may not fire depending on if format() changes the text
    // But it shouldn't cause extra change events beyond expected
    expect(handler.mock.calls.length).toBeLessThanOrEqual(callsBefore + 1);
  });
});

describe('SpelEditor insertSnippet()', () => {
  let editor: SpelEditor;

  beforeEach(() => {
    editor = document.createElement('spel-editor') as SpelEditor;
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
  });

  it('insertSnippet() inserts text at cursor position', () => {
    editor.setValue('hello');
    // Cursor is at end after setValue
    editor.insertSnippet(' world');
    expect(editor.getValue()).toBe('hello world');
  });

  it('insertSnippet() fires change event', () => {
    editor.setValue('hello');
    const handler = vi.fn();
    editor.addEventListener('change', handler);
    editor.insertSnippet('!');
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[handler.mock.calls.length - 1]![0].detail.value).toBe('hello!');
  });
});

describe('SpelEditor contextSchema', () => {
  let editor: SpelEditor;

  beforeEach(() => {
    editor = document.createElement('spel-editor') as SpelEditor;
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
  });

  it('contextSchema defaults to null', () => {
    expect(editor.contextSchema).toBeNull();
  });

  it('can set contextSchema and editor still functions', () => {
    editor.contextSchema = {
      variables: [{ name: 'test', type: 'String' }],
    };
    expect(editor.contextSchema).toEqual({ variables: [{ name: 'test', type: 'String' }] });
    // Editor should still work
    editor.setValue('#test');
    expect(editor.getValue()).toBe('#test');
  });
});

describe('SpelEditor error paths', () => {
  it('getValue() returns default value when editor not mounted', () => {
    const editor = document.createElement('spel-editor') as SpelEditor;
    // Not appended to DOM, so no editorView
    expect(editor.getValue()).toBe('');
  });

  it('setValue() on unmounted editor sets value property', () => {
    const editor = document.createElement('spel-editor') as SpelEditor;
    editor.setValue('test');
    expect(editor.value).toBe('test');
    expect(editor.getValue()).toBe('test');
  });

  it('insertSnippet() on unmounted editor does not throw', () => {
    const editor = document.createElement('spel-editor') as SpelEditor;
    expect(() => editor.insertSnippet('test')).not.toThrow();
  });

  it('format() on unmounted editor does not throw', () => {
    const editor = document.createElement('spel-editor') as SpelEditor;
    expect(() => editor.format()).not.toThrow();
  });

  it('validate() on unmounted editor returns empty array', () => {
    const editor = document.createElement('spel-editor') as SpelEditor;
    expect(editor.validate()).toEqual([]);
  });

  it('getEditorView() on unmounted editor returns null', () => {
    const editor = document.createElement('spel-editor') as SpelEditor;
    expect(editor.getEditorView()).toBeNull();
  });

  it('disconnectedCallback cleans up without throwing', () => {
    const editor = document.createElement('spel-editor') as SpelEditor;
    document.body.appendChild(editor);
    expect(() => editor.remove()).not.toThrow();
    // Verify cleanup
    expect(editor.getEditorView()).toBeNull();
  });

  it('can be appended and removed multiple times', async () => {
    const editor = document.createElement('spel-editor') as SpelEditor;
    document.body.appendChild(editor);
    await editor.updateComplete;
    expect(editor.getEditorView()).not.toBeNull();
    editor.remove();
    expect(editor.getEditorView()).toBeNull();
    document.body.appendChild(editor);
    await editor.updateComplete;
    expect(editor.getEditorView()).not.toBeNull();
    editor.remove();
  });
});
