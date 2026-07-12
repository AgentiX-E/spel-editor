import type { ContextSchema } from '@agentix-e/spel-ts';

/** Editor configuration */
export interface EditorConfig {
  placeholder?: string;
  readonly?: boolean;
  minHeight?: string;
  /** Context schema for completion/diagnostics */
  contextSchema?: ContextSchema;
}

/** Event detail for 'change' event */
export interface SpelEditorDetail {
  value: string;
  isValid: boolean;
}
