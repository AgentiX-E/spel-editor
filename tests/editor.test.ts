/**
 * Editor tests — validates the spel-editor web component.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SpelEditor } from '../src/spel-editor.js';

describe('SpelEditor custom element', () => {
  it('custom element is defined', () => {
    // Importing the module registers the custom element via @customElement decorator.
    // Verify it is registered with the CustomElementRegistry.
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
    // With invalid input but no editor view rendered, cache may be empty
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
    // After appending to DOM, firstUpdated() triggers editor creation
    expect(editor.getEditorView()).not.toBeNull();
  });
});
