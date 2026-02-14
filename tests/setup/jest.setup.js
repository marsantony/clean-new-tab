const fs = require('fs');
const path = require('path');
const { createChromeMock } = require('./chrome-mock');

// 載入 HTML
const html = fs.readFileSync(
  path.resolve(__dirname, '../../newtab.html'),
  'utf-8'
);

// 在每個測試檔案之前設定 DOM
beforeEach(() => {
  // 設定 HTML body（去掉 script tag 避免執行）
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    const bodyContent = bodyMatch[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    document.body.innerHTML = bodyContent;
  }

  // 設定 chrome mock
  const { chrome } = createChromeMock();
  global.chrome = chrome;

  // URL mock
  const blobUrls = new Set();
  let blobCounter = 0;
  global.URL.createObjectURL = jest.fn((blob) => {
    const url = `blob:mock-${++blobCounter}`;
    blobUrls.add(url);
    return url;
  });
  global.URL.revokeObjectURL = jest.fn((url) => {
    blobUrls.delete(url);
  });
  global._blobUrls = blobUrls;

  // fetch mock
  global.fetch = jest.fn();

  // requestAnimationFrame mock
  global.requestAnimationFrame = jest.fn((cb) => {
    cb();
    return 0;
  });

  // HTMLVideoElement.play mock
  HTMLVideoElement.prototype.play = jest.fn(() => Promise.resolve());
  HTMLVideoElement.prototype.pause = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  delete global.chrome;
  delete global._blobUrls;
});
