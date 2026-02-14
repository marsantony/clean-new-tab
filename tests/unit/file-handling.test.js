const newtab = require('../../js/newtab');
const { handleFiles, MediaDB } = newtab;

describe('File Handling', () => {
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
    newtab.mediaItems = [];
    newtab.currentIndex = 0;
    newtab.activeLayer = 'a';
  });

  const makeFile = (name, type) =>
    new File(['test-content'], name, { type });

  describe('MIME 白名單', () => {
    test('應接受 image/jpeg', async () => {
      await handleFiles([makeFile('a.jpg', 'image/jpeg')]);
      expect(newtab.settings.uploadIds).toHaveLength(1);
    });

    test('應接受 image/png', async () => {
      await handleFiles([makeFile('a.png', 'image/png')]);
      expect(newtab.settings.uploadIds).toHaveLength(1);
    });

    test('應接受 image/webp', async () => {
      await handleFiles([makeFile('a.webp', 'image/webp')]);
      expect(newtab.settings.uploadIds).toHaveLength(1);
    });

    test('應接受 image/gif', async () => {
      await handleFiles([makeFile('a.gif', 'image/gif')]);
      expect(newtab.settings.uploadIds).toHaveLength(1);
    });

    test('應接受 video/mp4', async () => {
      await handleFiles([makeFile('a.mp4', 'video/mp4')]);
      expect(newtab.settings.uploadIds).toHaveLength(1);
    });

    test('應接受 video/webm', async () => {
      await handleFiles([makeFile('a.webm', 'video/webm')]);
      expect(newtab.settings.uploadIds).toHaveLength(1);
    });

    test('應拒絕不支援的類型（text/plain）', async () => {
      await handleFiles([makeFile('a.txt', 'text/plain')]);
      expect(newtab.settings.uploadIds).toHaveLength(0);
    });

    test('應拒絕 application/javascript', async () => {
      await handleFiles([makeFile('a.js', 'application/javascript')]);
      expect(newtab.settings.uploadIds).toHaveLength(0);
    });

    test('應拒絕 text/html', async () => {
      await handleFiles([makeFile('a.html', 'text/html')]);
      expect(newtab.settings.uploadIds).toHaveLength(0);
    });
  });

  describe('ID 產生', () => {
    test('ID 應以 upload_ 為前綴', async () => {
      await handleFiles([makeFile('a.jpg', 'image/jpeg')]);
      expect(newtab.settings.uploadIds[0]).toMatch(/^upload_/);
    });

    test('多個檔案應產生不同 ID', async () => {
      await handleFiles([
        makeFile('a.jpg', 'image/jpeg'),
        makeFile('b.jpg', 'image/jpeg'),
      ]);
      const ids = newtab.settings.uploadIds;
      expect(ids).toHaveLength(2);
      expect(ids[0]).not.toBe(ids[1]);
    });
  });

  describe('uploadIds 更新', () => {
    test('上傳後 uploadIds 應包含新 ID', async () => {
      await handleFiles([makeFile('a.jpg', 'image/jpeg')]);
      expect(newtab.settings.uploadIds).toHaveLength(1);

      await handleFiles([makeFile('b.png', 'image/png')]);
      expect(newtab.settings.uploadIds).toHaveLength(2);
    });
  });

  describe('IndexedDB 儲存', () => {
    test('上傳的檔案應存入 IndexedDB', async () => {
      await handleFiles([makeFile('test.jpg', 'image/jpeg')]);
      const all = await MediaDB.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].source).toBe('upload');
      expect(all[0].name).toBe('test.jpg');
      expect(all[0].mimeType).toBe('image/jpeg');
    });

    test('video 類型應正確標記', async () => {
      await handleFiles([makeFile('test.mp4', 'video/mp4')]);
      const all = await MediaDB.getAll();
      expect(all[0].type).toBe('video');
    });

    test('image 類型應正確標記', async () => {
      await handleFiles([makeFile('test.png', 'image/png')]);
      const all = await MediaDB.getAll();
      expect(all[0].type).toBe('image');
    });
  });
});
