const newtab = require('../../js/newtab');
const { fetchUnsplash, MediaDB, Settings } = newtab;

describe('Unsplash', () => {
  beforeEach(async () => {
    newtab.initDOM();
    await MediaDB.clear();
    newtab.settings = {
      source: 'unsplash',
      playMode: 'single',
      interval: 10,
      unsplashApiKey: '',
      unsplashCount: 3,
      uploadIds: [],
      unsplashIds: [],
    };
    newtab.mediaItems = [];
    newtab.currentIndex = 0;
    newtab.activeLayer = 'a';
  });

  describe('無 API Key', () => {
    test('應顯示錯誤訊息', async () => {
      newtab.settings.unsplashApiKey = '';
      await fetchUnsplash();

      const status = document.getElementById('unsplash-status');
      expect(status.textContent).toContain('API Key');
      expect(status.className).toBe('error');
    });

    test('不應發出 fetch 請求', async () => {
      newtab.settings.unsplashApiKey = '';
      await fetchUnsplash();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('API 呼叫', () => {
    test('應使用正確的 API URL 和 header', async () => {
      newtab.settings.unsplashApiKey = 'test-key';
      newtab.settings.unsplashCount = 5;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await fetchUnsplash();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.unsplash.com/photos/random'),
        expect.objectContaining({
          headers: { Authorization: 'Client-ID test-key' },
        })
      );
      expect(global.fetch.mock.calls[0][0]).toContain('count=5');
      expect(global.fetch.mock.calls[0][0]).toContain('orientation=landscape');
    });
  });

  describe('下載儲存', () => {
    const mockPhotos = [
      {
        id: 'abc123',
        urls: { regular: 'https://images.unsplash.com/photo-abc' },
        alt_description: 'A beautiful landscape',
        user: { name: 'John Doe', links: { html: 'https://unsplash.com/@johndoe' } },
        links: {
          html: 'https://unsplash.com/photos/abc123',
          download_location: 'https://api.unsplash.com/photos/abc123/download',
        },
      },
    ];

    test('應下載並儲存圖片到 IndexedDB', async () => {
      newtab.settings.unsplashApiKey = 'test-key';
      const mockBlob = new Blob(['img-data'], { type: 'image/jpeg' });

      global.fetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockPhotos })
        .mockResolvedValueOnce({ blob: async () => mockBlob })
        .mockResolvedValueOnce({ ok: true }); // download tracking

      await fetchUnsplash();

      const all = await MediaDB.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('unsplash_abc123');
      expect(all[0].source).toBe('unsplash');
      expect(all[0].photographer).toBe('John Doe');
      expect(all[0].photographerUrl).toBe('https://unsplash.com/@johndoe?utm_source=clean_new_tab&utm_medium=referral');
      expect(all[0].unsplashUrl).toContain('utm_source=clean_new_tab');
    });

    test('unsplashIds 應被更新', async () => {
      newtab.settings.unsplashApiKey = 'test-key';
      const mockBlob = new Blob(['img-data'], { type: 'image/jpeg' });

      global.fetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockPhotos })
        .mockResolvedValueOnce({ blob: async () => mockBlob })
        .mockResolvedValueOnce({ ok: true }); // download tracking

      await fetchUnsplash();

      expect(newtab.settings.unsplashIds).toContain('unsplash_abc123');
    });

    test('應觸發 download tracking endpoint', async () => {
      newtab.settings.unsplashApiKey = 'test-key';
      const mockBlob = new Blob(['img-data'], { type: 'image/jpeg' });

      global.fetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockPhotos })
        .mockResolvedValueOnce({ blob: async () => mockBlob })
        .mockResolvedValueOnce({ ok: true }); // download tracking

      await fetchUnsplash();

      // fetch 呼叫: 1) API, 2) 圖片下載, 3) download tracking
      const trackingCall = global.fetch.mock.calls[2];
      expect(trackingCall[0]).toContain('https://api.unsplash.com/photos/abc123/download');
      expect(trackingCall[0]).toContain('utm_source=clean_new_tab');
      expect(trackingCall[1].headers.Authorization).toBe('Client-ID test-key');
    });
  });

  describe('錯誤處理', () => {
    test('API 回應非 200 應顯示錯誤', async () => {
      newtab.settings.unsplashApiKey = 'test-key';

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await fetchUnsplash();

      const status = document.getElementById('unsplash-status');
      expect(status.textContent).toContain('401');
      expect(status.className).toBe('error');
    });

    test('網路錯誤應顯示錯誤訊息', async () => {
      newtab.settings.unsplashApiKey = 'test-key';

      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await fetchUnsplash();

      const status = document.getElementById('unsplash-status');
      expect(status.textContent).toContain('Network error');
      expect(status.className).toBe('error');
    });
  });

  describe('按鈕狀態', () => {
    test('fetch 期間按鈕應被 disabled', async () => {
      newtab.settings.unsplashApiKey = 'test-key';
      const btn = document.getElementById('unsplash-fetch');

      let resolvePromise;
      global.fetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const fetchPromise = fetchUnsplash();
      expect(btn.disabled).toBe(true);

      resolvePromise({ ok: true, json: async () => [] });
      await fetchPromise;

      expect(btn.disabled).toBe(false);
    });

    test('錯誤後按鈕應重新啟用', async () => {
      newtab.settings.unsplashApiKey = 'test-key';
      const btn = document.getElementById('unsplash-fetch');

      global.fetch.mockRejectedValueOnce(new Error('fail'));

      await fetchUnsplash();
      expect(btn.disabled).toBe(false);
    });
  });
});
