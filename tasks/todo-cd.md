# CD TODO: clean-new-tab

## 現狀

已有 `release.yml`：tag push 時自動建立 GitHub Release + ZIP artifact。
但尚未自動發布到 Chrome Web Store。

## 待完成

將 Release 流程延伸到自動上傳 CWS：

1. CI 測試通過
2. 打包 Extension ZIP（已完成）
3. 建立 GitHub Release（已完成）
4. **TODO**: 使用 CWS API 自動上傳新版本

## 需要的 Secrets

- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`

## 參考

- [Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api)
- 可使用 `nicolo-ribaudo/chrom-webstore-upload-action` 等現成 Action
