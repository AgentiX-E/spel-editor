import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { closeBrackets, autocompletion } from '@codemirror/autocomplete';
import { linter } from '@codemirror/lint';

import { spelLanguage } from './cm6/spel-language.js';
import { spelCompletion } from './cm6/completion-source.js';
import { spelLint } from './cm6/lint-source.js';
import { spelHover } from './cm6/hover-tooltip.js';
import { SpelFormatter } from '@agentix-e/spel-ts';

import type { SpelEditorDetail } from './types.js';
import type { ContextSchema, SpelDiagnostic } from '@agentix-e/spel-ts';

const EDITOR_STYLES = css`
  :host {
    display: block;
  }
  .cm-container {
    overflow: hidden;
  }
  .cm-editor {
    height: 100%;
    font-family: var(--spel-font-family, 'JetBrains Mono', monospace);
    font-size: var(--spel-font-size, 14px);
    line-height: var(--spel-line-height, 1.6);
  }
  .cm-editor.cm-focused { outline: none; }
  .cm-editor .cm-scroller { overflow: auto; }
  .cm-editor .cm-content { caret-color: var(--spel-cursor, #111827); }
  .cm-editor .cm-cursor, .cm-editor .cm-dropCursor {
    border-left-color: var(--spel-cursor, #111827);
  }
  .cm-editor .cm-activeLine {
    background-color: var(--spel-line-highlight, #f3f4f6);
  }
  .cm-editor .cm-selectionBackground, .cm-editor.cm-focused .cm-selectionBackground {
    background: var(--spel-selection-bg, #bfdbfe) !important;
  }
  .cm-editor .cm-gutters {
    background: var(--spel-gutter-bg, #f9fafb);
    color: var(--spel-gutter-fg, #9ca3af);
    border: none;
  }
`;

/**
 * `<spel-editor>` — Web-embeddable SpEL expression editor.
 */
@customElement('spel-editor')
export class SpelEditor extends LitElement {
  static override styles = EDITOR_STYLES;

  @property({ type: String })
  value = '';

  @property({ type: Object, attribute: false })
  contextSchema: ContextSchema | null = null;

  @property({ type: String })
  placeholder = 'Enter SpEL expression...';

  @property({ type: Boolean, reflect: true })
  readonly = false;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: String, attribute: 'min-height' })
  minHeight = '80px';

  @property({ type: Boolean, attribute: false })
  showNL = false;

  @query('.cm-container')
  private containerEl!: HTMLElement;

  private editorView: EditorView | null = null;
  private diagnosticCache: SpelDiagnostic[] = [];

  override render() {
    return html`
      <div
        class="cm-container"
        style="
          min-height: ${this.minHeight};
          border: var(--spel-border-width, 1px) solid var(--spel-border-color, #d0d5dd);
          border-radius: var(--spel-border-radius, 6px);
          background: var(--spel-bg, #ffffff);
        "
      ></div>
    `;
  }

  override firstUpdated() {
    this.#createEditor();
  }

  override updated(changed: PropertyValues) {
    if (changed.has('disabled') || changed.has('readonly')) {
      this.#updateEditorState();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.editorView?.destroy();
    this.editorView = null;
  }

  getValue(): string {
    return this.editorView?.state.sliceDoc() ?? this.value;
  }

  setValue(value: string): void {
    this.value = value;
    if (this.editorView) {
      this.editorView.dispatch({
        changes: { from: 0, to: this.editorView.state.doc.length, insert: value },
      });
    }
  }

  validate(): SpelDiagnostic[] {
    return this.diagnosticCache;
  }

  format(): void {
    if (!this.editorView) return;
    const formatted = SpelFormatter.format(this.editorView.state.sliceDoc());
    if (formatted) {
      this.setValue(formatted);
    }
  }

  getEditorView(): EditorView | null {
    return this.editorView;
  }

  #createEditor() {
    const extensions: Extension[] = [
      spelLanguage(),
      autocompletion({ override: [spelCompletion(() => this.contextSchema)] }),
      linter(spelLint(() => this.contextSchema)),
      spelHover(),
      history(),
      closeBrackets(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      cmPlaceholder(this.placeholder),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          this.value = update.state.sliceDoc();
          this.#fireChange();
        }
      }),
    ];

    if (this.readonly || this.disabled) {
      extensions.push(EditorState.readOnly.of(true));
    }

    this.editorView = new EditorView({
      state: EditorState.create({ doc: this.value, extensions }),
      parent: this.containerEl,
    });
  }

  #updateEditorState() {
    // Simplified: dispatching state effects requires complex CM6 internals.
    // Instead, we just track the state and the editor handles it via readOnly config at creation time.
    if (!this.editorView) return;
    const editable = !(this.readonly || this.disabled);
    this.editorView.contentDOM.contentEditable = String(editable);
  }

  #fireChange() {
    const detail: SpelEditorDetail = {
      value: this.value,
      isValid: this.diagnosticCache.length === 0 ||
        !this.diagnosticCache.some(d => d.severity === 'error'),
    };
    this.dispatchEvent(new CustomEvent('change', { detail, bubbles: true, composed: true }));
  }
}
