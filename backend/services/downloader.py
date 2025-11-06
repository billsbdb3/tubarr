import yt_dlp
import os
import json
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
    
    def download_video(self, video_id, channel_name, download_path, quality='1080p', season_number=1, episode_number=None, naming_format='standard', custom_pattern=None, season_name=None, channel_thumbnail=None):
        """
        Download with TV show structure:
        /downloads/Channel Name/Season 01/Channel Name - S01E01 - Video Title.mkv
        Season 00 = Specials (individual videos not in playlists)
        season_name = Optional custom season folder name (e.g., playlist title)
        """
        safe_channel = self._sanitize(channel_name)
        channel_dir = os.path.join(download_path, safe_channel)
        
        # Create show NFO if it doesn't exist
        self._create_show_nfo(channel_dir, channel_name, channel_thumbnail)
        
        # Season 00 = Specials folder
        if season_number == 0:
            season_dir = os.path.join(channel_dir, "Specials")
        elif season_name:
            # Use custom season name (e.g., playlist title)
            safe_season_name = self._sanitize(season_name)
            season_dir = os.path.join(channel_dir, f"Season {season_number:02d} - {safe_season_name}")
        else:
            season_dir = os.path.join(channel_dir, f"Season {season_number:02d}")
        
        os.makedirs(season_dir, exist_ok=True)
        
        # Create season NFO
        self._create_season_nfo(season_dir, season_number, season_name or f"Season {season_number}")
        
        # Use episode number or default to 1
        ep_num = episode_number or 1
        
        # Naming formats
        if naming_format == 'custom' and custom_pattern:
            # Parse custom pattern: {channel} - S{season:00}E{episode:000} - {title}
            pattern = custom_pattern
            pattern = pattern.replace('{channel}', safe_channel)
            pattern = pattern.replace('{season:00}', f'{season_number:02d}')
            pattern = pattern.replace('{season}', str(season_number))
            pattern = pattern.replace('{episode:000}', f'{ep_num:03d}')
            pattern = pattern.replace('{episode:00}', f'{ep_num:02d}')
            pattern = pattern.replace('{episode}', str(ep_num))
            pattern = pattern.replace('{title}', '%(title)s')
            pattern = pattern.replace('{id}', '%(id)s')
            pattern = pattern.replace('{date}', '%(upload_date)s')
            output_template = os.path.join(season_dir, f"{pattern}.%(ext)s")
        else:
            formats = {
                'standard': f"{safe_channel} - S{season_number:02d}E{ep_num:03d} - %(title)s.%(ext)s",
                'scene': f"{safe_channel}.S{season_number:02d}E{ep_num:03d}.%(title)s.%(ext)s",
                'plex': f"{safe_channel} - s{season_number:02d}e{ep_num:03d} - %(title)s.%(ext)s"
            }
            output_template = os.path.join(season_dir, formats.get(naming_format, formats['standard']))
        
        ydl_opts = {
            'format': self.QUALITY_MAP.get(quality, self.QUALITY_MAP['1080p']),
            'outtmpl': output_template,
            'merge_output_format': 'mkv',
            'writethumbnail': True,
            'writeinfojson': True,
            'writedescription': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en'],
            'postprocessors': [
                {'key': 'FFmpegMetadata'},
                {'key': 'EmbedThumbnail'},
                {'key': 'FFmpegEmbedSubtitle'}
            ]
        }
        
        url = f'https://www.youtube.com/watch?v={video_id}'
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            
            # Create NFO file for media servers
            self._create_nfo(info, season_dir, safe_channel, season_number, episode_number or 1)
            
            # Download episode thumbnail for media servers
            # Media servers look for: filename.jpg (same as video but .jpg extension)
            if info.get('thumbnail'):
                # Get the base filename without extension
                base_filename = os.path.splitext(filename)[0]
                thumb_path = f"{base_filename}.jpg"
                self._download_image(info['thumbnail'], thumb_path)
            
            return filename
    
    def _create_nfo(self, info, season_dir, channel_name, season_num, episode_num):
        """Create NFO file compatible with Jellyfin/Plex/Emby"""
        upload_date = info.get('upload_date', '')
        aired = f"{upload_date[:4]}-{upload_date[4:6]}-{upload_date[6:8]}" if upload_date else ''
        
        nfo_content = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<episodedetails>
    <title>{self._escape_xml(info.get('title', ''))}</title>
    <showtitle>{self._escape_xml(channel_name)}</showtitle>
    <season>{season_num}</season>
    <episode>{episode_num}</episode>
    <plot>{self._escape_xml(info.get('description', ''))}</plot>
    <aired>{aired}</aired>
    <studio>{self._escape_xml(info.get('uploader', ''))}</studio>
    <thumb>{info.get('thumbnail', '')}</thumb>
    <runtime>{info.get('duration', 0)}</runtime>
    <uniqueid type="youtube">{info.get('id', '')}</uniqueid>
