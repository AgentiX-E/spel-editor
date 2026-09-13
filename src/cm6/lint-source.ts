import { type Diagnostic as CMDiagnostic, type LintSource } from '@codemirror/lint';
import {
  SpelDiagnosticEngine,
  type ContextSchema,
  type SpelDiagnostic,
  DiagnosticSeverity,
} from '@agentix-e/spel-ts';

/**
 * Adapter: spel-ts DiagnosticEngine → CM6 LintSource.
 *
 * Runs syntax + semantic + context checks on each change
 * and maps SpelDiagnostic[] to CM6 Diagnostic[].
 */
export function spelLint(getContextSchema?: () => ContextSchema | null): LintSource {
  return (view) => {
    const expression = view.state.sliceDoc();
    const schema = getContextSchema?.() ?? undefined;

    if (expression.trim().length === 0) return [];

    const diagnostics = SpelDiagnosticEngine.validate(expression, schema);

    return diagnostics.map((diagnostic) => mapToCM6Diagnostic(diagnostic, view.state.doc.length));
  };
}

/**
 * Map an engine diagnostic to a CM6 one, clamped to the document.
 *
 * CodeMirror rejects a range outside the document and a rejected decoration takes
 * out the whole lint run, so a single out-of-range position would cost the user every
 * mark instead of one. Clamping keeps the annotations that are in range and pins an
 * over-long one to the end of the text, where the problem usually is.
 */
export function mapToCM6Diagnostic(diagnostic: SpelDiagnostic, docLength: number): CMDiagnostic {
  const from = Math.max(0, Math.min(diagnostic.from, docLength));
  const to = Math.max(from, Math.min(diagnostic.to, docLength));

  return {
    from,
    to,
    message: diagnostic.message,
    severity: mapSeverity(diagnostic.severity),
    source: diagnostic.code,
  };
}

function mapSeverity(sev: DiagnosticSeverity): 'error' | 'warning' | 'info' {
  switch (sev) {
    case DiagnosticSeverity.ERROR:
      return 'error';
    case DiagnosticSeverity.WARNING:
      return 'warning';
    case DiagnosticSeverity.INFO:
      return 'info';
  }
}
