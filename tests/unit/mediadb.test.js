const { MediaDB } = require('../../js/newtab');

describe('MediaDB', () => {
  beforeEach(async () => {
    await MediaDB.clear();
  });

  const makeItem = (id = 'test-1', extra = {}) => ({
    id,
    source: 'upload',
    type: 'image',
    mimeType: 'image/jpeg',
    blob: new Blob(['test'], { type: 'image/jpeg' }),
    name: 'test.jpg',
    addedAt: Date.now(),
    ...extra,
  });

  describe('put / get', () => {
    test('應能儲存並讀取單筆資料', async () => {
      const item = makeItem('img-1');
      await MediaDB.put(item);
      const result = await MediaDB.get('img-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('img-1');
      expect(result.name).toBe('test.jpg');
    });

    test('put 相同 ID 應覆寫', async () => {
      await MediaDB.put(makeItem('img-1', { name: 'a.jpg' }));
      await MediaDB.put(makeItem('img-1', { name: 'b.jpg' }));
      const result = await MediaDB.get('img-1');
      expect(result.name).toBe('b.jpg');
    });

    test('get 不存在的 ID 應回傳 undefined', async () => {
      const result = await MediaDB.get('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getAll', () => {
    test('空資料庫應回傳空陣列', async () => {
      const result = await MediaDB.getAll();
      expect(result).toEqual([]);
    });

    test('應回傳所有已儲存的項目', async () => {
      await MediaDB.put(makeItem('img-1'));
      await MediaDB.put(makeItem('img-2'));
      await MediaDB.put(makeItem('img-3'));
      const result = await MediaDB.getAll();
      expect(result).toHaveLength(3);
    });
  });

  describe('remove', () => {
    test('應刪除指定項目', async () => {
      await MediaDB.put(makeItem('img-1'));
      await MediaDB.put(makeItem('img-2'));
      await MediaDB.remove('img-1');
      const all = await MediaDB.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('img-2');
    });

    test('刪除不存在的 ID 不應拋錯', async () => {
      await expect(MediaDB.remove('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    test('應清除所有資料', async () => {
      await MediaDB.put(makeItem('img-1'));
      await MediaDB.put(makeItem('img-2'));
      await MediaDB.clear();
      const result = await MediaDB.getAll();
      expect(result).toEqual([]);
    });

    test('對空資料庫呼叫 clear 不應拋錯', async () => {
      await expect(MediaDB.clear()).resolves.not.toThrow();
    });
  });
});
