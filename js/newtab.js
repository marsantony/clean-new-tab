/* =============================================
   Clean New Tab - 主邏輯
   ============================================= */

// ── IndexedDB 操作模組 ──
const MediaDB = (() => {
  const DB_NAME = 'CleanNewTabDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'media';

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function withStore(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const req = fn(tx.objectStore(STORE_NAME));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    getAll: () => withStore('readonly', s => s.getAll()),
    get: (id) => withStore('readonly', s => s.get(id)),
    put: (item) => withStore('readwrite', s => s.put(item)),
    remove: (id) => withStore('readwrite', s => s.delete(id)),
    clear: () => withStore('readwrite', s => s.clear()),
  };
})();

// ── 設定管理 ──
const Settings = (() => {
  const DEFAULTS = {
    source: 'upload',       // 'upload' | 'unsplash'
    playMode: 'single',     // 'single' | 'sequential' | 'random'
    interval: 10,           // 秒
    unsplashApiKey: '',
    unsplashCount: 5,
    uploadIds: [],           // 上傳檔案的 ID 列表（排序用）
    unsplashIds: [],         // Unsplash 圖片的 ID 列表
  };

  async function load() {
    return new Promise(resolve => {
      chrome.storage.local.get(DEFAULTS, data => resolve(data));
    });
  }

  async function save(data) {
    return new Promise(resolve => {
      chrome.storage.local.set(data, resolve);
    });
  }

  return { load, save, DEFAULTS };
})();

// ── 全域狀態 ──
let settings = {};
let mediaItems = [];
let currentIndex = 0;
let slideshowTimer = null;
let activeLayer = 'a'; // 'a' | 'b' — 用於 crossfade

// ── DOM 元素 ──
const $ = id => document.getElementById(id);
let bgLayerA, bgLayerB, bgVideo;
let settingsBtn, settingsOverlay, settingsClose;
let fileInput, uploadArea, fileList, fileListEmpty;
let unsplashList, unsplashListEmpty, unsplashFetchBtn, unsplashStatus;
let unsplashApiKeyInput, unsplashCountInput, unsplashCountVal;
let intervalInput, intervalVal, intervalGroup;

function initDOM() {
  bgLayerA = $('bg-layer-a');
  bgLayerB = $('bg-layer-b');
  bgVideo = $('bg-video');
  settingsBtn = $('settings-btn');
  settingsOverlay = $('settings-overlay');
  settingsClose = $('settings-close');
  fileInput = $('file-input');
  uploadArea = $('upload-area');
  fileList = $('file-list');
  fileListEmpty = $('file-list-empty');
  unsplashList = $('unsplash-list');
  unsplashListEmpty = $('unsplash-list-empty');
  unsplashFetchBtn = $('unsplash-fetch');
  unsplashStatus = $('unsplash-status');
  unsplashApiKeyInput = $('unsplash-api-key');
  unsplashCountInput = $('unsplash-count');
  unsplashCountVal = $('unsplash-count-val');
  intervalInput = $('interval');
  intervalVal = $('interval-val');
  intervalGroup = $('interval-group');
}

// ── 初始化 ──
async function init() {
  initDOM();
  settings = await Settings.load();
  await loadMedia();
  applyBackground();
  startSlideshow();
  bindEvents();
  await syncUI();
}

// ── 工具函式 ──
function orderByIds(items, ids) {
  const idSet = new Set(ids);
  const map = new Map(items.map(m => [m.id, m]));
  const ordered = ids.flatMap(id => map.has(id) ? [map.get(id)] : []);
  for (const item of items) {
    if (!idSet.has(item.id)) ordered.push(item);
  }
  return ordered;
}

// ── 載入媒體 ──
async function loadMedia() {
  const allItems = await MediaDB.getAll();
  const ids = settings.source === 'upload' ? settings.uploadIds : settings.unsplashIds;
  const sourceItems = allItems.filter(m => m.source === settings.source);
  mediaItems = orderByIds(sourceItems, ids);
}

// ── 背景顯示 ──
function applyBackground() {
  if (mediaItems.length === 0) {
    clearBackground();
    return;
  }

  const item = mediaItems[currentIndex % mediaItems.length];

  if (item.type === 'video') {
    showVideo(item);
  } else {
    showImage(item);
  }

  updateAttribution(item);
}

