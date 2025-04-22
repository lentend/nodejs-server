import express from 'express';
import multer from 'multer'; // 處理 multipart-form 的上傳
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process'; // 執行外部指令（用來呼叫 Python / .cjs 腳本）
const app = express();
app.use(express.json());

// ---------------------處理影片上傳---------------------
app.post('/upload', async (req, res) => {
  console.time('fileWrite'); // 記錄檔案寫入花費時間（log用途）
  const fileName = req.headers['x-filename']; // 從 header 中取出自定義檔案名稱
  if (!fileName) {
    return res.status(400).send('Missing file name in headers');
  }
  const uploadDir = path.resolve(process.cwd(), 'compute_upload'); // 上傳目錄
  const filePath = path.join(uploadDir, fileName); // 檔案完整路徑
  const normalizedPath = path.normalize(filePath); // 標準化路徑（處理 win/linux 差異）
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  try {
    // 建立檔案寫入串流，使用 2MB 緩衝區
    const fileStream = fs.createWriteStream(normalizedPath, { highWaterMark: 2*1024 * 1024 });
    req.pipe(fileStream); // 將前端上傳串流導入檔案中

    fileStream.on('finish', () => { // 寫入成功
      console.timeEnd('fileWrite');
      console.log(`File saved: ${normalizedPath}`);
      // 確認 MP4 檔案是否有效
      if (!fs.existsSync(normalizedPath) || fs.statSync(normalizedPath).size === 0) {
        return res.status(500).send('File write error, file is empty');
      }
      console.time('startYOLOv7');
      const secondScriptCommand = `python "C:/Users/User/Desktop/recognition/test/yolov7/detect.py" --weights "C:/Users/User/Desktop/recognition/test/yolov7/colab6.pt" --conf 0.3 --source "${normalizedPath}" --device 0 --no-trace`;
      
      // 執行 YOLOv7 Python 推論指令
      exec(secondScriptCommand, (error, stdout, stderr) => {
        console.timeEnd('startYOLOv7');
        if (error) {
          console.error(`Error executing YOLOv7 script: ${error.message}`);
          console.error(`stderr: ${stderr}`);
          return res.status(500).send('Error executing YOLOv7 script');
        }
        console.log(`YOLOv7 output: ${stdout}`);
        res.status(200).send('Video uploaded and processed');
        // 呼叫 CJS 腳本，上傳影片到 AWS S3
        const uploaderScript = path.resolve('C:/Users/User/Desktop/testnodejs/aws/new_test/up.cjs');
        const uploadCmd = `node "${uploaderScript}" "${normalizedPath}"`;
        exec(uploadCmd, (uploadErr, uploadStdout, uploadStderr) => {
          if (uploadErr) {
            console.error('S3 上傳失敗:', uploadErr.message);
            console.error('stderr:', uploadStderr);
          } else {
            console.log('S3 上傳成功:\n', uploadStdout);
          }
        });
      });
    });
    fileStream.on('error', (err) => {
      console.error('File write error:', err);
      res.status(500).send('Error writing file');
    });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).send('Error uploading video');
  }
});

// 將 HTTP 數據流轉換為 Buffer,暫時無用到,寫入速度不夠快
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []; // 暫存接收到的每個資料區塊
    stream.on('data', (chunk) => chunks.push(chunk)); // 每當有資料，就加入 chunks 陣列
    stream.on('end', () => resolve(Buffer.concat(chunks))); // 資料接收完成後，合併所有 chunks 為一個完整 Buffer 回傳
    stream.on('error', reject);
  });
}

//在瀏覽器上訪問http://192.168.xx.xx:300會看到的畫面，可以使用手機或本機的ipv4位址，測試用
app.get('/', (req, res) => {
  res.send('hi');
});

// 獲取上傳的影片用，測試用
app.get('/video/:filename', (req, res) => {
  const filePath = path.join(process.cwd(), 'uploads', req.params.filename);
  res.sendFile(filePath);
});

// 列出 uploads 目錄中的所有文件，測試用
app.get('/files', (req, res) => {
  const directoryPath = path.join(process.cwd(), 'uploads');
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory');
    }
    res.json(files);
  });
});

// 取得最大的exp檔案名稱(最新辨識的結果),用於app端歷史紀錄
app.get('/getmax_dir', (req, res) => {
  const baseDir = path.join(process.cwd(), 'runs/detect');
  // 讀取 runs/detect 下的所有檔案
  fs.readdir(baseDir, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory');
    }
    // 篩選出 'exp' 開頭的資料夾
    const expDirs = files.filter(file => fs.statSync(path.join(baseDir, file)).isDirectory() && file.startsWith('exp'));
    // 找出數字最大的 exp 資料夾
    const maxExpDir = expDirs.reduce((max, dir) => {
      const num = parseInt(dir.replace('exp', ''));
      return num > parseInt(max.replace('exp', '')) ? dir : max;
    }, 'exp0');
    if (!maxExpDir) {
      return res.status(404).send('No exp directories found');
    }
    res.send(maxExpDir); // 直接回傳最大 exp 資料夾名稱
  });
});


