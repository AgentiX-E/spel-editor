/**
 * Real integration tests for nl2spel via spel-editor.
 *
 * Makes actual HTTP calls to the DeepSeek API through @agentix-e/nl2spel-openai.
 * Requires DEEPSEEK_API_KEY in environment (or .env file).
 *
 * Tests are skipped (not failed) when API key is unavailable.
 *
 * Pattern mirrors @agentix-e/nl2spel's openai-provider-integration.test.ts.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { SpelExpressionParser } from '@agentix-e/spel-ts';

const API_KEY = process.env.DEEPSEEK_API_KEY ?? '';
const hasAPIKey = !!API_KEY;

function isValidSpEL(expression: string): boolean {
  try {
    const parser = new SpelExpressionParser();
    parser.parseExpression(expression);
    return true;
  } catch {
    return false;
  }
}

describe('nl2spel integration (real DeepSeek)', () => {
  let NL2SpelEngine: typeof import('@agentix-e/nl2spel').NL2SpelEngine;
  let OpenAICompatibleProvider: typeof import('@agentix-e/nl2spel-openai').OpenAICompatibleProvider;

  beforeAll(async () => {
    if (!hasAPIKey) {
      console.warn('[integration] DEEPSEEK_API_KEY not set — skipping real integration tests');
      return;
    }
    const nl2spelModule = await import('@agentix-e/nl2spel');
    const openaiModule = await import('@agentix-e/nl2spel-openai');
    NL2SpelEngine = nl2spelModule.NL2SpelEngine;
    OpenAICompatibleProvider = openaiModule.OpenAICompatibleProvider;
  });

  function createProvider(): InstanceType<typeof OpenAICompatibleProvider> {
    return new OpenAICompatibleProvider({ provider: 'deepseek', apiKey: API_KEY });
  }

  it.runIf(hasAPIKey)(
    'generates SpEL for comparison: amount > 500',
    async () => {
      const engine = new NL2SpelEngine();
      engine.registerProvider(createProvider());
      const result = await engine.generate('amount greater than 500');
      expect(result.expression).toBeTruthy();
      expect(isValidSpEL(result.expression)).toBe(true);
    },
    15000,
  );

  it.runIf(hasAPIKey)(
    'generates SpEL for null check: remark is not null',
    async () => {
      const engine = new NL2SpelEngine();
      engine.registerProvider(createProvider());
      const result = await engine.generate('remark is not null');
      expect(result.expression).toBeTruthy();
      expect(isValidSpEL(result.expression)).toBe(true);
    },
    15000,
  );

  it.runIf(hasAPIKey)(
    'generates SpEL with context schema',
    async () => {
      const engine = new NL2SpelEngine();
      engine.registerProvider(createProvider());
      const result = await engine.generate('order amount greater than 1000', {
        contextSchema: {
          root: {
            name: 'order',
            type: 'Order',
            fields: { amount: { type: 'number', description: 'Order amount' } },
            methods: {},
          },
          variables: {},
          beans: {},
          types: {},
          functions: {},
        },
      });
      expect(result.expression).toBeTruthy();
      expect(isValidSpEL(result.expression)).toBe(true);
    },
    15000,
  );

  it.runIf(hasAPIKey)(
    'generates valid SpEL for permission check',
    async () => {
      const engine = new NL2SpelEngine();
      engine.registerProvider(createProvider());
      const result = await engine.generate('user has admin role');
      expect(result.expression).toBeTruthy();
      expect(isValidSpEL(result.expression)).toBe(true);
    },
    15000,
  );

  it('offline-only mode generates SpEL without LLM', async () => {
    const { NL2SpelEngine: Engine } = await import('@agentix-e/nl2spel');
    const engine = new Engine();
    const result = await engine.generate('amount greater than 500', { offlineOnly: true });
    expect(result.expression).toBeTruthy();
    expect(['pattern', 'template']).toContain(result.strategy);
    expect(result.expression).toContain('500');
  }, 5000);
});
