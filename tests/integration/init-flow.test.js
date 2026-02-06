const newtab = require('../../js/newtab');
const { init, MediaDB, Settings } = newtab;

describe('init() 完整流程', () => {
  beforeEach(async () => {
    await MediaDB.clear();
    newtab.currentIndex = 0;
    newtab.activeLayer = 'a';
    newtab.slideshowTimer = null;
    newtab.mediaItems = [];
    newtab.settings = {};
  });

  test('init 應完成 DOM 初始化', async () => {
    await init();
    expect(document.getElementById('bg-layer-a')).toBeDefined();
  });

  test('init 應載入預設 settings', async () => {
    await init();
    expect(newtab.settings.source).toBe('upload');
    expect(newtab.settings.playMode).toBe('single');
  });

  test('無媒體時 init 應正常完成（不崩潰）', async () => {
    await expect(init()).resolves.not.toThrow();
    expect(newtab.mediaItems).toHaveLength(0);
  });

  test('有媒體時 init 應載入並顯示背景', async () => {
    // 預先存入一張圖片
    await MediaDB.put({
      id: 'img-1',
      source: 'upload',
      type: 'image',
      mimeType: 'image/jpeg',
      blob: new Blob(['test'], { type: 'image/jpeg' }),
      name: 'test.jpg',
      addedAt: Date.now(),
    });
    await Settings.save({ uploadIds: ['img-1'] });

    await init();

    expect(newtab.mediaItems).toHaveLength(1);
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
