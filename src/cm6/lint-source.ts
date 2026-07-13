import {
  type Diagnostic as CMDiagnostic,
  type LintSource,
} from "@codemirror/lint";
import {
  SpelDiagnosticEngine,
  type ContextSchema,
  DiagnosticSeverity,
} from "@agentix-e/spel-ts";

/**
 * Adapter: spel-ts DiagnosticEngine → CM6 LintSource.
 *
 * Runs syntax + semantic + context checks on each change
 * and maps SpelDiagnostic[] to CM6 Diagnostic[].
 */
export function spelLint(
  getContextSchema?: () => ContextSchema | null,
): LintSource {
  return (view) => {
    const expression = view.state.sliceDoc();
    const schema = getContextSchema?.() ?? undefined;

    if (expression.trim().length === 0) return [];

    const diagnostics = SpelDiagnosticEngine.validate(expression, schema);

    return diagnostics.map((d) => mapToCM6Diagnostic(d));
  };
}

function mapToCM6Diagnostic(
  d: import("@agentix-e/spel-ts").SpelDiagnostic,
): CMDiagnostic {
  return {
    from: d.from,
    to: d.to,
    message: d.message,
    severity: mapSeverity(d.severity),
    source: d.code,
  };
}

function mapSeverity(sev: DiagnosticSeverity): "error" | "warning" | "info" {
  switch (sev) {
    case DiagnosticSeverity.ERROR:
      return "error";
    case DiagnosticSeverity.WARNING:
      return "warning";
    case DiagnosticSeverity.INFO:
      return "info";
  }
}
