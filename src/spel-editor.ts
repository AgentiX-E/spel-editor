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
import { SpelFormatter, SpelDiagnosticEngine } from '@agentix-e/spel-ts';

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
  .cm-editor.cm-focused {
    outline: none;
  }
  .cm-editor .cm-scroller {
    overflow: auto;
  }
  .cm-editor .cm-content {
    caret-color: var(--spel-cursor, #111827);
  }
  .cm-editor .cm-cursor,
  .cm-editor .cm-dropCursor {
    border-left-color: var(--spel-cursor, #111827);
  }
  .cm-editor .cm-activeLine {
    background-color: var(--spel-line-highlight, #f3f4f6);
  }
  .cm-editor .cm-selectionBackground,
  .cm-editor.cm-focused .cm-selectionBackground {
    background: var(--spel-selection-bg, #bfdbfe) !important;
  }
  .cm-editor .cm-gutters {
    background: var(--spel-gutter-bg, #f9fafb);
    /* 5.72:1 on the gutter background. The previous #9ca3af measured 2.43:1, under
       the 4.5:1 WCAG AA requires for text, which made line numbers and lint markers
       unreadable at reduced contrast sensitivity. */
    color: var(--spel-gutter-fg, #5b6472);
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

  @query('.cm-container')
  private containerEl!: HTMLElement;

  #editorView: EditorView | null = null;
  #diagnosticCache: SpelDiagnostic[] = [];
  #diagnosticDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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
    if (changed.has('disabled') || changed.has('readonly') || changed.has('placeholder')) {
      // All three are baked into the extension list, so a change has to rebuild the
      // editor rather than mutate it.
      this.#updateEditorState();
    }
    // Re-create editor if it was destroyed (e.g. after re-attach to DOM)
    if (!this.#editorView && this.containerEl) {
      this.#createEditor();
    }
    // Reflect a value that was assigned rather than typed, so a declarative binding
    // (`el.value = …`, or the `value` attribute) reaches the visible document.
    if (changed.has('value')) {
      this.#reflectValue();
    }
    // Re-run diagnostics when context schema changes
    if (changed.has('contextSchema')) {
      this.#scheduleDiagnostics();
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    // Re-create editor when re-attached to DOM after removal
    if (this.hasUpdated && !this.#editorView) {
      void this.updateComplete.then(() => {
        if (!this.#editorView) {
          this.#createEditor();
        }
      });
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.#diagnosticDebounceTimer) {
      clearTimeout(this.#diagnosticDebounceTimer);
      this.#diagnosticDebounceTimer = null;
    }
    this.#editorView?.destroy();
    this.#editorView = null;
  }

  /**
   * Get the current expression text from the editor.
   */
  getValue(): string {
    return this.#editorView?.state.sliceDoc() ?? this.value;
  }

  /**
   * Set the expression text programmatically.
   */
  setValue(value: string): void {
    this.value = value;
    if (this.#editorView) {
      this.#editorView.dispatch({
        changes: {
          from: 0,
          to: this.#editorView.state.doc.length,
          insert: value,
        },
        selection: { anchor: value.length },
      });
      this.#scheduleDiagnostics();
    }
  }

  /**
   * Insert a text snippet at the current cursor position.
   */
  insertSnippet(snippet: string): void {
    if (!this.#editorView) return;
    const { from, to } = this.#editorView.state.selection.main;
    this.#editorView.dispatch({
      changes: { from, to, insert: snippet },
      selection: { anchor: from + snippet.length },
    });
  }

  /**
   * Get the current diagnostics from the debounced validation cache.
   */
  validate(): SpelDiagnostic[] {
    return this.#diagnosticCache;
  }

  /**
   * Format the current expression using SpelFormatter.
   */
  format(): void {
    if (!this.#editorView) return;
    const current = this.#editorView.state.sliceDoc();
    const formatted = SpelFormatter.format(current);
    if (formatted && formatted !== current) {
      this.#editorView.dispatch({
        changes: {
          from: 0,
          to: this.#editorView.state.doc.length,
          insert: formatted,
        },
        selection: { anchor: formatted.length },
      });
    }
  }

  /**
   * Get the underlying CodeMirror 6 EditorView instance.
   */
  getEditorView(): EditorView | null {
    return this.#editorView;
  }

  /**
   * Push the current `value` into the editor, if the two have diverged.
   *
   * Typing sets `value` from the document, so this is a no-op for the common case and
   * only acts on a value assigned from outside — which is how every declarative
   * consumer sets it. Without this, `el.value = 'a > 1'` updated the element's state
   * while the visible document kept showing the previous expression.
   *
   * The guard is what keeps it from looping: the change listener writes the document
   * text back into `value`, and a dispatch here is skipped whenever they already
   * agree, so the cursor is never reset mid-edit.
   */
  #reflectValue(): void {
    const view = this.#editorView;
    if (!view) return;

    const current = view.state.sliceDoc();
    if (current === this.value) return;

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: this.value },
      selection: { anchor: this.value.length },
    });
    this.#scheduleDiagnostics();
  }

  /**
   * Schedule a debounced diagnostic run (300ms).
   * Avoids redundant computation on rapid typing.
   */
  #scheduleDiagnostics() {
    if (this.#diagnosticDebounceTimer) {
      clearTimeout(this.#diagnosticDebounceTimer);
    }
    this.#diagnosticDebounceTimer = setTimeout(() => {
      this.#runDiagnostics();
      this.#diagnosticDebounceTimer = null;
    }, 300);
  }

  /**
   * Populate diagnosticCache by running validation.
   * Dispatches a `validate` event after diagnostics complete.
   */
  #runDiagnostics() {
    if (!this.#editorView) return;
    const expr = this.#editorView.state.sliceDoc();
    if (expr.trim().length === 0) {
      this.#diagnosticCache = [];
      return;
    }
    this.#diagnosticCache = SpelDiagnosticEngine.validate(expr, this.contextSchema ?? undefined);
    this.dispatchEvent(
      new CustomEvent('validate', {
        detail: { diagnostics: this.#diagnosticCache },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Attributes for the editable region.
   *
   * CodeMirror already renders `.cm-content` with `role="textbox"`,
   * `aria-multiline="true"` and — when the state is read-only — `aria-readonly`, so
   * that element is the component's one textbox. The label and the disabled state
   * belong on it as well: declaring them on the wrapper as well produced two nested
   * textboxes and two tab stops for a single editable region.
   */
  #contentAttributes(): Record<string, string> {
    return {
      'aria-label': this.placeholder,
      ...(this.disabled ? { 'aria-disabled': 'true' } : {}),
    };
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
      EditorView.contentAttributes.of(this.#contentAttributes()),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.value = update.state.sliceDoc();
          this.#fireChange();
          this.#scheduleDiagnostics();
        }
      }),
    ];

    if (this.readonly || this.disabled) {
      extensions.push(EditorState.readOnly.of(true));
    }

    this.#editorView = new EditorView({
      state: EditorState.create({ doc: this.value, extensions }),
      parent: this.containerEl,
    });

    // Run initial diagnostics
    this.#scheduleDiagnostics();
  }

  #updateEditorState() {
    this.#editorView?.destroy();
    this.#editorView = null;
    this.#createEditor();
  }

  #fireChange() {
    // Run a synchronous syntax check to determine validity immediately.
    // The debounced full validation (semantic + context + type) is handled
    // by #scheduleDiagnostics, but the change event fires now so consumers
    // get an accurate isValid reading without a 300ms delay.
    // Empty expressions are considered valid (no expression = no error).
    const expr = this.value.trim();
    const syntaxDiags = expr.length === 0 ? [] : SpelDiagnosticEngine.checkSyntax(this.value);
    const detail: SpelEditorDetail = {
      value: this.value,
      isValid: syntaxDiags.length === 0,
    };
    this.dispatchEvent(new CustomEvent('change', { detail, bubbles: true, composed: true }));
  }
}
