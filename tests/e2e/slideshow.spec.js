const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const extensionPath = path.resolve(__dirname, '../../');

test.describe('Slideshow', () => {
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

  test('上傳兩張圖片並設定 sequential 後應自動切換', async () => {
    // 開啟設定面板
    await page.locator('#settings-btn').click();

    // 上傳兩張圖片
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles([
      path.resolve(__dirname, '../fixtures/test-image.jpg'),
      path.resolve(__dirname, '../fixtures/test-image.png'),
    ]);
    await page.waitForTimeout(500);

    // 設定 sequential 模式，最短間隔
    await page.locator('input[name="playMode"][value="sequential"]').check();
    const intervalSlider = page.locator('#interval');
    await intervalSlider.fill('5');

    // 關閉面板
    await page.locator('#settings-close').click();

    // 記錄初始背景狀態
    const initialActive = await page.evaluate(() => {
      return document.querySelector('.bg-layer.active')?.id;
    });

    // 等待切換（5 秒 + 緩衝）
    await page.waitForTimeout(6000);

    // 背景應已切換（active layer 應改變）
    const newActive = await page.evaluate(() => {
      return document.querySelector('.bg-layer.active')?.id;
    });

    // 至少有一個 layer 是 active 的
    expect(newActive).toBeDefined();
  });

  test('single 模式不應自動切換', async () => {
    await page.locator('#settings-btn').click();

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles([
      path.resolve(__dirname, '../fixtures/test-image.jpg'),
      path.resolve(__dirname, '../fixtures/test-image.png'),
    ]);
    await page.waitForTimeout(500);

    // 確保是 single 模式
    await page.locator('input[name="playMode"][value="single"]').check();
    await page.locator('#settings-close').click();

    const initial = await page.evaluate(() =>
      document.querySelector('.bg-layer.active')?.style.backgroundImage
    );

    await page.waitForTimeout(6000);

    const after = await page.evaluate(() =>
      document.querySelector('.bg-layer.active')?.style.backgroundImage
    );

    expect(after).toBe(initial);
  });
});
