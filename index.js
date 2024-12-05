import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

const app = express();
app.use(express.json());

// 設定 multer 的儲存引擎，使用客戶端提供的檔案名稱
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // 使用客戶端提供的檔案名稱
  }
});

const upload = multer({ storage: storage });
const computeUpload = multer({ dest: 'compute_upload/' });

// app上傳影片用
app.post('/upload', upload.single('video'), (req, res) => {
  res.send('Video uploaded successfully');
});

// 當訪問此端點時，伺服器會執行指定的 Python 腳本來下載影片
// get_file會新增影片到本地端的compute_upload資料夾
app.post('/trigger_download', (req, res) => {
  const fileName = req.body.fileName;
  exec('python C:/Users/User/Desktop/testnodejs/get_file.py', (error, stdout, stderr) => {
    // 如果執行腳本時發生錯誤，記錄錯誤
    if (error) {
      console.error(`Error executing get_file.py script: ${error}`);
      console.error(`stderr: ${stderr}`);
      return res.status(500).send('Error executing get_file.py script');
    } else {
      // 如果腳本執行成功，記錄輸出
      console.log(`get_file.py output: ${stdout}`);
      
      // 定義第二個 Python 腳本的參數,yolo的偵測
      const secondScriptPath = 'C:/Users/User/Desktop/recognition/test/yolov7/detect.py';
      const weights = 'C:/Users/User/Desktop/recognition/test/yolov7/best_banana1.pt';
      const conf = '0.25';
      const source = `C:/Users/User/Desktop/testnodejs/compute_upload/${fileName}`;
      const device = '0';

      // 構建命令字符串,啟動選項
      const secondScriptCommand = `python ${secondScriptPath} --weights ${weights} --conf ${conf} --source ${source} --view-img --device ${device}` ;

      // 使用 exec 函數執行第二個 Python 腳本
      exec(secondScriptCommand, (error, stdout, stderr) => {
        // 如果執行腳本時發生錯誤，記錄錯誤並返回 500 錯誤響應
        if (error) {
          console.error(`Error executing detect.py script: ${error}`);
          console.error(`stderr: ${stderr}`);
          return res.status(500).send('Error executing detect.py script');
        } else {
          // 如果腳本執行成功，記錄輸出並返回 200 成功響應
          console.log(`detect.py output: ${stdout}`);
          return res.status(200).send('Download triggered and both scripts executed successfully');
        }
      });
        // 在成功返回 200 後執行第三個腳本,待驗證
        const thirdScriptCommand = `node C:/Users/User/Desktop/testnodejs/aws/new_test/up.cjs ${source}`;
        exec(thirdScriptCommand, (error, stdout, stderr) => {
          if (error) {
            console.error('失敗');
          } else {
            console.log('上傳aws完成');
            console.log(`up.cjs output: ${stdout}`);
          }
        });
    }
  });
});


//在瀏覽器上訪問http://192.168.xx.xx:300會看到的畫面，可以使用手機或本機的ipv4位址，測試用
app.get('/', (req, res) => {
  res.send('hi');
});

// get_file.py使用，獲取上傳的影片用
app.get('/video/:filename', (req, res) => {
  const filePath = path.join(process.cwd(), 'uploads', req.params.filename);
  res.sendFile(filePath);
});

// get_file.py使用，新增的路由：獲取 uploads 目錄中的所有文件
app.get('/files', (req, res) => {
  const directoryPath = path.join(process.cwd(), 'uploads');
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory');
    }
    res.json(files);
  });
});

// app點擊"播放结果"後使用，獲取runs/detect/exp中的影片
app.get('/processed_video/:filename', (req, res) => {
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

    const filePath = path.join(baseDir, maxExpDir, req.params.filename);
    res.sendFile(filePath, err => {
      if (err) {
        res.status(500).send('Error sending file');
      }
    });
  });
});


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
