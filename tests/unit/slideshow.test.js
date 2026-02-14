const newtab = require('../../js/newtab');
const { startSlideshow, stopSlideshow, advanceSlide } = newtab;

describe('Slideshow', () => {
  beforeEach(() => {
    newtab.initDOM();
    newtab.currentIndex = 0;
    newtab.slideshowTimer = null;
    newtab.activeLayer = 'a';
    jest.useFakeTimers();
  });

  afterEach(() => {
    stopSlideshow();
    jest.useRealTimers();
  });

  const makeMedia = (count) =>
    Array.from({ length: count }, (_, i) => ({
      id: `img-${i}`,
      type: 'image',
      blob: new Blob(['x'], { type: 'image/jpeg' }),
    }));

  describe('startSlideshow', () => {
    test('single 模式不應啟動 timer', () => {
      newtab.settings = { playMode: 'single', interval: 10 };
      newtab.mediaItems = makeMedia(3);
      startSlideshow();
      expect(newtab.slideshowTimer).toBeNull();
    });

    test('只有一張圖片時不應啟動 timer', () => {
      newtab.settings = { playMode: 'sequential', interval: 10 };
      newtab.mediaItems = makeMedia(1);
      startSlideshow();
      expect(newtab.slideshowTimer).toBeNull();
    });

    test('sequential 模式應啟動 timer', () => {
      newtab.settings = { playMode: 'sequential', interval: 10 };
      newtab.mediaItems = makeMedia(3);
      startSlideshow();
      expect(newtab.slideshowTimer).not.toBeNull();
    });

    test('random 模式應啟動 timer', () => {
      newtab.settings = { playMode: 'random', interval: 5 };
      newtab.mediaItems = makeMedia(3);
      startSlideshow();
      expect(newtab.slideshowTimer).not.toBeNull();
    });
  });

  describe('advanceSlide - sequential', () => {
    test('應依序循環', () => {
      newtab.settings = { playMode: 'sequential', interval: 10 };
      newtab.mediaItems = makeMedia(3);
      newtab.currentIndex = 0;

      advanceSlide();
      expect(newtab.currentIndex).toBe(1);

      advanceSlide();
      expect(newtab.currentIndex).toBe(2);

      advanceSlide();
      expect(newtab.currentIndex).toBe(0); // 循環
    });

    test('只有一張時不應切換', () => {
      newtab.settings = { playMode: 'sequential', interval: 10 };
      newtab.mediaItems = makeMedia(1);
      newtab.currentIndex = 0;

      advanceSlide();
      expect(newtab.currentIndex).toBe(0);
    });
  });

  describe('advanceSlide - random', () => {
    test('random 模式不應連續選到相同 index', () => {
      newtab.settings = { playMode: 'random', interval: 10 };
      newtab.mediaItems = makeMedia(5);

      for (let i = 0; i < 20; i++) {
        const prev = newtab.currentIndex;
        advanceSlide();
        expect(newtab.currentIndex).not.toBe(prev);
      }
    });
  });

  describe('stopSlideshow', () => {
    test('應清除 timer', () => {
      newtab.settings = { playMode: 'sequential', interval: 10 };
      newtab.mediaItems = makeMedia(3);
      startSlideshow();
      expect(newtab.slideshowTimer).not.toBeNull();

      stopSlideshow();
      expect(newtab.slideshowTimer).toBeNull();
    });

    test('重複呼叫 stop 不應拋錯', () => {
      expect(() => {
        stopSlideshow();
        stopSlideshow();
      }).not.toThrow();
    });
  });

  describe('timer interval', () => {
    test('timer 應在指定間隔後觸發 advanceSlide', () => {
      newtab.settings = { playMode: 'sequential', interval: 15 };
      newtab.mediaItems = makeMedia(3);
      newtab.currentIndex = 0;
      startSlideshow();

      jest.advanceTimersByTime(15000);
      expect(newtab.currentIndex).toBe(1);

      jest.advanceTimersByTime(15000);
      expect(newtab.currentIndex).toBe(2);
    });
  });
});
