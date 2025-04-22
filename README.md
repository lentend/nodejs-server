本專案為 YOLOv7 圖片/影片辨識後端伺服器，請搭配以下前端專案一併使用：  
https://github.com/lentend/banana-app.git

## 執行方式

node index.js

## 目錄結構說明

- index.js：主伺服器程式，處理上傳、辨識與 API 回應
- aws/new_test/up.cjs：上傳影片或圖片至 AWS S3 的腳本
- compute_upload/：影片上傳暫存資料夾
- image_upload/：圖片上傳暫存資料夾
- runs/detect/：YOLOv7 辨識結果輸出資料夾

注意：runs/detect 資料夾中至少需有一個 exp 子資料夾，否則某些 API 將無法正常使用

## AWS 上傳說明

請建立 .env 檔並設定以下內容以啟用 AWS S3 上傳功能：

AWS_ACCESS_KEY_ID=你的金鑰  
AWS_SECRET_ACCESS_KEY=你的密鑰  
S3_BUCKET_REGION=ap-northeast-1  
BUCKET_NAME=你的桶名稱