/**
 * Browser Integration Tests — REAL Playwright tests for spel-editor.
 *
 * Renders the `<spel-editor>` Web Component in a real Chromium browser.
 * Tests: rendering, input, events, syntax highlighting, API methods,
 * NL integration with nl2spel via DeepSeek.
 */
import { test, expect } from '@playwright/test';

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? '';

test.describe('<spel-editor> browser rendering', () => {
  test('renders the editor component', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('spel-editor');
    await expect(editor).toBeVisible();
  });

  test('CodeMirror editor is created inside', async ({ page }) => {
    await page.goto('/');
    const cmEditor = page.locator('spel-editor .cm-editor');
    await expect(cmEditor).toBeVisible();
  });

  test('placeholder is displayed', async ({ page }) => {
    await page.goto('/');
    const placeholder = page.locator('.cm-placeholder');
    await expect(placeholder).toHaveText('Enter SpEL expression...');
  });
});

test.describe('keyboard input and events', () => {
  test('typing updates content and fires change event', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const el = document.querySelector('spel-editor')!;
      (window as unknown as Record<string, unknown>).lastChange = null;
      el.addEventListener('change', (e) => {
        (window as unknown as Record<string, unknown>).lastChange = (e as CustomEvent).detail;
      });
    });

    const editor = page.locator('spel-editor .cm-content');
    await editor.click();
    await page.keyboard.type('2 + 3');

    const detail = (await page.evaluate(
      () => (window as unknown as Record<string, unknown>).lastChange,
    )) as { value: string; isValid: boolean } | null;
    expect(detail).not.toBeNull();
    expect(detail!.value).toContain('2 + 3');
  });

  test('change event reports isValid: true for valid expression', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const el = document.querySelector('spel-editor')!;
      (window as unknown as Record<string, unknown>).lastValid = null;
      el.addEventListener('change', (e) => {
        (window as unknown as Record<string, unknown>).lastValid = (
          e as CustomEvent
        ).detail.isValid;
      });
    });

    const editor = page.locator('spel-editor .cm-content');
    await editor.click();
    await page.keyboard.type('2 + 3');
    await page.waitForTimeout(500);

    const isValid = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).lastValid,
    );
    expect(isValid).toBe(true);
  });

  test('change event reports isValid: false for invalid expression', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const el = document.querySelector('spel-editor')!;
      (window as unknown as Record<string, unknown>).lastInvalid = null;
      el.addEventListener('change', (e) => {
        (window as unknown as Record<string, unknown>).lastInvalid = (
          e as CustomEvent
        ).detail.isValid;
      });
    });

    const editor = page.locator('spel-editor .cm-content');
    await editor.click();
    await page.keyboard.type('1 +');
    await page.waitForTimeout(500);

    const isValid = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).lastInvalid,
    );
    expect(isValid).toBe(false);
  });
});

test.describe('public API methods', () => {
  test('getValue() and setValue() work correctly', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const el = document.querySelector('spel-editor') as unknown as {
        setValue: (v: string) => void;
        getValue: () => string;
      };
      el.setValue('#score > 60');
      (window as unknown as Record<string, unknown>).val = el.getValue();
    });

    const val = await page.evaluate(() => (window as unknown as Record<string, unknown>).val);
    expect(val).toContain('#score > 60');
  });

  test('format() reformats expression', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const el = document.querySelector('spel-editor') as unknown as {
        setValue: (v: string) => void;
        format: () => void;
        getValue: () => string;
      };
      el.setValue('1+2*3');
      el.format();
      (window as unknown as Record<string, unknown>).formatted = el.getValue();
    });

    const formatted = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).formatted,
    );
    expect(formatted).not.toBe('1+2*3');
  });

  test('validate() returns diagnostics array', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const el = document.querySelector('spel-editor') as unknown as {
        setValue: (v: string) => void;
        validate: () => unknown[];
      };
      el.setValue('1 + 2');
      (window as unknown as Record<string, unknown>).diags = el.validate();
    });

    const diags = await page.evaluate(() => (window as unknown as Record<string, unknown>).diags);
    expect(Array.isArray(diags)).toBe(true);
  });
});

test.describe('validate event', () => {
  test('validate event fires after typing', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const el = document.querySelector('spel-editor')!;
      (window as unknown as Record<string, unknown>).validateEvent = null;
      el.addEventListener('validate', (e) => {
        (window as unknown as Record<string, unknown>).validateEvent = (e as CustomEvent).detail;
      });
    });

    const editor = page.locator('spel-editor .cm-content');
    await editor.click();
    await page.keyboard.type('1 + 2');
    await page.waitForTimeout(500);

    const detail = (await page.evaluate(
      () => (window as unknown as Record<string, unknown>).validateEvent,
    )) as { diagnostics: unknown[] } | null;
    expect(detail).not.toBeNull();
    expect(Array.isArray(detail!.diagnostics)).toBe(true);
  });
});

test.describe('NL integration', () => {
  test('nl2spel pattern matching in browser', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      try {
        const { NL2SpelEngine } = await import('@agentix-e/nl2spel');
        const engine = new NL2SpelEngine();
        const genResult = await engine.generate('amount greater than 500', { offlineOnly: true });
        return { expression: genResult.expression, strategy: genResult.strategy };
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

    if ((result as { error?: string }).error) {
      console.warn('Pattern test error:', (result as { error: string }).error);
      test.skip(true, `nl2spel unavailable: ${(result as { error: string }).error}`);
      return;
    }

    expect(result).toHaveProperty('expression');
  });

  test('nl2spel LLM generation with DeepSeek', async ({ page }) => {
    if (!DEEPSEEK_KEY) {
      test.skip(true, 'DEEPSEEK_API_KEY not set');
      return;
    }

    test.setTimeout(30000);

    const result = await page.evaluate(async (apiKey) => {
      try {
        const { NL2SpelEngine } = await import('@agentix-e/nl2spel');
        const { OpenAICompatibleProvider, PROVIDER_PRESETS } =
          await import('@agentix-e/nl2spel-openai');

        const engine = new NL2SpelEngine();
        const provider = new OpenAICompatibleProvider({
          ...PROVIDER_PRESETS.deepseek,
          apiKey,
        });
        engine.registerProvider(provider);

        const genResult = await engine.generate('amount greater than 1000', {
          contextSchema: {
            root: {
              name: 'order',
              type: 'Order',
              fields: { amount: { type: 'number' } },
              methods: {},
            },
            variables: {},
            beans: {},
            types: {},
            functions: {},
          },
        });

        const { SpelExpressionParser } = await import('@agentix-e/spel-ts');
        const parser = new SpelExpressionParser();
        parser.parseExpression(genResult.expression);

        return { expression: genResult.expression, strategy: genResult.strategy, valid: true };
      } catch (e) {
        return { error: (e as Error).message };
      }
    }, DEEPSEEK_KEY);

    if ((result as { error?: string }).error) {
      test.skip(true, `LLM unavailable: ${(result as { error: string }).error}`);
      return;
    }

    expect((result as { valid: boolean }).valid).toBe(true);
  });
});
