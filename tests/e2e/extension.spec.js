const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const extensionPath = path.resolve(__dirname, '../../');

test.describe('Extension 載入', () => {
  let context;
  let page;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-first-run',
      ],
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    page = await context.newPage();
    await page.goto('chrome://newtab');
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('新分頁應包含背景容器', async () => {
    const bgContainer = page.locator('#bg-container');
    await expect(bgContainer).toBeVisible();
  });

  test('設定按鈕應存在', async () => {
    const btn = page.locator('#settings-btn');
    await expect(btn).toBeAttached();
  });

  test('設定面板預設應隱藏', async () => {
    const overlay = page.locator('#settings-overlay');
    await expect(overlay).toHaveClass(/hidden/);
  });

  test('點擊設定按鈕應開啟面板', async () => {
    await page.locator('#settings-btn').click();
    const overlay = page.locator('#settings-overlay');
    await expect(overlay).not.toHaveClass(/hidden/);
  });

  test('點擊關閉按鈕應關閉面板', async () => {
    await page.locator('#settings-btn').click();
    await page.locator('#settings-close').click();
    const overlay = page.locator('#settings-overlay');
    await expect(overlay).toHaveClass(/hidden/);
  });

  test('按 Escape 應關閉面板', async () => {
    await page.locator('#settings-btn').click();
    await page.keyboard.press('Escape');
    const overlay = page.locator('#settings-overlay');
    await expect(overlay).toHaveClass(/hidden/);
  });
});
