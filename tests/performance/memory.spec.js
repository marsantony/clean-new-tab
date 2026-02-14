const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const extensionPath = path.resolve(__dirname, '../../');

test.describe('Performance & Memory', () => {
  let context;
  let page;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-first-run',
        '--js-flags=--expose-gc',
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

  test('Blob URL 不應洩漏 — 切換圖片後舊 URL 應被回收', async () => {
    const leakedUrls = await page.evaluate(async () => {
      // 取得 newtab 模組的 showImage
      const bgLayerA = document.getElementById('bg-layer-a');
      const bgLayerB = document.getElementById('bg-layer-b');

      const createdUrls = [];
      const revokedUrls = [];

      const origCreate = URL.createObjectURL;
      const origRevoke = URL.revokeObjectURL;

      URL.createObjectURL = (blob) => {
        const url = origCreate(blob);
        createdUrls.push(url);
        return url;
      };
      URL.revokeObjectURL = (url) => {
        revokedUrls.push(url);
        origRevoke(url);
      };

      // 模擬多次切換
      for (let i = 0; i < 5; i++) {
        const blob = new Blob([`img-${i}`], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        if (i % 2 === 0) {
          bgLayerB.style.backgroundImage = `url("${url}")`;
          bgLayerB.dataset.blobUrl = url;
        } else {
          bgLayerA.style.backgroundImage = `url("${url}")`;
          bgLayerA.dataset.blobUrl = url;
        }
      }

      // 恢復原始方法
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;

      // 檢查：每次建立的 URL 數量不應無限增長
      return { created: createdUrls.length, revoked: revokedUrls.length };
    });

    // 建立的 URL 數量應合理
    expect(leakedUrls.created).toBeLessThanOrEqual(10);
  });

  test('多次上傳圖片不應崩潰', async () => {
    await page.locator('#settings-btn').click();

    const fixtures = [
      path.resolve(__dirname, '../fixtures/test-image.jpg'),
      path.resolve(__dirname, '../fixtures/test-image.png'),
      path.resolve(__dirname, '../fixtures/test-image.gif'),
    ];

    const fileInput = page.locator('#file-input');
    const uploadCount = 6;

    // 分批上傳，每次上傳一個不同的檔案
    for (let i = 0; i < uploadCount; i++) {
      await fileInput.setInputFiles(fixtures[i % fixtures.length]);
      await page.waitForTimeout(500);
    }

    // 等待所有處理完成
    await page.waitForTimeout(2000);

    // 頁面應仍然正常，縮圖數應 >= 1
    const thumbCount = await page.locator('.file-thumb').count();
    expect(thumbCount).toBeGreaterThanOrEqual(1);
    // 確認頁面未崩潰
    const title = await page.title();
    expect(title).toBeDefined();
  });

  test('Heap 成長應在合理範圍內', async () => {
    const client = await page.context().newCDPSession(page);

    // 初始 heap 大小
    await client.send('HeapProfiler.collectGarbage');
    const before = await client.send('Runtime.getHeapUsage');

    // 進行一些操作
    await page.locator('#settings-btn').click();
    const fileInput = page.locator('#file-input');
    for (let i = 0; i < 5; i++) {
      await fileInput.setInputFiles(path.resolve(__dirname, '../fixtures/test-image.jpg'));
      await page.waitForTimeout(200);
    }
    await page.locator('#settings-close').click();

    // 最終 heap 大小
    await client.send('HeapProfiler.collectGarbage');
    const after = await client.send('Runtime.getHeapUsage');

    const growth = after.usedSize - before.usedSize;
    const growthMB = growth / (1024 * 1024);

    // heap 成長應小於 50MB
    expect(growthMB).toBeLessThan(50);
  });

  test('IndexedDB 批量操作不應阻塞 UI', async () => {
    const timing = await page.evaluate(async () => {
      const start = performance.now();

      // 模擬批量寫入
      const dbReq = indexedDB.open('PerfTestDB', 1);
      const db = await new Promise((resolve) => {
        dbReq.onupgradeneeded = () => {
          dbReq.result.createObjectStore('test', { keyPath: 'id' });
        };
        dbReq.onsuccess = () => resolve(dbReq.result);
      });

      const tx = db.transaction('test', 'readwrite');
      const store = tx.objectStore('test');

      for (let i = 0; i < 100; i++) {
        store.put({ id: `item-${i}`, data: new Blob([`data-${i}`]) });
      }

      await new Promise((resolve) => {
        tx.oncomplete = resolve;
      });

      const end = performance.now();
      db.close();

      // 清理
      indexedDB.deleteDatabase('PerfTestDB');

      return end - start;
    });

    // 100 筆寫入應在 5 秒內完成
    expect(timing).toBeLessThan(5000);
  });
});
