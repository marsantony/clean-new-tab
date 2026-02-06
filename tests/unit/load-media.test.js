const newtab = require('../../js/newtab');
const { loadMedia, MediaDB } = newtab;

describe('loadMedia', () => {
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
  });

  const putItem = async (id, source = 'upload') => {
    await MediaDB.put({
      id,
      source,
      type: 'image',
      mimeType: 'image/jpeg',
      blob: new Blob(['data'], { type: 'image/jpeg' }),
    });
  };

  test('應依照 uploadIds 順序載入', async () => {
    await putItem('upload_2');
    await putItem('upload_1');
    newtab.settings.uploadIds = ['upload_1', 'upload_2'];

    await loadMedia();

    expect(newtab.mediaItems[0].id).toBe('upload_1');
    expect(newtab.mediaItems[1].id).toBe('upload_2');
  });

  test('不在 uploadIds 中的孤立項目應被附加到最後', async () => {
    await putItem('upload_1');
    await putItem('upload_orphan');
    newtab.settings.uploadIds = ['upload_1'];

    await loadMedia();

    expect(newtab.mediaItems).toHaveLength(2);
    expect(newtab.mediaItems[0].id).toBe('upload_1');
    expect(newtab.mediaItems[1].id).toBe('upload_orphan');
  });

  test('source 為 unsplash 時應使用 unsplashIds', async () => {
    newtab.settings.source = 'unsplash';
    await putItem('unsplash_1', 'unsplash');
    await putItem('unsplash_2', 'unsplash');
    newtab.settings.unsplashIds = ['unsplash_2', 'unsplash_1'];

    await loadMedia();

    expect(newtab.mediaItems[0].id).toBe('unsplash_2');
    expect(newtab.mediaItems[1].id).toBe('unsplash_1');
  });

  test('DB 為空時 mediaItems 應為空陣列', async () => {
    await loadMedia();
    expect(newtab.mediaItems).toEqual([]);
  });

  test('ID 對應不到 DB 項目時應略過', async () => {
    newtab.settings.uploadIds = ['upload_nonexistent'];

    await loadMedia();
    expect(newtab.mediaItems).toEqual([]);
  });
});
