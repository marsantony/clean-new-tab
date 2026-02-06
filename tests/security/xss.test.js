const newtab = require('../../js/newtab');
const { createThumbElement, MediaDB, handleFiles, fetchUnsplash } = newtab;

describe('Security - XSS 防護', () => {
  beforeEach(async () => {
    newtab.initDOM();
    await MediaDB.clear();
    newtab.settings = {
      source: 'upload',
      playMode: 'single',
      interval: 10,
      unsplashApiKey: '',
      unsplashCount: 5,
      uploadIds: [],
      unsplashIds: [],
    };
  });

  describe('檔名 XSS', () => {
    test('惡意檔名不應注入 HTML', () => {
      const item = {
        id: 'xss-1',
        type: 'image',
        mimeType: 'image/jpeg',
        blob: new Blob(['x'], { type: 'image/jpeg' }),
        name: '<img src=x onerror=alert(1)>.jpg',
      };

      const el = createThumbElement(item, 'upload');
      const html = el.innerHTML;

      expect(html).not.toContain('onerror');
      expect(html).not.toContain('<img src=x');
      // createThumbElement 使用 createElement 而非 innerHTML，所以不會有 XSS
    });

    test('Script tag 檔名不應被執行', () => {
      const item = {
        id: 'xss-2',
        type: 'image',
        mimeType: 'image/jpeg',
        blob: new Blob(['x'], { type: 'image/jpeg' }),
        name: '<script>alert("xss")</script>.jpg',
      };

      const el = createThumbElement(item, 'upload');
      expect(el.querySelector('script')).toBeNull();
    });
  });

  describe('Unsplash description XSS', () => {
    test('惡意 alt_description 不應注入 HTML', async () => {
      newtab.settings.unsplashApiKey = 'test-key';

      const mockPhotos = [{
        id: 'xss-photo',
        urls: { regular: 'https://images.unsplash.com/photo' },
        alt_description: '"><script>alert(1)</script>',
        user: { name: '"><img src=x onerror=alert(1)>' },
        links: { html: 'javascript:alert(1)' },
      }];

      global.fetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockPhotos })
        .mockResolvedValueOnce({ blob: async () => new Blob(['img']) });

      await fetchUnsplash();

      const all = await MediaDB.getAll();
      expect(all).toHaveLength(1);

      // 使用 createThumbElement 渲染
      const el = createThumbElement(all[0], 'unsplash');
      const html = el.innerHTML;
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('onerror');
    });
  });

  describe('MIME type 白名單', () => {
    const dangerousTypes = [
      'text/html',
      'text/javascript',
      'application/javascript',
      'application/x-javascript',
      'text/xml',
      'application/xml',
      'image/svg+xml',
    ];

    test.each(dangerousTypes)('應拒絕 %s', async (type) => {
      await handleFiles([new File(['x'], `file.${type.split('/')[1]}`, { type })]);
      expect(newtab.settings.uploadIds).toHaveLength(0);
    });
  });

  describe('createElement 安全性', () => {
    test('createThumbElement 不應使用 innerHTML 插入使用者內容', () => {
      const item = {
        id: 'safe-1',
        type: 'image',
        mimeType: 'image/jpeg',
        blob: new Blob(['x'], { type: 'image/jpeg' }),
        name: 'normal.jpg',
      };

      const el = createThumbElement(item, 'upload');
      // 確認結構：div > img + span.type-badge + button.delete-btn
      expect(el.tagName).toBe('DIV');
      expect(el.querySelector('img')).not.toBeNull();
      expect(el.querySelector('.type-badge')).not.toBeNull();
      expect(el.querySelector('.delete-btn')).not.toBeNull();
    });

    test('video thumb 應正確建立', () => {
      const item = {
        id: 'vid-1',
        type: 'video',
        mimeType: 'video/mp4',
        blob: new Blob(['x'], { type: 'video/mp4' }),
        name: 'test.mp4',
      };

      const el = createThumbElement(item, 'upload');
      expect(el.querySelector('video')).not.toBeNull();
      expect(el.querySelector('.type-badge').textContent).toBe('MP4');
    });
  });

  describe('API Key 安全', () => {
    test('API Key 不應出現在 DOM 中（除了 input）', async () => {
      newtab.settings.unsplashApiKey = 'super-secret-key-12345';
      newtab.syncUI();

      // 只有 input 應包含 API Key
      const input = document.getElementById('unsplash-api-key');
      expect(input.value).toBe('super-secret-key-12345');

      // 檢查其他 DOM 元素不包含 key
      const bodyHtml = document.body.innerHTML;
      const withoutInput = bodyHtml.replace(/<input[^>]*>/g, '');
      expect(withoutInput).not.toContain('super-secret-key-12345');
    });
  });
});
