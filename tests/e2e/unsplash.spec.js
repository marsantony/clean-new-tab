const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const extensionPath = path.resolve(__dirname, '../../');

test.describe('Unsplash Integration', () => {
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
    await page.locator('#settings-btn').click();
    await page.locator('.tab[data-tab="unsplash"]').click();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('無 API Key 時取得按鈕應顯示錯誤', async () => {
    // 清空 API Key
    await page.locator('#unsplash-api-key').fill('');
    await page.locator('#unsplash-fetch').click();

    const status = page.locator('#unsplash-status');
    await expect(status).toContainText('API Key');
    await expect(status).toHaveClass('error');
  });

  test('Mock API 回應後應顯示桌布', async () => {
    // 用 page.route 模擬 Unsplash API
    const mockPhotos = [{
      id: 'mock-photo-1',
      urls: { regular: 'https://example.com/photo.jpg' },
      alt_description: 'Mock photo',
      user: { name: 'Test User' },
      links: { html: 'https://unsplash.com/photos/mock' },
    }];

    // 模擬 1x1 pixel JPEG
    const jpegBytes = new Uint8Array([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
      0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
      0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7B, 0x94,
      0x11, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9,
    ]);

    await page.route('**/api.unsplash.com/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPhotos),
      });
    });

    await page.route('https://example.com/photo.jpg', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'image/jpeg',
        body: Buffer.from(jpegBytes),
      });
    });

    // 輸入 API Key
    await page.locator('#unsplash-api-key').fill('test-api-key');
    await page.locator('#unsplash-api-key').dispatchEvent('change');

    // 點擊取得
    await page.locator('#unsplash-fetch').click();

    // 等待下載完成
    await page.waitForFunction(() => {
      const status = document.getElementById('unsplash-status');
      return status && status.textContent.includes('成功');
    }, { timeout: 10000 });

    // 確認桌布列表有一張
    const thumbs = page.locator('#unsplash-list .file-thumb');
    await expect(thumbs).toHaveCount(1);
  });

  test('API 錯誤應顯示錯誤訊息', async () => {
    await page.route('**/api.unsplash.com/**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ errors: ['Invalid Access Token'] }),
      });
    });

    await page.locator('#unsplash-api-key').fill('bad-key');
    await page.locator('#unsplash-api-key').dispatchEvent('change');
    await page.locator('#unsplash-fetch').click();

    const status = page.locator('#unsplash-status');
    await expect(status).toContainText('401');
  });
});
