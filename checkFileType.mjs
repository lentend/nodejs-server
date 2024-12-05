// 檔案類型測試
import { promises as fs } from 'fs';
import { fileTypeFromBuffer } from 'file-type';

const filePath = 'C:/Users/User/Desktop/testnodejs/uploads/a774452988a8d79f99b2e521493caf78';

async function checkFileType() {
  try {
    const data = await fs.readFile(filePath);
    const type = await fileTypeFromBuffer(data);

    if (type) {
      console.log(`File type: ${type.ext}`);
      console.log(`MIME type: ${type.mime}`);
    } else {
      console.log('Could not determine the file type');
    }
  } catch (error) {
    console.error('Error reading file:', error);
  }
}

checkFileType();
