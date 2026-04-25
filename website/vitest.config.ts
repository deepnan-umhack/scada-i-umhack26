import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  test: {
    // Use jsdom to simulate a browser environment for React components
    environment: 'jsdom',
    globals: true,  
    // Run setup file before each test (e.g. import @testing-library/jest-dom matchers)
    setupFiles: ['./src/test/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8', // or 'istanbul' — v8 is faster, istanbul is more accurate for branches

      // Output formats
      reporter: [
        'text',        // printed to terminal
        'json',        // coverage/coverage-final.json  (used by the GH Actions PR comment)
        'json-summary', // coverage/coverage-summary.json (used by the GH Actions PR comment)
        'html',        // coverage/index.html — open locally to browse line-by-line
        'lcov',        // coverage/lcov.info — compatible with SonarQube, Codecov, etc.
      ],

      // ✅ 85% minimums — job FAILS if any metric drops below this
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },

      // What to include/exclude from coverage measurement
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.{ts,tsx}',   // Storybook stories
        'src/**/*.test.{ts,tsx}',      // Test files themselves
        'src/**/__mocks__/**',
        'src/test/**',                 // Test utilities/setup
        'src/main.tsx',                // App entry point (hard to test meaningfully)
        'src/vite-env.d.ts',
      ],

      // Where to write the output files
      reportsDirectory: './coverage',

      // Fail the run if thresholds are not met (redundant with thresholds but explicit)
    },

    // Optional: glob for test files
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});