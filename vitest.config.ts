import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/**/*.tsx', 'jsdom'],
      ['src/lib/settings.test.ts', 'jsdom'],
    ],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