// app點擊"播放结果"後使用，獲取runs/detect/exp中的影片
app.get('/processed_video/:filename', (req, res) => {
  const baseDir = path.join(process.cwd(), 'runs/detect');
  
  // 讀取 baseDir 目錄中的所有檔案
  fs.readdir(baseDir, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory');
    }

    // 過濾出以 "exp" 開頭的目錄並找出最大數字的目錄
    const expDirs = files.filter(file => fs.statSync(path.join(baseDir, file)).isDirectory() && file.startsWith('exp'));
    const maxExpDir = expDirs.reduce((max, dir) => {
      const num = parseInt(dir.replace('exp', ''));
      return num > parseInt(max.replace('exp', '')) ? dir : max;
    }, 'exp0'); // 初始化為 'exp0'，假設至少有一個 exp 目錄

    const filePath = path.join(baseDir, maxExpDir, req.params.filename); // 組成完整檔案路徑
    // 回傳影片檔案
    res.sendFile(filePath, err => {
      if (err) {
        res.status(500).send('Error sending file');
      }
    });
  });
});

// 獲取 runs/detect/exp/result 中的 filename.txt 檔案數據
app.get('/processed_data/:filename', (req, res) => {
  const baseDir = path.join(process.cwd(), 'runs/detect');

  // 讀取 baseDir 目錄中的所有子目錄
  fs.readdir(baseDir, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory');
    }

    // 過濾出以 "exp" 開頭的目錄並找出最大數字的目錄
    const expDirs = files.filter(file => fs.statSync(path.join(baseDir, file)).isDirectory() && file.startsWith('exp'));
    const maxExpDir = expDirs.reduce((max, dir) => {
      const num = parseInt(dir.replace('exp', ''));
      return num > parseInt(max.replace('exp', '')) ? dir : max;
    }, 'exp0'); // 初始化為 'exp0'，假設至少有一個 exp 目錄

    // 確定目錄中的目標檔案路徑
    const filePath = path.join(baseDir, maxExpDir, 'result', req.params.filename);

    // 讀取檔案內容
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        return res.status(404).send('File not found or error reading file');
      }
      if (!data.trim()) {
        return res.send('沒有偵測到物件');
      }
      // 返回檔案內容
      res.send(data);
    });
  });
});

//--------------------------------------------------------
// 設定 multer 的儲存引擎，用於圖片的上傳
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = 'image_upload/'; // 指定圖片儲存目錄
    cb(null, folder); // 指定目錄
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // 使用原始檔案名稱（包含時間戳）
  }
});

// 使用imageStorage處理圖片上傳
const uploadPhoto = multer({ storage: imageStorage });

// 接收圖片上傳並執行 YOLOv7 分析 + 上傳到 AWS S3
app.post('/upload-photo', uploadPhoto.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No photo uploaded');
  }
  const fileName = req.file.filename; // 獲取上傳的檔案名稱
  const imgScriptPath = 'C:/Users/User/Desktop/recognition/test/yolov7/detect.py';
  const weights = 'C:/Users/User/Desktop/recognition/test/yolov7/colab6.pt';
  const conf = '0.3';
  const source = `C:/Users/User/Desktop/testnodejs/image_upload/${fileName}`;
  const device = '0';
  const imgScriptCommand = `python ${imgScriptPath} --weights ${weights} --conf ${conf} --source ${source} --device ${device} --no-trace `;
  console.log(`Photo uploaded: ${req.file.filename}`);
  console.log(`Executing Python script: ${imgScriptCommand}`);
  // 執行 YOLOv7 推論腳本
  exec(imgScriptCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing Python script: ${error.message}`);
      console.error(`stderr: ${stderr}`);
      return res.status(500).send('Error executing Python script');
    }
    console.log(`Python script output: ${stdout}`);
    res.status(200).send(`Photo uploaded and processed successfully: ${stdout}`);
    // === 成功處理並回傳200後，呼叫 CJS 腳本上傳圖片到 S3 ===
    const uploaderScript = path.resolve('C:/Users/User/Desktop/testnodejs/aws/new_test/up.cjs');
    const uploadCmd = `node "${uploaderScript}" "${source}"`; // 傳入圖片絕對路徑

    exec(uploadCmd, (uploadErr, uploadStdout, uploadStderr) => {
      if (uploadErr) {
        console.error('S3 上傳失敗:', uploadErr.message);
        console.error('stderr:', uploadStderr);
      } else {
        console.log('S3 上傳成功:\n', uploadStdout);
      }
    });
    // === 結束 S3 上傳 ===
  });
});

//--------------------------------------------------------
// 獲取runs/detect/exp中的"圖片"
app.get('/get_exp_file', (req, res) => {
  const expName = req.query.exp; // 獲取 exp 名稱
  const fileName = req.query.fileName; // 獲取檔案名稱

  // 驗證請求參數
  if (!expName || !fileName) {
    return res.status(400).send('Missing exp or fileName parameter');
  }

  if (!expName.startsWith('exp')) {
    return res.status(400).send('Invalid exp parameter');
  }

  const baseDir = path.join(process.cwd(), 'runs/detect');
  const expDir = path.join(baseDir, expName);
  const targetFile = path.join(expDir, fileName);

  // 確認 exp 資料夾是否存在
  if (!fs.existsSync(expDir) || !fs.statSync(expDir).isDirectory()) {
    return res.status(404).send('exp folder not found');
  }

  // 確認目標檔案是否存在
  if (!fs.existsSync(targetFile)) {
    return res.status(404).send('File not found in the specified exp folder');
  }

  // 返回目標檔案
  res.sendFile(targetFile, err => {
    if (err) {
      return res.status(500).send('Error sending file');
    }
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
