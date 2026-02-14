const { Settings } = require('../../js/newtab');

describe('Settings', () => {
  describe('DEFAULTS', () => {
    test('應包含所有必要欄位', () => {
      const d = Settings.DEFAULTS;
      expect(d).toHaveProperty('source', 'upload');
      expect(d).toHaveProperty('playMode', 'single');
      expect(d).toHaveProperty('interval', 10);
      expect(d).toHaveProperty('unsplashApiKey', '');
      expect(d).toHaveProperty('unsplashCount', 5);
      expect(d).toHaveProperty('uploadIds');
      expect(d).toHaveProperty('unsplashIds');
      expect(Array.isArray(d.uploadIds)).toBe(true);
      expect(Array.isArray(d.unsplashIds)).toBe(true);
    });
  });

  describe('load', () => {
    test('無已儲存資料時應回傳預設值', async () => {
      const data = await Settings.load();
      expect(data.source).toBe('upload');
      expect(data.playMode).toBe('single');
      expect(data.interval).toBe(10);
    });

    test('有已儲存資料時應合併回傳', async () => {
      await Settings.save({ playMode: 'random', interval: 30 });
      const data = await Settings.load();
      expect(data.playMode).toBe('random');
      expect(data.interval).toBe(30);
      // 未儲存的欄位應回傳預設值
      expect(data.source).toBe('upload');
    });
  });

  describe('save', () => {
    test('應能儲存並持久化資料', async () => {
      await Settings.save({ unsplashApiKey: 'test-key-123' });
      const data = await Settings.load();
      expect(data.unsplashApiKey).toBe('test-key-123');
    });

    test('save 應只更新指定欄位，不影響其他欄位', async () => {
      await Settings.save({ playMode: 'sequential' });
      await Settings.save({ interval: 60 });
      const data = await Settings.load();
      expect(data.playMode).toBe('sequential');
      expect(data.interval).toBe(60);
    });

    test('應能儲存陣列資料', async () => {
      const ids = ['id1', 'id2', 'id3'];
      await Settings.save({ uploadIds: ids });
      const data = await Settings.load();
      expect(data.uploadIds).toEqual(ids);
    });
  });
});
