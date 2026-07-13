import {
  type CompletionSource,
  type CompletionContext,
} from "@codemirror/autocomplete";
import {
  SpelCompletionEngine,
  type CompletionItem,
  type ContextSchema,
} from "@agentix-e/spel-ts";

/**
 * Adapter: spel-ts CompletionEngine → CM6 CompletionSource.
 *
 * Maps SpelCompletionEngine items to CM6 Completion objects at the cursor position.
 * When a ContextSchema provider is registered, context-aware completions
 * (variables, properties, methods, beans, types) are included.
 */
export function spelCompletion(
  getContextSchema?: () => ContextSchema | null,
): CompletionSource {
  return (context: CompletionContext) => {
    const expression = context.state.sliceDoc();
    const position = context.pos;
    const schema = getContextSchema?.() ?? undefined;

    const items = SpelCompletionEngine.getCompletions(
      expression,
      position,
      schema,
    );

    const validFor = /\w*/;

    return {
      from: context.matchBefore(validFor)?.from ?? position,
      options: items.map((item) => mapToCM6Completion(item)),
      // Allow completions at any position
      validFor: () => true,
    };
  };
}

/** Map spel-ts CompletionItem to CM6 Completion */
function mapToCM6Completion(item: CompletionItem) {
  // Map CompletionKind to CM6 type
  const type = mapKindToCM6Type(item.kind);

  return {
    label: item.label,
    type,
    detail: item.detail,
    info: item.documentation,
    apply: item.insertText,
    // Higher priority items appear first
    boost: item.sortPriority / 100,
  };
}

function mapKindToCM6Type(kind: string): string {
  switch (kind) {
    case "keyword":
      return "keyword";
    case "operator":
      return "operator";
    case "variable":
      return "variable";
    case "property":
      return "property";
    case "method":
      return "method";
    case "function":
      return "function";
    case "type":
      return "type";
    default:
      return "text";
  }
}
