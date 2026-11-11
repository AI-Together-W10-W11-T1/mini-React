import { defineConfig } from 'vitest/config';
import { alias } from './alias.ts';

export default defineConfig({
  resolve: { alias },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['packages/**/__tests__/**/*.test.ts', 'fixtures/**/__tests__/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    passWithNoTests: true,
  },
});
