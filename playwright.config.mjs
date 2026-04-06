import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: ['**/*.spec.mjs'],
  fullyParallel: true,
  workers: process.env.CI ? '100%' : '25%',
  reporter: 'list',
  timeout: 60_000,
});
