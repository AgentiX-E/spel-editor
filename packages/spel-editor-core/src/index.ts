/**
 * @agentix-e/spel-editor-core — Public API
 *
 * Web-embeddable Spring Expression Language (SpEL) editor.
 * Based on CodeMirror 6 with spel-ts v1.1.0 language services.
 */
export { SpelEditor } from './spel-editor.js';
export type { EditorConfig, SpelEditorDetail } from './types.js';

// Re-export for convenience
export type { ContextSchema } from '@agentix-e/spel-ts';
export type { SpelDiagnostic } from '@agentix-e/spel-ts';
