import { hoverTooltip } from '@codemirror/view';
import {
  AstWalker,
  NodeType,
  SpelExpressionParser,
  VariableReference,
  PropertyOrFieldReference,
  BeanReference,
  TypeReference,
} from '@agentix-e/spel-ts';
import type { SpelNodeImpl } from '@agentix-e/spel-ts';

/**
 * Adapter: spel-ts AstWalker → CM6 hoverTooltip.
 *
 * Uses `instanceof` checks against concrete spel-ts node classes
 * (exported in v1.1.0) instead of brittle `as unknown as` casts.
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
      if (!(node instanceof VariableReference)) return null;
      return `Variable: #${node.getVariableName()}`;
    }
    case NodeType.PROPERTY_OR_FIELD_REFERENCE: {
      if (!(node instanceof PropertyOrFieldReference)) return null;
      return `Property: .${node.getName()}`;
    }
    case NodeType.BEAN_REFERENCE: {
      if (!(node instanceof BeanReference)) return null;
      return `Spring Bean: @${node.getBeanName()}`;
    }
    case NodeType.TYPE_REFERENCE: {
      if (!(node instanceof TypeReference)) return null;
      return `Type: T(${node.getTypeName()})`;
    }
    default:
      return null;
  }
}
