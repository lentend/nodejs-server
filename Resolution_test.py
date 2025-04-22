# 解析度測試
import cv2

def get_video_resolution(video_path):
    # 打開影片檔案
    video = cv2.VideoCapture(video_path)
    
    # 檢查影片是否成功打開
    if not video.isOpened():
        print("無法打開影片檔案")
        return None
    
    # 獲取影片的寬度和高度
    width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # 釋放影片物件
    video.release()
    
    return width, height

# 使用示例
video_path = r"C:\Users\User\Desktop\testnodejs\compute_upload\a774452988a8d79f99b2e521493caf78.mp4"
resolution = get_video_resolution(video_path)

if resolution:
    print(f"影片解析度: {resolution[0]}x{resolution[1]}")
else:
    print("無法獲取影片解析度")