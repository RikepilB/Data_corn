import { defineConfig } from 'vitest/config';

// Unit tests for the pure helpers in src/domain and src/i18n. They need no browser and no API.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
