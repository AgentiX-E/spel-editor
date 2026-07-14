import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 4173,
  },
  optimizeDeps: {
    include: ['@agentix-e/spel-ts', '@agentix-e/nl2spel', '@agentix-e/nl2spel-openai', 'lit', '@codemirror/view', '@codemirror/state', '@codemirror/language', '@codemirror/autocomplete', '@codemirror/lint', '@codemirror/commands'],
  },
});
