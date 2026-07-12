import { hoverTooltip } from '@codemirror/view';
import { AstWalker, NodeType, SpelExpressionParser } from '@agentix-e/spel-ts';
import type { SpelNodeImpl } from '@agentix-e/spel-ts';

/**
 * Adapter: spel-ts AstWalker → CM6 hoverTooltip.
 */
export function spelHover() {
  return hoverTooltip((view, pos) => {
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
          const dom = document.createElement('div');
          dom.style.cssText = 'padding: 4px 8px; font-size: 13px; max-width: 300px;';
          dom.textContent = info;
          return { dom };
        },
      };
    } catch {
      return null;
    }
  });
}

function getNodeInfo(node: SpelNodeImpl): string | null {
  switch (node.nodeType) {
    case NodeType.VARIABLE_REFERENCE: {
      const name = (node as unknown as { getVariableName?: () => string }).getVariableName?.();
      return name ? `Variable: #${name}` : null;
    }
    case NodeType.PROPERTY_OR_FIELD_REFERENCE: {
      const name = (node as unknown as { getName?: () => string }).getName?.();
      return name ? `Property: .${name}` : null;
    }
    case NodeType.BEAN_REFERENCE: {
      const name = (node as unknown as { getBeanName?: () => string }).getBeanName?.();
      return name ? `Spring Bean: @${name}` : null;
    }
    case NodeType.TYPE_REFERENCE: {
      const name = (node as unknown as { getTypeName?: () => string }).getTypeName?.();
      return name ? `Type: T(${name})` : null;
    }
    default:
      return null;
  }
}
