const newtab = require('../../js/newtab');
const { handleFiles, MediaDB, Settings } = newtab;

describe('上傳→儲存→顯示 完整流程', () => {
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

  test('上傳圖片後應儲存到 IndexedDB 並顯示為背景', async () => {
    const file = new File(['img-content'], 'photo.jpg', { type: 'image/jpeg' });

    await handleFiles([file]);

    // 驗證 IndexedDB
    const all = await MediaDB.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('photo.jpg');

    // 驗證 uploadIds
    expect(newtab.settings.uploadIds).toHaveLength(1);

    // 驗證 mediaItems 已更新
    expect(newtab.mediaItems).toHaveLength(1);

    // 驗證背景已顯示
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  test('上傳多個檔案應全部儲存', async () => {
    const files = [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.png', { type: 'image/png' }),
      new File(['c'], 'c.mp4', { type: 'video/mp4' }),
    ];

    await handleFiles(files);

    const all = await MediaDB.getAll();
    expect(all).toHaveLength(3);
    expect(newtab.settings.uploadIds).toHaveLength(3);
  });

  test('混合有效與無效檔案只儲存有效的', async () => {
    const files = [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.txt', { type: 'text/plain' }),
      new File(['c'], 'c.exe', { type: 'application/x-msdownload' }),
      new File(['d'], 'd.webm', { type: 'video/webm' }),
    ];

    await handleFiles(files);

    const all = await MediaDB.getAll();
    expect(all).toHaveLength(2);
    expect(newtab.settings.uploadIds).toHaveLength(2);
  });
});
