# 從伺服器下載到compute_upload資料夾
import requests
import os

# 設置伺服器 URL
# 取得 uploads 目錄中的所有文件
url = 'http://192.168.10.12:3000/files'
# 逐個下載文件
download_url = 'http://192.168.10.12:3000/video/'

# 設置下載目錄
download_directory = r'C:\Users\User\Desktop\testnodejs\compute_upload'

# 確保下載目錄存在，不存在則創建
os.makedirs(download_directory, exist_ok=True)

# 發送 GET 請求獲取文件列表
response = requests.get(url)

if response.status_code == 200:
    files = response.json()
    print("Files in 'uploads' directory:")
    for file in files:
        print(file)
        # 檢查文件是否已經存在
        file_path = os.path.join(download_directory, file)
        if os.path.exists(file_path) and file.endswith('.mp4'):
            print(f"Skipped {file}, already exists")
            continue
        # 下載每個文件
        file_response = requests.get(download_url + file)
        if file_response.status_code == 200:
            with open(file_path, 'wb') as f:
                f.write(file_response.content)
            print(f"Downloaded {file}")
        else:
            print(f"Failed to download {file}")
else:
    print('Failed to retrieve files')
