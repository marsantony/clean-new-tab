const newtab = require('../../js/newtab');
const { syncUI, syncIntervalVisibility, MediaDB } = newtab;

describe('UI Sync', () => {
  beforeEach(async () => {
    newtab.initDOM();
    await MediaDB.clear();
    newtab.settings = {
      source: 'upload',
      playMode: 'single',
      interval: 10,
      unsplashApiKey: 'my-key',
      unsplashCount: 7,
      uploadIds: [],
      unsplashIds: [],
    };
  });

  describe('syncUI', () => {
    test('Tab 應根據 source 設定 active class', () => {
      newtab.settings.source = 'unsplash';
      syncUI();

      const tabs = document.querySelectorAll('.tab');
      const uploadTab = [...tabs].find(t => t.dataset.tab === 'upload');
      const unsplashTab = [...tabs].find(t => t.dataset.tab === 'unsplash');

      expect(uploadTab.classList.contains('active')).toBe(false);
      expect(unsplashTab.classList.contains('active')).toBe(true);
    });

    test('Tab content 應根據 source 顯示', () => {
      newtab.settings.source = 'unsplash';
      syncUI();

      const tabUpload = document.getElementById('tab-upload');
      const tabUnsplash = document.getElementById('tab-unsplash');
      expect(tabUpload.classList.contains('active')).toBe(false);
      expect(tabUnsplash.classList.contains('active')).toBe(true);
    });

    test('播放模式 radio 應正確勾選', () => {
      newtab.settings.playMode = 'random';
      syncUI();

      const radios = document.querySelectorAll('input[name="playMode"]');
      const checked = [...radios].find(r => r.checked);
      expect(checked.value).toBe('random');
    });

    test('interval slider 應設定正確值', () => {
      newtab.settings.interval = 45;
      syncUI();

      const slider = document.getElementById('interval');
      const val = document.getElementById('interval-val');
      expect(slider.value).toBe('45');
      expect(val.textContent).toBe('45 秒');
    });

    test('Unsplash API Key 應填入', () => {
      syncUI();
      const input = document.getElementById('unsplash-api-key');
      expect(input.value).toBe('my-key');
    });

    test('Unsplash count 應設定正確值', () => {
      syncUI();
      const slider = document.getElementById('unsplash-count');
      const val = document.getElementById('unsplash-count-val');
      expect(slider.value).toBe('7');
      expect(val.textContent).toBe('7');
    });
  });

  describe('syncIntervalVisibility', () => {
    test('single 模式下 interval group 應隱藏', () => {
      newtab.settings.playMode = 'single';
      syncIntervalVisibility();

      const group = document.getElementById('interval-group');
      expect(group.style.display).toBe('none');
    });

    test('sequential 模式下 interval group 應顯示', () => {
      newtab.settings.playMode = 'sequential';
      syncIntervalVisibility();

      const group = document.getElementById('interval-group');
      expect(group.style.display).toBe('block');
    });

    test('random 模式下 interval group 應顯示', () => {
      newtab.settings.playMode = 'random';
      syncIntervalVisibility();

      const group = document.getElementById('interval-group');
      expect(group.style.display).toBe('block');
    });
  });
});
