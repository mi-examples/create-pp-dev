import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: ['**/*.spec.mjs'],
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
});
