import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit and route-integration tests. Firestore rules tests live in
// vitest.rules.config.ts because they need the Firebase emulator.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    restoreMocks: true,
    unstubEnvs: true,
  },
});
