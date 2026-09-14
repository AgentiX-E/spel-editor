/**
 * The `value` property, and the accessibility tree the component exposes.
 *
 * `setValue()` dispatches into CodeMirror, but plain property assignment
 * (`el.value = 'a > 1'`, or the `value` attribute) does not: `updated()` reacts to
 * `disabled`, `readonly` and `contextSchema` only. A framework binding that sets the
 * property — which is how every declarative consumer works — therefore updates the
 * element's state while the visible document keeps showing the old expression.
 *
 * The wrapper also declared `role="textbox"` and `tabindex="0"`, but CodeMirror's
 * own `.cm-content` already carries `role="textbox"` and
 * `aria-multiline="true"`. The result was two nested textbox nodes and two tab
 * stops for one editable region.
 */
import { describe, it, expect, afterEach } from 'vitest';
// Importing this module is what registers the element: the `@customElement` decorator calls
// `customElements.define` as a side effect. This file names `SpelEditor` only in type
// positions, so the import is written as two statements — a bare one for the side effect and
// an `import type` for the annotation. A combined value import that is never used as a value
// is free to be elided by the transform, and then the module never runs and `createElement`
// returns an element that was never upgraded.
import '../src/spel-editor.js';
import type { SpelEditor } from '../src/spel-editor.js';

function mount(attributes: Record<string, string> = {}): SpelEditor {
  const editor = document.createElement('spel-editor') as SpelEditor;
  for (const [name, value] of Object.entries(attributes)) editor.setAttribute(name, value);
  document.body.appendChild(editor);
  return editor;
}

const mounted: SpelEditor[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.remove();
});

async function editor(attributes: Record<string, string> = {}): Promise<SpelEditor> {
  const element = mount(attributes);
  mounted.push(element);
  await element.updateComplete;
  return element;
}

describe('value reflection', () => {
  it('reflects a property assignment into the visible document', async () => {
    const element = await editor();
    element.value = 'a > 1';
    await element.updateComplete;

    expect(element.getEditorView()?.state.sliceDoc()).toBe('a > 1');
  });

  it('reflects a later property assignment, replacing the previous document', async () => {
    const element = await editor();
    element.value = 'first';
    await element.updateComplete;
    element.value = 'second';
    await element.updateComplete;

    expect(element.getEditorView()?.state.sliceDoc()).toBe('second');
  });

  it('reflects the value attribute', async () => {
    const element = await editor({ value: '#order.amount > 1000' });
    expect(element.getEditorView()?.state.sliceDoc()).toBe('#order.amount > 1000');
  });

  it('reflects a change to the value attribute after the first render', async () => {
    const element = await editor({ value: 'a' });
    element.setAttribute('value', 'b');
    await element.updateComplete;

    expect(element.getEditorView()?.state.sliceDoc()).toBe('b');
  });

  it('places the cursor at the end of a value assigned as a property', async () => {
    const element = await editor();
    element.value = 'abc';
    await element.updateComplete;

    expect(element.getEditorView()?.state.selection.main.anchor).toBe(3);
  });

  it('leaves the document alone when the value already matches', async () => {
    const element = await editor({ value: 'abcdef' });
    const view = element.getEditorView();
    if (!view) throw new Error('editor did not render');

    // Put the cursor in the middle, so a whole-document replacement is detectable:
    // that would leave the cursor at the end of the text instead.
    view.dispatch({ selection: { anchor: 2 } });
    view.dispatch({ changes: { from: 2, insert: 'X' } });
    await element.updateComplete;

    expect(element.value).toBe('abXcdef');
    expect(element.getEditorView()?.state.sliceDoc()).toBe('abXcdef');
    // CodeMirror leaves the cursor before text inserted by a bare `dispatch`, so it
    // stays at 2. A whole-document replacement is what would move it, to the end of
    // the text (7) — which is the evidence this looks for.
    expect(element.getEditorView()?.state.selection.main.anchor).toBe(2);
  });
});

describe('accessibility tree', () => {
  it('exposes exactly one textbox, provided by CodeMirror', async () => {
    const element = await editor({ value: 'a' });
    const root = element.shadowRoot;
    expect(root).not.toBeNull();

    const textboxes = root?.querySelectorAll('[role="textbox"]') ?? [];
    expect(textboxes.length).toBe(1);
    expect(textboxes[0]?.classList.contains('cm-content')).toBe(true);
  });

  it('does not make the scroll wrapper a second tab stop', async () => {
    const element = await editor({ value: 'a' });
    const wrapper = element.shadowRoot?.querySelector('.cm-container');

    expect(wrapper?.getAttribute('role')).toBeNull();
    expect(wrapper?.getAttribute('tabindex')).toBeNull();
  });

  it('labels the editable region with the placeholder', async () => {
    const element = await editor({ value: 'a', placeholder: 'Type a rule' });
    const content = element.shadowRoot?.querySelector('.cm-content');

    expect(content?.getAttribute('aria-label')).toBe('Type a rule');
  });

  it('reports the read-only state on the editable region', async () => {
    const element = await editor({ value: 'a', readonly: '' });
    const content = element.shadowRoot?.querySelector('.cm-content');

    expect(content?.getAttribute('aria-readonly')).toBe('true');
  });

  it('reports the disabled state on the editable region', async () => {
    const element = await editor({ value: 'a', disabled: '' });
    const content = element.shadowRoot?.querySelector('.cm-content');

    expect(content?.getAttribute('aria-disabled')).toBe('true');
  });

  it('keeps the editable region editable when not read-only', async () => {
    const element = await editor({ value: 'a' });
    const content = element.shadowRoot?.querySelector('.cm-content');

    expect(content?.getAttribute('contenteditable')).toBe('true');
  });
});
