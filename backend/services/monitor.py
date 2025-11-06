import yt_dlp
from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import Channel, Video
from backend.services.downloader import Downloader

class Monitor:
    def __init__(self, db: Session):
        self.db = db
        self.downloader = Downloader()
    
    def get_channel_videos(self, channel: Channel, limit=None):
        ydl_opts = {'quiet': True, 'extract_flat': True}
        if limit:
            ydl_opts['playlistend'] = limit
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f'https://www.youtube.com/channel/{channel.channel_id}/videos', download=False)
            
            videos = []
            if 'entries' in info:
                for entry in info['entries']:
                    if entry:
                        videos.append({
                            'video_id': entry.get('id'),
                            'title': entry.get('title'),
                            'upload_date': entry.get('upload_date'),
                            'duration': entry.get('duration'),
                            'view_count': entry.get('view_count')
                        })
            return videos
    
    def get_channel_playlists(self, channel: Channel):
        ydl_opts = {'quiet': True, 'extract_flat': True}
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f'https://www.youtube.com/channel/{channel.channel_id}/playlists', download=False)
            
            playlists = []
            if 'entries' in info:
                for entry in info['entries']:
                    if entry:
                        playlists.append({
                            'playlist_id': entry.get('id'),
                            'title': entry.get('title'),
                            'video_count': entry.get('playlist_count') or entry.get('entry_count', 0)
                        })
            return playlists
    
    def get_playlist_videos(self, playlist_url):
        ydl_opts = {'quiet': True, 'extract_flat': True}
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(playlist_url, download=False)
            
            videos = []
            if 'entries' in info:
                for entry in info['entries']:
                    if entry:
                        videos.append({
                            'video_id': entry.get('id'),
                            'title': entry.get('title'),
                            'playlist_id': info.get('id')
                        })
            return videos
    
    def check_channel(self, channel: Channel):
        videos_data = self.get_channel_videos(channel)
        
        new_videos = []
        for vid_data in videos_data:
            video_id = vid_data['video_id']
            existing = self.db.query(Video).filter_by(video_id=video_id).first()
            
            if not existing:
                video = Video(
                    video_id=video_id,
                    channel_id=channel.id,
                    title=vid_data['title'],
                    publish_date=datetime.now()
                )
                self.db.add(video)
                new_videos.append(video)
        
        if new_videos:
            self.db.commit()
            channel.last_sync = datetime.utcnow()
            self.db.commit()
        
        return new_videos
    
    def check_all_channels(self):
        channels = self.db.query(Channel).filter_by(monitored=True).all()
        all_new = []
        
        for channel in channels:
            new_videos = self.check_channel(channel)
            for video in new_videos:
                try:
                    # Assign episode number
                    if not video.episode_number:
                        video.episode_number = self.db.query(Video).filter_by(channel_id=channel.id).count()
                        self.db.commit()
                    
                    path = self.downloader.download_video(
                        video.video_id,
                        channel.channel_name,
                        channel.download_path,
                        channel.quality,
                        video.season_number,
                        video.episode_number,
                        'standard'
                    )
                    video.downloaded = True
                    video.download_path = path
                    self.db.commit()
                    all_new.append(video)
                except Exception as e:
                    print(f"Error downloading {video.title}: {e}")
        
        return all_new
