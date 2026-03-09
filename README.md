# Clean New Tab

乾淨的 Chrome 新分頁擴充功能。用你喜歡的圖片、GIF 動圖、影片或 Unsplash 桌布取代預設的新分頁背景。

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## 功能

- **全螢幕背景** — 乾淨的新分頁，沒有多餘的 UI 元素
- **上傳自訂背景** — 支援 JPG、PNG、WebP、GIF 動圖、MP4、WebM 影片
- **Unsplash 隨機桌布** — 從 [Unsplash](https://unsplash.com/t/wallpapers) 隨機取得 1~10 張高品質桌布
- **幻燈片播放** — 定序或隨機輪播，切換間隔可自訂（5~300 秒）
- **淡入淡出動畫** — 背景切換時有平滑的 crossfade 效果

## 安裝

### 從原始碼安裝（開發者模式）

1. 下載或 clone 此專案：
   ```bash
   git clone https://github.com/marsantony/clean-new-tab.git
   ```
2. 開啟 Chrome，前往 `chrome://extensions/`
3. 開啟右上角的 **開發者模式**
4. 點擊 **載入未封裝項目**
5. 選擇 `clean-new-tab` 資料夾
6. 開啟新分頁即可看到效果

## 使用方式

### 設定面板

將滑鼠移到頁面右下角，會出現齒輪圖示，點擊即可開啟設定面板。

### 上傳背景

1. 在設定面板中選擇 **上傳檔案** 分頁
2. 點擊上傳區域或拖曳檔案到上傳區
3. 支援的格式：JPG、PNG、WebP、GIF、MP4、WebM

### Unsplash 桌布

1. 前往 [Unsplash Developers](https://unsplash.com/developers) 註冊並建立應用程式
2. 取得 **Access Key**
3. 在設定面板的 **Unsplash** 分頁中輸入 API Key
4. 選擇要取得的桌布張數（1~10 張）
5. 點擊 **取得隨機桌布**

### 播放模式

| 模式 | 說明 |
|------|------|
| 單張顯示 | 只顯示第一張背景 |
| 定序輪播 | 依照順序循環切換 |
| 隨機輪播 | 隨機切換背景 |

## 技術架構

```
clean-new-tab/
├── manifest.json      # Chrome Extension 設定（Manifest V3）
├── newtab.html        # 新分頁頁面
├── css/
│   └── newtab.css     # 樣式
├── js/
│   └── newtab.js      # 主邏輯（背景顯示、設定、Unsplash API）
└── icons/             # 擴充功能圖示
```

### 儲存方式

| 資料 | 儲存位置 |
|------|----------|
| 設定（播放模式、間隔等） | `chrome.storage.local` |
| 媒體檔案（圖片、影片） | IndexedDB |

### 權限

此擴充功能僅需要以下權限：

- `storage` — 儲存使用者設定
- `unlimitedStorage` — 儲存上傳的媒體檔案

不需要存取瀏覽紀錄、書籤或其他敏感資料。

## 開發

### 本地開發

1. 修改程式碼後，到 `chrome://extensions/` 點擊擴充功能的 **重新載入** 按鈕
2. 開啟新分頁檢視變更

### 打包發佈

```bash
# 建立 ZIP 檔（用於上傳到 Chrome Web Store）
zip -r clean-new-tab.zip . -x ".*" -x "__MACOSX/*" -x "*.md" -x "LICENSE"
```

## License

[MIT](LICENSE)
