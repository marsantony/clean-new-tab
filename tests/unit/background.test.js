const newtab = require('../../js/newtab');
const { applyBackground, showImage, showVideo } = newtab;

describe('Background Display', () => {
  beforeEach(() => {
    newtab.initDOM();
    newtab.currentIndex = 0;
    newtab.activeLayer = 'a';
    URL.createObjectURL.mockClear();
    URL.revokeObjectURL.mockClear();
  });

  const makeImageItem = (id = 'img-1') => ({
    id,
    type: 'image',
    mimeType: 'image/jpeg',
    blob: new Blob(['img'], { type: 'image/jpeg' }),
  });

  const makeVideoItem = (id = 'vid-1') => ({
    id,
    type: 'video',
    mimeType: 'video/mp4',
    blob: new Blob(['vid'], { type: 'video/mp4' }),
  });

  describe('applyBackground', () => {
    test('mediaItems 為空時不應有任何動作', () => {
      newtab.mediaItems = [];
      applyBackground();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    test('圖片項目應呼叫 showImage 流程', () => {
      newtab.mediaItems = [makeImageItem()];
      applyBackground();
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    test('影片項目應呼叫 showVideo 流程', () => {
      newtab.mediaItems = [makeVideoItem()];
      applyBackground();
      const bgVideo = document.getElementById('bg-video');
      expect(bgVideo.classList.contains('active')).toBe(true);
    });
  });

  describe('showImage', () => {
    test('應建立 blob URL 並設定背景', () => {
      const item = makeImageItem();
      showImage(item);

      expect(URL.createObjectURL).toHaveBeenCalledWith(item.blob);
      const layerB = document.getElementById('bg-layer-b');
      expect(layerB.style.backgroundImage).toContain('blob:');
    });

    test('crossfade 應交替 layer', () => {
      newtab.activeLayer = 'a';
      showImage(makeImageItem('img-1'));
      expect(newtab.activeLayer).toBe('b');

      showImage(makeImageItem('img-2'));
      expect(newtab.activeLayer).toBe('a');
    });

    test('應釋放舊的 blob URL', () => {
      const layerA = document.getElementById('bg-layer-a');
      layerA.dataset.blobUrl = 'blob:old-url';

      newtab.activeLayer = 'a';
      showImage(makeImageItem());

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:old-url');
    });

    test('video 應被隱藏並暫停', () => {
      const bgVideo = document.getElementById('bg-video');
      bgVideo.classList.add('active');
      showImage(makeImageItem());
      expect(bgVideo.classList.contains('active')).toBe(false);
    });
  });

  describe('showVideo', () => {
    test('應建立 blob URL 並設定 video src', () => {
      const item = makeVideoItem();
      showVideo(item);

      const bgVideo = document.getElementById('bg-video');
      expect(URL.createObjectURL).toHaveBeenCalledWith(item.blob);
      expect(bgVideo.src).toContain('blob:');
      expect(bgVideo.classList.contains('active')).toBe(true);
    });

    test('兩個 image layer 都應被隱藏', () => {
      const layerA = document.getElementById('bg-layer-a');
      const layerB = document.getElementById('bg-layer-b');
      layerA.classList.add('active');

      showVideo(makeVideoItem());

      expect(layerA.classList.contains('active')).toBe(false);
      expect(layerB.classList.contains('active')).toBe(false);
    });

    test('應釋放舊的 video blob URL', () => {
      const bgVideo = document.getElementById('bg-video');
      bgVideo.dataset.blobUrl = 'blob:old-video-url';

      showVideo(makeVideoItem());

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:old-video-url');
    });
  });
});