</episodedetails>"""
        
        safe_title = self._sanitize(info.get('title', 'video'))
        nfo_path = os.path.join(season_dir, f"{channel_name} - S{season_num:02d}E{episode_num:03d} - {safe_title}.nfo")
        
        with open(nfo_path, 'w', encoding='utf-8') as f:
            f.write(nfo_content)
    
    def _create_show_nfo(self, channel_dir, channel_name, channel_thumbnail=None):
        """Create tvshow.nfo for the channel/show"""
        nfo_path = os.path.join(channel_dir, 'tvshow.nfo')
        if os.path.exists(nfo_path):
            return  # Don't overwrite existing
        
        os.makedirs(channel_dir, exist_ok=True)
        
        nfo_content = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<tvshow>
    <title>{self._escape_xml(channel_name)}</title>
    <originaltitle>{self._escape_xml(channel_name)}</originaltitle>
    <showtitle>{self._escape_xml(channel_name)}</showtitle>
    <plot>YouTube channel: {self._escape_xml(channel_name)}</plot>
    <studio>YouTube</studio>
    <genre>YouTube</genre>
    <premiered>{datetime.now().strftime('%Y-%m-%d')}</premiered>
</tvshow>"""
        
        with open(nfo_path, 'w', encoding='utf-8') as f:
            f.write(nfo_content)
        
        # Download channel poster
        if channel_thumbnail:
            self._download_image(channel_thumbnail, os.path.join(channel_dir, 'poster.jpg'))
    
    def _create_season_nfo(self, season_dir, season_num, season_title):
        """Create season.nfo for the season/playlist"""
        nfo_path = os.path.join(season_dir, 'season.nfo')
        if os.path.exists(nfo_path):
            return  # Don't overwrite existing
        
        nfo_content = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<season>
    <title>{self._escape_xml(season_title)}</title>
    <seasonnumber>{season_num}</seasonnumber>
    <plot>{self._escape_xml(season_title)}</plot>
</season>"""
        
        with open(nfo_path, 'w', encoding='utf-8') as f:
            f.write(nfo_content)
    
    def download_season_poster(self, season_dir, thumbnail_url):
        """Download season poster/thumbnail"""
        if not thumbnail_url:
            return
        
        poster_path = os.path.join(season_dir, 'poster.jpg')
        if os.path.exists(poster_path):
            return  # Don't overwrite
        
        self._download_image(thumbnail_url, poster_path)
    
    def _download_image(self, url, path):
        """Download image from URL"""
        if not url or os.path.exists(path):
            return
        
        try:
            import requests
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                with open(path, 'wb') as f:
                    f.write(response.content)
        except Exception as e:
            print(f"Failed to download image: {e}")
    
    def _sanitize(self, name):
        """Remove invalid filesystem characters"""
        invalid = '<>:"/\\|?*'
        for char in invalid:
            name = name.replace(char, '')
        return name.strip()
    
    def _escape_xml(self, text):
        """Escape XML special characters"""
        if not text:
            return ''
        return str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&apos;')
