import { defineConfig } from 'vitest/config';

// Testes das regras clínicas (rodam em Node, sem navegador): npm test
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
