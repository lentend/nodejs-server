// 引入 dotenv 和 AWS SDK
require('dotenv').config({ path: 'c:/Users/User/Desktop/testnodejs/aws/new_test/.env' });
const fs = require('fs'); // 用於讀取本地檔案
const AWS = require('aws-sdk');
const path = require('path'); // 用於處理檔案路徑

// 初始化 S3 設定
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.S3_BUCKET_REGION,
});

// 格式化檔案路徑函式：將所有反斜線 "\" 替換為正斜線 "/"
function formatFilePath(inputPath) {
  return inputPath.replace(/\\/g, "/");
}

//接收來自命令行的參數，新路徑用
const filePathFromArgs = process.argv[2]; // 第三個參數是文件路徑

if (!filePathFromArgs) {
  console.error("請提供檔案路徑作為參數");
  process.exit(1);
}

const filePath = formatFilePath(filePathFromArgs);


// 上傳函式：接受一個 `filePath` 作為參數來指定上傳的檔案路徑
function uploadFile(filePath) {
  if (!process.env.BUCKET_NAME) {
    console.error("Bucket Name 未設定，請檢查 .env 檔案中的 BUCKET_NAME 是否正確設定。");
    return;
  }

  // 檢查檔案路徑是否存在
  if (!fs.existsSync(filePath)) {
    console.error("指定的檔案路徑不存在: ", filePath);
    return;
  }

  // 讀取本地檔案
  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath); // 取得檔案名稱（含副檔名）
  const fileExtension = path.extname(fileName); // 取得檔案副檔名（如 .jpg, .mp4）

  // 設定 S3 中儲存檔案的路徑（images/xxx.jpg 或 images/xxx.mp4）
  const s3Key = `images/${fileName}`;  // 使用檔案的原名稱

  // 根據副檔名自動判斷檔案類型
  const contentType = fileExtension === '.mp4' ? 'video/mp4' : 'image/jpeg';

  // 先檢查檔案是否已存在於 S3
  const headParams = {
    Bucket: process.env.BUCKET_NAME,
    Key: s3Key
  };

  s3.headObject(headParams, (err, data) => {
    if (err && err.code === 'NotFound') {
      // 檔案不存在，執行上傳
      console.log("檔案不存在，開始上傳...");

      const uploadParams = {
        Bucket: process.env.BUCKET_NAME,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType
      };

      s3.upload(uploadParams, (uploadErr, uploadData) => {
        if (uploadErr) {
          console.error("上傳失敗: ", uploadErr);
        } else {
          console.log(`上傳成功！檔案位於: ${uploadData.Location}`);
        }
      });
    } else if (err) {
      console.error("檢查檔案時發生錯誤: ", err);
    } else {
      // 檔案已存在，跳過上傳
      console.log("檔案已存在於 S3，跳過上傳: ", s3Key);
    }
  });
}

/* 呼叫 `uploadFile` 函式時傳入檔案路徑作為參數，原路徑
const filePathFromOtherModule = formatFilePath('C:/Users/User/Desktop/banana_day7.mp4'); // 從其他檔案傳入的路徑
uploadFile(filePathFromOtherModule);*/

/* 呼叫 `uploadFile` 函式時傳入檔案路徑作為參數，新路徑*/
uploadFile(filePath);