function updateAttribution(item) {
  const el = document.getElementById('unsplash-attribution');
  if (!el) return;

  if (item.source === 'unsplash' && item.photographer) {
    const photographerLink = document.getElementById('attribution-photographer');
    photographerLink.textContent = item.photographer;
    photographerLink.href = item.photographerUrl || '#';
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

function clearBackground() {
  bgLayerA.style.backgroundImage = '';
  bgLayerA.classList.remove('active');
  bgLayerB.style.backgroundImage = '';
  bgLayerB.classList.remove('active');
  bgVideo.classList.remove('active');
  bgVideo.pause();
  bgVideo.removeAttribute('src');

  // 釋放 blob URL
  for (const layer of [bgLayerA, bgLayerB, bgVideo]) {
    if (layer.dataset.blobUrl) {
      URL.revokeObjectURL(layer.dataset.blobUrl);
      delete layer.dataset.blobUrl;
    }
  }

  // 隱藏署名
  const attrEl = document.getElementById('unsplash-attribution');
  if (attrEl) attrEl.classList.add('hidden');
}

function showImage(item) {
  bgVideo.classList.remove('active');
  bgVideo.pause();
  bgVideo.removeAttribute('src');

  const url = URL.createObjectURL(item.blob);
  const nextLayer = activeLayer === 'a' ? bgLayerB : bgLayerA;
  const currLayer = activeLayer === 'a' ? bgLayerA : bgLayerB;

  nextLayer.style.backgroundImage = `url("${url}")`;

  // 釋放舊的 blob URL
  const oldUrl = currLayer.dataset.blobUrl;
  if (oldUrl) URL.revokeObjectURL(oldUrl);

  requestAnimationFrame(() => {
    nextLayer.classList.add('active');
    currLayer.classList.remove('active');
    nextLayer.dataset.blobUrl = url;
    activeLayer = activeLayer === 'a' ? 'b' : 'a';
  });
}

function showVideo(item) {
  bgLayerA.classList.remove('active');
  bgLayerB.classList.remove('active');

  const url = URL.createObjectURL(item.blob);
  const oldUrl = bgVideo.dataset.blobUrl;
  if (oldUrl) URL.revokeObjectURL(oldUrl);

  bgVideo.src = url;
  bgVideo.dataset.blobUrl = url;
  bgVideo.play().catch(() => {});
  bgVideo.classList.add('active');
}

// ── 幻燈片 ──
function startSlideshow() {
  stopSlideshow();
  if (settings.playMode === 'single' || mediaItems.length <= 1) return;

  slideshowTimer = setInterval(() => {
    advanceSlide();
  }, settings.interval * 1000);
}

function stopSlideshow() {
  if (slideshowTimer) {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
  }
}

function advanceSlide() {
  if (mediaItems.length <= 1) return;

  if (settings.playMode === 'random') {
    let next;
    do {
      next = Math.floor(Math.random() * mediaItems.length);
    } while (next === currentIndex && mediaItems.length > 1);
    currentIndex = next;
  } else {
    currentIndex = (currentIndex + 1) % mediaItems.length;
  }
  applyBackground();
}

// ── 事件綁定 ──
function bindEvents() {
  // 設定面板開關
  settingsBtn.addEventListener('click', () => {
    settingsOverlay.classList.remove('hidden');
  });

  settingsClose.addEventListener('click', closeSettings);

  settingsOverlay.addEventListener('click', e => {
    if (e.target === settingsOverlay) closeSettings();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !settingsOverlay.classList.contains('hidden')) {
      closeSettings();
    }
  });

  // Tab 切換
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById(`tab-${target}`).classList.add('active');

      settings.source = target;
      Settings.save({ source: target });
      reloadAndApply();
    });
  });

  // 上傳檔案
  fileInput.addEventListener('change', handleFileUpload);

  // 拖曳上傳
  uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  });

  // 播放模式
  document.querySelectorAll('input[name="playMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      settings.playMode = radio.value;
      Settings.save({ playMode: radio.value });
      syncIntervalVisibility();
      startSlideshow();
    });
  });

  // 切換間隔
  intervalInput.addEventListener('input', () => {
    const val = parseInt(intervalInput.value);
    intervalVal.textContent = `${val} 秒`;
    settings.interval = val;
    Settings.save({ interval: val });
    startSlideshow();
  });

  // Unsplash 張數
  unsplashCountInput.addEventListener('input', () => {
    const val = parseInt(unsplashCountInput.value);
    unsplashCountVal.textContent = val;
    settings.unsplashCount = val;
    Settings.save({ unsplashCount: val });
  });

  // Unsplash API Key
  unsplashApiKeyInput.addEventListener('change', () => {
    settings.unsplashApiKey = unsplashApiKeyInput.value.trim();
    Settings.save({ unsplashApiKey: settings.unsplashApiKey });
  });

  // Unsplash 取得
  unsplashFetchBtn.addEventListener('click', fetchUnsplash);
}

