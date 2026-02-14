const newtab = require('../../js/newtab');
const { init, Settings, MediaDB } = newtab;

describe('設定變更→持久化→行為更新', () => {
  beforeEach(async () => {
    await MediaDB.clear();
    newtab.currentIndex = 0;
    newtab.activeLayer = 'a';
    newtab.slideshowTimer = null;
    newtab.mediaItems = [];
    newtab.settings = {};
    jest.useFakeTimers();
  });

  afterEach(() => {
    newtab.stopSlideshow();
    jest.useRealTimers();
  });

  test('切換播放模式到 sequential 應啟動 slideshow', async () => {
    // 先存兩張圖
    for (let i = 0; i < 2; i++) {
      await MediaDB.put({
        id: `img-${i}`,
        source: 'upload',
        type: 'image',
        mimeType: 'image/jpeg',
        blob: new Blob(['x'], { type: 'image/jpeg' }),
        name: `${i}.jpg`,
        addedAt: Date.now(),
      });
    }
    await Settings.save({ uploadIds: ['img-0', 'img-1'] });

    await init();

    // 改為 sequential
    newtab.settings.playMode = 'sequential';
    newtab.settings.interval = 10;
    newtab.startSlideshow();

    expect(newtab.slideshowTimer).not.toBeNull();

    // 等待一個間隔
    jest.advanceTimersByTime(10000);
    expect(newtab.currentIndex).toBe(1);
  });

  test('修改 interval 後 slideshow 應使用新間隔', async () => {
    for (let i = 0; i < 3; i++) {
      await MediaDB.put({
        id: `img-${i}`,
        source: 'upload',
        type: 'image',
        mimeType: 'image/jpeg',
        blob: new Blob(['x'], { type: 'image/jpeg' }),
        name: `${i}.jpg`,
        addedAt: Date.now(),
      });
    }
    await Settings.save({ uploadIds: ['img-0', 'img-1', 'img-2'] });

    await init();
    newtab.settings.playMode = 'sequential';
    newtab.settings.interval = 5;
    newtab.startSlideshow();

    jest.advanceTimersByTime(5000);
    expect(newtab.currentIndex).toBe(1);

    // 改為 20 秒
    newtab.settings.interval = 20;
    newtab.startSlideshow(); // 重啟

    jest.advanceTimersByTime(5000); // 只過 5 秒不應切換
    expect(newtab.currentIndex).toBe(1);

    jest.advanceTimersByTime(15000); // 總共 20 秒
    expect(newtab.currentIndex).toBe(2);
  });
});
