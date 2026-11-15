import { defineConfig } from 'vitest/config';

// Unit tests for the pure helpers in src and the chat server in server/. They need no browser and no API.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
    environment: 'node',
  },
});