function closeSettings() {
  settingsOverlay.classList.add('hidden');
}

// ── 同步 UI ──
async function syncUI() {
  // Tab
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === settings.source);
  });
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `tab-${settings.source}`);
  });

  // 播放模式
  document.querySelectorAll('input[name="playMode"]').forEach(r => {
    r.checked = r.value === settings.playMode;
  });

  // 間隔
  intervalInput.value = settings.interval;
  intervalVal.textContent = `${settings.interval} 秒`;
  syncIntervalVisibility();

  // Unsplash
  unsplashApiKeyInput.value = settings.unsplashApiKey;
  unsplashCountInput.value = settings.unsplashCount;
  unsplashCountVal.textContent = settings.unsplashCount;

  // 檔案列表（共用一次 DB 讀取）
  const allItems = await MediaDB.getAll();
  await renderFileList(allItems);
  await renderUnsplashList(allItems);
}

function syncIntervalVisibility() {
  intervalGroup.style.display = settings.playMode === 'single' ? 'none' : 'block';
}

// ── 檔案上傳處理 ──
async function handleFileUpload(e) {
  await handleFiles(e.target.files);
  fileInput.value = '';
}

async function handleFiles(files) {
  const validTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm'
  ];

  for (const file of files) {
    if (!validTypes.includes(file.type)) continue;

    const id = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const type = file.type.startsWith('video/') ? 'video' : 'image';

    await MediaDB.put({
      id,
      source: 'upload',
      type,
      mimeType: file.type,
      blob: file,
      name: file.name,
      addedAt: Date.now()
    });

    settings.uploadIds.push(id);
  }

  await Settings.save({ uploadIds: settings.uploadIds });
  await reloadAndApply();
  await renderFileList();
}

function revokeThumbUrls(container) {
  container.querySelectorAll('img, video').forEach(el => {
    if (el.src && el.src.startsWith('blob:')) URL.revokeObjectURL(el.src);
  });
}

// ── 渲染檔案列表 ──
async function renderFileList(allItems) {
  if (!allItems) allItems = await MediaDB.getAll();
  const uploads = allItems.filter(m => m.source === 'upload');

  revokeThumbUrls(fileList);
  fileList.innerHTML = '';
  fileListEmpty.style.display = uploads.length === 0 ? 'block' : 'none';

  const ordered = orderByIds(uploads, settings.uploadIds);
  for (const item of ordered) {
    fileList.appendChild(createThumbElement(item, 'upload'));
  }
}

async function renderUnsplashList(allItems) {
  if (!allItems) allItems = await MediaDB.getAll();
  const unsplashItems = allItems.filter(m => m.source === 'unsplash');

  revokeThumbUrls(unsplashList);
  unsplashList.innerHTML = '';
  unsplashListEmpty.style.display = unsplashItems.length === 0 ? 'block' : 'none';

  for (const item of unsplashItems) {
    unsplashList.appendChild(createThumbElement(item, 'unsplash'));
  }
}

function createThumbElement(item, source) {
  const div = document.createElement('div');
  div.className = 'file-thumb';

  if (item.type === 'video') {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(item.blob);
    video.muted = true;
    video.addEventListener('mouseenter', () => video.play());
    video.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
    div.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(item.blob);
    img.loading = 'lazy';
    div.appendChild(img);
  }

  // 類型標籤
  const badge = document.createElement('span');
  badge.className = 'type-badge';
  if (item.type === 'video') {
    badge.textContent = item.mimeType === 'video/webm' ? 'WEBM' : 'MP4';
  } else if (item.mimeType === 'image/gif') {
    badge.textContent = 'GIF';
  } else {
    badge.textContent = 'IMG';
  }
  div.appendChild(badge);

  // 刪除按鈕
  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.textContent = '×';
  delBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await MediaDB.remove(item.id);

    if (source === 'upload') {
      settings.uploadIds = settings.uploadIds.filter(id => id !== item.id);
      await Settings.save({ uploadIds: settings.uploadIds });
      await renderFileList();
    } else {
      settings.unsplashIds = settings.unsplashIds.filter(id => id !== item.id);
      await Settings.save({ unsplashIds: settings.unsplashIds });
      await renderUnsplashList();
    }

    await reloadAndApply();
  });
  div.appendChild(delBtn);

  return div;
}

