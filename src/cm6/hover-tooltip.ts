import { hoverTooltip } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";
import {
  AstWalker,
  NodeType,
  SpelExpressionParser,
  VariableReference,
  PropertyOrFieldReference,
  BeanReference,
  TypeReference,
} from "@agentix-e/spel-ts";
import type { SpelNodeImpl } from "@agentix-e/spel-ts";

/**
 * Adapter: spel-ts AstWalker → CM6 hoverTooltip.
 */
export function spelHover() {
  return hoverTooltip(createHoverSource());
}

/**
 * Create the hover tooltip source function for CM6.
 * Exported for testing.
 */
export function createHoverSource() {
  return (view: EditorView, pos: number) => {
    const expression = view.state.sliceDoc();
    if (expression.trim().length === 0) return null;

    try {
      const parser = new SpelExpressionParser();
      const ast = parser.parseRaw(expression);
      const node = AstWalker.findNodeAt(ast, pos);

      if (!node) return null;

      const info = getNodeInfo(node);
      if (!info) return null;

      return {
        pos: node.startPos,
        end: node.endPos,
        create() {
          const dom = document.createElement("div");
          dom.style.cssText =
            "padding: 4px 8px; font-size: 13px; max-width: 300px;";
          dom.textContent = info;
          return { dom };
        },
      };
    } catch {
      return null;
    }
  };
}

/**
 * Get hover tooltip text for a given AST node.
 * Exported for testing.
 */
export function getNodeInfo(node: SpelNodeImpl): string | null {
  switch (node.nodeType) {
    case NodeType.VARIABLE_REFERENCE:
      return `Variable: #${(node as VariableReference).getVariableName()}`;
    case NodeType.PROPERTY_OR_FIELD_REFERENCE:
      return `Property: .${(node as PropertyOrFieldReference).getName()}`;
    case NodeType.BEAN_REFERENCE:
      return `Spring Bean: @${(node as BeanReference).getBeanName()}`;
    case NodeType.TYPE_REFERENCE:
      return `Type: T(${(node as TypeReference).getTypeName()})`;
    default:
      return null;
  }
}
