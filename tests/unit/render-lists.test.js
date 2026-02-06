const newtab = require('../../js/newtab');
const {
  renderFileList, renderUnsplashList, createThumbElement,
  handleFileUpload, MediaDB, Settings,
} = newtab;

describe('Render Lists & Thumb Element', () => {
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

  const putUpload = async (id, name = 'test.jpg', mimeType = 'image/jpeg') => {
    await MediaDB.put({
      id,
      source: 'upload',
      type: mimeType.startsWith('video/') ? 'video' : 'image',
      mimeType,
      blob: new Blob(['data'], { type: mimeType }),
      name,
      addedAt: Date.now(),
    });
  };

  const putUnsplash = async (id) => {
    await MediaDB.put({
      id,
      source: 'unsplash',
      type: 'image',
      mimeType: 'image/jpeg',
      blob: new Blob(['data'], { type: 'image/jpeg' }),
      photographer: 'Test User',
      addedAt: Date.now(),
    });
  };

  describe('renderFileList', () => {
    test('無上傳檔案時應顯示 empty hint', async () => {
      await renderFileList();

      const fileList = document.getElementById('file-list');
      const empty = document.getElementById('file-list-empty');
      expect(fileList.children).toHaveLength(0);
      expect(empty.style.display).toBe('block');
    });

    test('有上傳檔案時應隱藏 empty hint 並渲染縮圖', async () => {
      await putUpload('upload_1', 'a.jpg');
      newtab.settings.uploadIds = ['upload_1'];

      await renderFileList();

      const fileList = document.getElementById('file-list');
      const empty = document.getElementById('file-list-empty');
      expect(fileList.children.length).toBe(1);
      expect(empty.style.display).toBe('none');
    });

    test('應按照 uploadIds 順序排列', async () => {
      await putUpload('upload_2', 'b.jpg');
      await putUpload('upload_1', 'a.jpg');
      newtab.settings.uploadIds = ['upload_1', 'upload_2'];

      await renderFileList();

      const fileList = document.getElementById('file-list');
      expect(fileList.children).toHaveLength(2);
    });

    test('不在 uploadIds 的孤立項目也應被渲染', async () => {
      await putUpload('upload_1', 'a.jpg');
      await putUpload('upload_orphan', 'orphan.jpg');
      newtab.settings.uploadIds = ['upload_1'];

      await renderFileList();

      const fileList = document.getElementById('file-list');
      expect(fileList.children).toHaveLength(2);
    });
  });

  describe('renderUnsplashList', () => {
    test('無 unsplash 圖片時應顯示 empty hint', async () => {
      await renderUnsplashList();

      const list = document.getElementById('unsplash-list');
      const empty = document.getElementById('unsplash-list-empty');
      expect(list.children).toHaveLength(0);
      expect(empty.style.display).toBe('block');
    });

    test('有 unsplash 圖片時應渲染縮圖', async () => {
      await putUnsplash('unsplash_1');
      await putUnsplash('unsplash_2');

      await renderUnsplashList();

      const list = document.getElementById('unsplash-list');
      const empty = document.getElementById('unsplash-list-empty');
      expect(list.children).toHaveLength(2);
      expect(empty.style.display).toBe('none');
    });
  });

  describe('createThumbElement', () => {
    test('image 項目應建立 img 元素', () => {
      const item = {
        id: 'img-1', type: 'image', mimeType: 'image/jpeg',
        blob: new Blob(['x'], { type: 'image/jpeg' }),
      };
      const el = createThumbElement(item, 'upload');

      expect(el.className).toBe('file-thumb');
      expect(el.querySelector('img')).not.toBeNull();
      expect(el.querySelector('video')).toBeNull();
    });

    test('video 項目應建立 video 元素', () => {
      const item = {
        id: 'vid-1', type: 'video', mimeType: 'video/mp4',
        blob: new Blob(['x'], { type: 'video/mp4' }),
      };
      const el = createThumbElement(item, 'upload');

      expect(el.querySelector('video')).not.toBeNull();
      expect(el.querySelector('img')).toBeNull();
    });

    test('mp4 badge 應顯示 MP4', () => {
      const item = {
        id: 'vid-1', type: 'video', mimeType: 'video/mp4',
        blob: new Blob(['x'], { type: 'video/mp4' }),
      };
      const el = createThumbElement(item, 'upload');
      expect(el.querySelector('.type-badge').textContent).toBe('MP4');
    });

    test('webm badge 應顯示 WEBM', () => {
      const item = {
        id: 'vid-2', type: 'video', mimeType: 'video/webm',
        blob: new Blob(['x'], { type: 'video/webm' }),
      };
      const el = createThumbElement(item, 'upload');
      expect(el.querySelector('.type-badge').textContent).toBe('WEBM');
    });

    test('gif badge 應顯示 GIF', () => {
      const item = {
        id: 'img-2', type: 'image', mimeType: 'image/gif',
        blob: new Blob(['x'], { type: 'image/gif' }),
      };
      const el = createThumbElement(item, 'upload');
      expect(el.querySelector('.type-badge').textContent).toBe('GIF');
    });

    test('jpeg badge 應顯示 IMG', () => {
      const item = {
        id: 'img-3', type: 'image', mimeType: 'image/jpeg',
        blob: new Blob(['x'], { type: 'image/jpeg' }),
      };
      const el = createThumbElement(item, 'upload');
      expect(el.querySelector('.type-badge').textContent).toBe('IMG');
    });

    test('應包含刪除按鈕', () => {
      const item = {
        id: 'img-1', type: 'image', mimeType: 'image/jpeg',
        blob: new Blob(['x'], { type: 'image/jpeg' }),
      };
      const el = createThumbElement(item, 'upload');
      const btn = el.querySelector('.delete-btn');
      expect(btn).not.toBeNull();
      expect(btn.textContent).toBe('×');
    });

    test('upload 項目的刪除按鈕應從 uploadIds 移除', async () => {
      const item = {
        id: 'upload_del_1', type: 'image', mimeType: 'image/jpeg',
        blob: new Blob(['x'], { type: 'image/jpeg' }),
      };
      await MediaDB.put(item);
      newtab.settings.uploadIds = ['upload_del_1'];

      const el = createThumbElement(item, 'upload');
      const btn = el.querySelector('.delete-btn');

      const clickEvent = new MouseEvent('click', { bubbles: true });
      jest.spyOn(clickEvent, 'stopPropagation');
      await btn.dispatchEvent(clickEvent);

      // 等待非同步操作完成
      await new Promise(r => setTimeout(r, 50));

      expect(newtab.settings.uploadIds).not.toContain('upload_del_1');
    });

    test('unsplash 項目的刪除按鈕應從 unsplashIds 移除', async () => {
      const item = {
        id: 'unsplash_del_1', type: 'image', mimeType: 'image/jpeg',
        blob: new Blob(['x'], { type: 'image/jpeg' }),
      };
      await MediaDB.put(item);
      newtab.settings.unsplashIds = ['unsplash_del_1'];

      const el = createThumbElement(item, 'unsplash');
      const btn = el.querySelector('.delete-btn');
      await btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      await new Promise(r => setTimeout(r, 50));

      expect(newtab.settings.unsplashIds).not.toContain('unsplash_del_1');
    });
  });

  describe('handleFileUpload', () => {
    test('應呼叫 handleFiles 並清空 file input value', () => {
      const fileInput = document.getElementById('file-input');
      // 設定一個假 value（jsdom 不允許真正設 value，但可測 reset）
      Object.defineProperty(fileInput, 'value', {
        writable: true,
        value: 'C:\\fakepath\\test.jpg',
      });

      const fakeFiles = [new File(['x'], 'test.jpg', { type: 'image/jpeg' })];
      const event = { target: { files: fakeFiles } };

      // handleFileUpload 是 fire-and-forget（不回傳 promise）
      handleFileUpload(event);

      // fileInput.value 應被重設為空
      expect(fileInput.value).toBe('');
    });
  });
});
