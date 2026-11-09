import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: ['**/*.spec.mjs'],
  fullyParallel: true,
  workers: process.env.CI ? '100%' : '25%',
  // The tests that need the npm registry can lose to a slow network once; a second try is cheap in
  // CI and a flake there blocks every pull request.
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  // Scaffolding is quick; the tests that install packages or start a dev server set their own
  // budget with test.setTimeout().
  timeout: 60_000,
  use: {
    trace: 'retain-on-failure',
  },
});
