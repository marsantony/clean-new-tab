const newtab = require('../../js/newtab');
const { bindEvents, closeSettings, MediaDB, Settings } = newtab;

describe('bindEvents', () => {
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
    newtab.slideshowTimer = null;
    bindEvents();
  });

  describe('設定面板開關', () => {
    test('點擊 settings-btn 應開啟面板', () => {
      const overlay = document.getElementById('settings-overlay');
      expect(overlay.classList.contains('hidden')).toBe(true);

      document.getElementById('settings-btn').click();
      expect(overlay.classList.contains('hidden')).toBe(false);
    });

    test('點擊 settings-close 應關閉面板', () => {
      const overlay = document.getElementById('settings-overlay');
      overlay.classList.remove('hidden');

      document.getElementById('settings-close').click();
      expect(overlay.classList.contains('hidden')).toBe(true);
    });

    test('點擊 overlay 背景應關閉面板', () => {
      const overlay = document.getElementById('settings-overlay');
      overlay.classList.remove('hidden');

      // 模擬點擊 overlay 本身（非子元素）
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(overlay.classList.contains('hidden')).toBe(true);
    });

    test('點擊 overlay 內部元素不應關閉面板', () => {
      const overlay = document.getElementById('settings-overlay');
      overlay.classList.remove('hidden');

      const panel = document.getElementById('settings-panel');
      panel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(overlay.classList.contains('hidden')).toBe(false);
    });

    test('按 Escape 應關閉面板', () => {
      const overlay = document.getElementById('settings-overlay');
      overlay.classList.remove('hidden');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(overlay.classList.contains('hidden')).toBe(true);
    });

    test('面板已隱藏時按 Escape 不應報錯', () => {
      const overlay = document.getElementById('settings-overlay');
      expect(overlay.classList.contains('hidden')).toBe(true);

      expect(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }).not.toThrow();
    });
  });

  describe('Tab 切換', () => {
    test('點擊 Unsplash tab 應切換 source', () => {
      const unsplashTab = document.querySelector('.tab[data-tab="unsplash"]');
      unsplashTab.click();

      expect(unsplashTab.classList.contains('active')).toBe(true);
      expect(document.getElementById('tab-unsplash').classList.contains('active')).toBe(true);
      expect(document.getElementById('tab-upload').classList.contains('active')).toBe(false);
      expect(newtab.settings.source).toBe('unsplash');
    });

    test('點擊 upload tab 應切回 upload', () => {
      // 先切到 unsplash
      document.querySelector('.tab[data-tab="unsplash"]').click();
      // 再切回
      const uploadTab = document.querySelector('.tab[data-tab="upload"]');
      uploadTab.click();

      expect(uploadTab.classList.contains('active')).toBe(true);
      expect(newtab.settings.source).toBe('upload');
    });
  });

  describe('拖曳上傳', () => {
    test('dragover 應加上 dragover class', () => {
      const uploadArea = document.getElementById('upload-area');
      uploadArea.dispatchEvent(new Event('dragover', { bubbles: true }));
      expect(uploadArea.classList.contains('dragover')).toBe(true);
    });

    test('dragleave 應移除 dragover class', () => {
      const uploadArea = document.getElementById('upload-area');
      uploadArea.classList.add('dragover');
      uploadArea.dispatchEvent(new Event('dragleave'));
      expect(uploadArea.classList.contains('dragover')).toBe(false);
    });

    test('drop 應移除 dragover class', () => {
      const uploadArea = document.getElementById('upload-area');
      uploadArea.classList.add('dragover');

      const dropEvent = new Event('drop', { bubbles: true });
      dropEvent.preventDefault = jest.fn();
      dropEvent.dataTransfer = { files: [] };
      uploadArea.dispatchEvent(dropEvent);

      expect(uploadArea.classList.contains('dragover')).toBe(false);
    });
  });

  describe('播放模式切換', () => {
    test('選擇 sequential 應更新 settings 並顯示 interval', () => {
      const radio = document.querySelector('input[name="playMode"][value="sequential"]');
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));

      expect(newtab.settings.playMode).toBe('sequential');
      expect(document.getElementById('interval-group').style.display).toBe('block');
    });

    test('選擇 single 應隱藏 interval', () => {
      // 先設成 sequential
      newtab.settings.playMode = 'sequential';
      const radio = document.querySelector('input[name="playMode"][value="single"]');
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));

      expect(newtab.settings.playMode).toBe('single');
      expect(document.getElementById('interval-group').style.display).toBe('none');
    });
  });

  describe('Interval 調整', () => {
    test('拖動 interval slider 應更新文字和 settings', () => {
      const slider = document.getElementById('interval');
      slider.value = '30';
      slider.dispatchEvent(new Event('input'));

      expect(document.getElementById('interval-val').textContent).toBe('30 秒');
      expect(newtab.settings.interval).toBe(30);
    });
  });

  describe('Unsplash 設定', () => {
    test('調整張數 slider 應更新 settings', () => {
      const slider = document.getElementById('unsplash-count');
      slider.value = '8';
      slider.dispatchEvent(new Event('input'));

      expect(document.getElementById('unsplash-count-val').textContent).toBe('8');
      expect(newtab.settings.unsplashCount).toBe(8);
    });

    test('修改 API Key 應更新 settings', () => {
      const input = document.getElementById('unsplash-api-key');
      input.value = 'new-test-key';
      input.dispatchEvent(new Event('change'));

      expect(newtab.settings.unsplashApiKey).toBe('new-test-key');
    });

    test('API Key 前後空白應被 trim', () => {
      const input = document.getElementById('unsplash-api-key');
      input.value = '  spaced-key  ';
      input.dispatchEvent(new Event('change'));

      expect(newtab.settings.unsplashApiKey).toBe('spaced-key');
    });
  });
});
