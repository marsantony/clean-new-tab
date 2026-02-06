const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const extensionPath = path.resolve(__dirname, '../../');

test.describe('Settings Panel', () => {
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
    // 開啟設定面板
    await page.locator('#settings-btn').click();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('應有上傳和 Unsplash 兩個 tab', async () => {
    const tabs = page.locator('.tab');
    await expect(tabs).toHaveCount(2);
    await expect(tabs.first()).toContainText('上傳檔案');
    await expect(tabs.last()).toContainText('Unsplash');
  });

  test('切換 tab 應切換顯示內容', async () => {
    // 點 Unsplash tab
    await page.locator('.tab[data-tab="unsplash"]').click();
    await expect(page.locator('#tab-unsplash')).toHaveClass(/active/);
    await expect(page.locator('#tab-upload')).not.toHaveClass(/active/);

    // 點回上傳 tab
    await page.locator('.tab[data-tab="upload"]').click();
    await expect(page.locator('#tab-upload')).toHaveClass(/active/);
    await expect(page.locator('#tab-unsplash')).not.toHaveClass(/active/);
  });

  test('播放模式 radio 應可切換', async () => {
    const sequential = page.locator('input[name="playMode"][value="sequential"]');
    await sequential.check();
    await expect(sequential).toBeChecked();

    // interval group 應顯示
    await expect(page.locator('#interval-group')).toBeVisible();
  });

  test('single 模式下 interval 應隱藏', async () => {
    const single = page.locator('input[name="playMode"][value="single"]');
    await single.check();
    await expect(page.locator('#interval-group')).toBeHidden();
  });

  test('上傳檔案後應顯示縮圖', async () => {
    const fileInput = page.locator('#file-input');
    const testImage = path.resolve(__dirname, '../fixtures/test-image.jpg');

    await fileInput.setInputFiles(testImage);
    await page.waitForTimeout(500);

    const thumbs = page.locator('.file-thumb');
    await expect(thumbs).toHaveCount(1);
    await expect(page.locator('#file-list-empty')).toBeHidden();
  });
});
