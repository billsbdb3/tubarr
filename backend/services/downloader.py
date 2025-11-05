import yt_dlp
import os
from datetime import datetime

class Downloader:
    QUALITY_MAP = {
        '2160p': 'bestvideo[height<=2160]+bestaudio/best[height<=2160]',
        '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
        '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
        '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
        'best': 'bestvideo+bestaudio/best'
    }
    
    def get_channel_info(self, channel_url):
        ydl_opts = {'quiet': True, 'extract_flat': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(channel_url, download=False)
            thumbnail = None
            if info.get('thumbnails'):
                thumbnail = info['thumbnails'][-1].get('url')
            return {
                'channel_id': info.get('channel_id'),
                'channel_name': info.get('channel'),
                'url': info.get('channel_url'),
                'thumbnail': thumbnail
            }
    
    def download_video(self, video_id, channel_name, download_path, quality='1080p'):
        output_path = os.path.join(download_path, channel_name)
        os.makedirs(output_path, exist_ok=True)
        
        ydl_opts = {
            'format': self.QUALITY_MAP.get(quality, self.QUALITY_MAP['1080p']),
            'outtmpl': os.path.join(output_path, '%(title)s [%(id)s].%(ext)s'),
            'merge_output_format': 'mkv',
        }
        
        url = f'https://www.youtube.com/watch?v={video_id}'
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            return filename
