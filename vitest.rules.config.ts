import { defineConfig } from 'vitest/config';

// Run through `npm run test:rules`, which starts the Firestore emulator.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
