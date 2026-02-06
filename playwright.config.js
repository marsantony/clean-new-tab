const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: /\/(e2e|performance)\/.+\.spec\.[jt]s$/,
  timeout: 30000,
  retries: 1,
  use: {
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.resolve(__dirname)}`,
            `--load-extension=${path.resolve(__dirname)}`,
          ],
        },
      },
    },
  ],
  reporter: [['html', { open: 'never' }]],
});
