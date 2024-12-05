# 檢查影片資料
import subprocess
import json

def get_ffmpeg_info(file_path):
    # Use ffprobe to get video information
    command = [
        'ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
        'stream=width,height,avg_frame_rate,duration', '-of', 'json', file_path
    ]
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    info = json.loads(result.stdout)
    width = info['streams'][0]['width']
    height = info['streams'][0]['height']
    fps_str = info['streams'][0]['avg_frame_rate']
    duration = float(info['streams'][0]['duration'])
    num, denom = map(int, fps_str.split('/'))
    fps = num / denom
    return width, height, fps, duration

def get_video_info(file_path):
    file_path = file_path.replace("\\", "/")
    
    # Get width, height, FPS, and duration using ffprobe
    width, height, fps, duration_ffmpeg = get_ffmpeg_info(file_path)
    
    # Print the information
    print(f"Resolution: {width}x{height}")
    print(f"FPS: {fps}")
    print(f"Duration: {duration_ffmpeg:.2f} seconds")

# Example usage
file_path = r'C:\Users\User\Desktop\testnodejs\compute_upload\20240801_1815.mp4'  # Replace with your video file path
get_video_info(file_path)