// ── Unsplash ──
async function fetchUnsplash() {
  const apiKey = settings.unsplashApiKey;
  if (!apiKey) {
    unsplashStatus.textContent = '請先輸入 Unsplash API Key';
    unsplashStatus.className = 'error';
    return;
  }

  const count = settings.unsplashCount;
  unsplashFetchBtn.disabled = true;
  unsplashStatus.textContent = '正在取得桌布...';
  unsplashStatus.className = '';

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?count=${count}&query=wallpapers&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${apiKey}` } }
    );

    if (!res.ok) {
      throw new Error(`API 回應 ${res.status}: ${res.statusText}`);
    }

    const photos = await res.json();

    // 清除舊的 unsplash 圖片
    const oldItems = await MediaDB.getAll();
    for (const item of oldItems) {
      if (item.source === 'unsplash') await MediaDB.remove(item.id);
    }
    settings.unsplashIds = [];

    // 並行下載所有圖片
    const utmSuffix = '?utm_source=clean_new_tab&utm_medium=referral';
    unsplashStatus.textContent = `正在下載 ${photos.length} 張桌布...`;

    const downloads = photos.map(async (photo) => {
      const imgUrl = photo.urls.regular || photo.urls.full;
      const imgRes = await fetch(imgUrl);
      const blob = await imgRes.blob();

      // 觸發 Unsplash download tracking（API 規範要求）
      if (photo.links?.download_location) {
        fetch(`${photo.links.download_location}${utmSuffix}`, {
          headers: { Authorization: `Client-ID ${apiKey}` }
        }).catch(() => {});
      }

      return { photo, blob };
    });

    const results = await Promise.all(downloads);

    for (const { photo, blob } of results) {
      const id = `unsplash_${photo.id}`;
      await MediaDB.put({
        id,
        source: 'unsplash',
        type: 'image',
        mimeType: 'image/jpeg',
        blob,
        name: photo.alt_description || `Unsplash ${photo.id}`,
        photographer: photo.user?.name,
        photographerUrl: photo.user?.links?.html ? photo.user.links.html + utmSuffix : null,
        unsplashUrl: (photo.links?.html || 'https://unsplash.com') + utmSuffix,
        addedAt: Date.now()
      });

      settings.unsplashIds.push(id);
    }

    await Settings.save({ unsplashIds: settings.unsplashIds });
    unsplashStatus.textContent = `成功取得 ${photos.length} 張桌布`;
    unsplashStatus.className = '';

    await renderUnsplashList();

    if (settings.source === 'unsplash') {
      await reloadAndApply();
    }
  } catch (err) {
    unsplashStatus.textContent = `錯誤: ${err.message}`;
    unsplashStatus.className = 'error';
  } finally {
    unsplashFetchBtn.disabled = false;
  }
}

// ── 重新載入並套用 ──
async function reloadAndApply() {
  await loadMedia();
  currentIndex = 0;
  applyBackground();
  startSlideshow();
}

// ── 啟動 ──
document.addEventListener('DOMContentLoaded', init);

// ── 測試用匯出 ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MediaDB,
    Settings,
    initDOM,
    init,
    loadMedia,
    applyBackground,
    showImage,
    showVideo,
    startSlideshow,
    stopSlideshow,
    advanceSlide,
    bindEvents,
    closeSettings,
    syncUI,
    syncIntervalVisibility,
    handleFileUpload,
    handleFiles,
    renderFileList,
    renderUnsplashList,
    createThumbElement,
    fetchUnsplash,
    reloadAndApply,
    updateAttribution,
    clearBackground,
    get settings() { return settings; },
    set settings(v) { settings = v; },
    get mediaItems() { return mediaItems; },
    set mediaItems(v) { mediaItems = v; },
    get currentIndex() { return currentIndex; },
    set currentIndex(v) { currentIndex = v; },
    get slideshowTimer() { return slideshowTimer; },
    set slideshowTimer(v) { slideshowTimer = v; },
    get activeLayer() { return activeLayer; },
    set activeLayer(v) { activeLayer = v; },
  };
}
