from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
import yt_dlp
import requests
import os
import glob
import json

from backend.models import Base, Channel, Video, History, Playlist
from backend.services.downloader import Downloader
from backend.services.monitor import Monitor

app = FastAPI(title="Tubarr", version="1.0.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use environment variable for config path
CONFIG_PATH = os.getenv('TUBARR_CONFIG_PATH', 'data')
os.makedirs(CONFIG_PATH, exist_ok=True)

# Mount static files from frontend build
STATIC_DIR = os.getenv('STATIC_DIR', '/app/frontend/build')
if os.path.exists(os.path.join(STATIC_DIR, 'static')):
    app.mount("/static", StaticFiles(directory=os.path.join(STATIC_DIR, 'static')), name="static")

engine = create_engine(f'sqlite:///{CONFIG_PATH}/tubarr.db')
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_next_season_number(db: Session, channel_id: int):
    """Get next available season number, reusing deleted season numbers"""
    existing_seasons = db.query(Playlist.season_number).filter_by(channel_id=channel_id).order_by(Playlist.season_number).all()
    existing_numbers = [s[0] for s in existing_seasons]
    
    # Find first gap in season numbers
    for i in range(1, len(existing_numbers) + 2):
        if i not in existing_numbers:
            return i
    
    return 1  # Fallback

def background_download(video_id: str, channel_id: int):
    db = SessionLocal()
    try:
        video = db.query(Video).filter_by(video_id=video_id, channel_id=channel_id).first()
        if not video:
            ydl_opts = {'quiet': True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)
                video = Video(
                    video_id=video_id,
                    channel_id=channel_id,
                    title=info.get('title', 'Unknown'),
                    publish_date=datetime.now(),
                    download_status='downloading',
                    season_number=0  # Default to Season 00 for individual videos
                )
                db.add(video)
                db.commit()
        else:
            video.download_status = 'downloading'
            db.commit()
        
        # Check if video belongs to any monitored playlists
        monitored_playlists = db.query(Playlist).filter_by(channel_id=channel_id, monitored=True).all()
        assigned_to_playlist = False
        playlist_title = None
        
        for playlist in monitored_playlists:
            # Check if video is in this playlist
            monitor = Monitor(db)
            playlist_videos = monitor.get_playlist_videos(f'https://www.youtube.com/playlist?list={playlist.playlist_id}')
            video_ids_in_playlist = [v['video_id'] for v in playlist_videos]
            
            if video_id in video_ids_in_playlist:
                # Find episode number in playlist
                episode_num = next((i+1 for i, v in enumerate(playlist_videos) if v['video_id'] == video_id), 1)
                video.season_number = playlist.season_number
                video.episode_number = episode_num
                video.playlist_id = playlist.playlist_id
                playlist_title = playlist.title
                assigned_to_playlist = True
                db.commit()
                break
        
        # If not in any playlist, assign to Season 00 with sequential episode number
        if not assigned_to_playlist and not video.episode_number:
            video.season_number = 0
            video.episode_number = db.query(Video).filter_by(channel_id=channel_id, season_number=0).count()
            db.commit()
        
        channel = db.query(Channel).filter_by(id=channel_id).first()
        settings = get_settings()
        downloader = Downloader()
        
        path = downloader.download_video(
            video_id,
            channel.channel_name,
            channel.download_path or settings.get('defaultPath', '/downloads'),
            channel.quality,
            video.season_number,
            video.episode_number,
            settings.get('namingFormat', 'standard'),
            settings.get('customNaming'),
            playlist_title,  # Pass playlist title as season name
            channel.thumbnail  # Pass channel thumbnail
        )
        
        video.downloaded = True
        video.download_path = path
        video.download_status = 'completed'
        db.commit()
    except Exception as e:
        if video:
            video.download_status = 'failed'
            db.commit()
        print(f"Download failed: {e}")
    finally:
        db.close()

# Pydantic models
class ChannelCreate(BaseModel):
    channel_url: str
    download_path: str
    quality: str = '1080p'
    monitored: bool = True
    download_all: bool = False

class ChannelResponse(BaseModel):
    id: int
    channel_name: str
    channel_url: str
    channel_id: str
    thumbnail: Optional[str] = None
    monitored: bool
    quality: str
    added: datetime
    
    class Config:
        from_attributes = True

class VideoResponse(BaseModel):
    id: int
    video_id: str
    title: str
    publish_date: Optional[datetime]
    downloaded: bool
    channel_id: int
    
    class Config:
        from_attributes = True

class SearchResult(BaseModel):
    channel_id: str
    channel_name: str
    channel_url: str
    subscriber_count: Optional[int] = None

# API Routes
@app.get("/api/v1/search")
def search_channels(query: str):
    ydl_opts = {'quiet': True, 'extract_flat': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        # Search for channels directly
        results = ydl.extract_info(f'ytsearch20:channel {query}', download=False)
        channels = []
        seen = set()
        
        if 'entries' in results:
            for entry in results['entries']:
                if not entry:
                    continue
                channel_id = entry.get('channel_id')
                if channel_id and channel_id not in seen:
                    seen.add(channel_id)
                    channels.append({
                        'channel_id': channel_id,
                        'channel_name': entry.get('channel'),
                        'channel_url': entry.get('channel_url'),
                        'subscriber_count': entry.get('channel_follower_count'),
                        'thumbnail': None
                    })
        
        return channels[:15]

@app.get("/api/v1/channel/info/{channel_id}")
def get_channel_info(channel_id: str):
    ydl_opts = {'quiet': True, 'extract_flat': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            # Get channel page
            info = ydl.extract_info(f'https://www.youtube.com/channel/{channel_id}', download=False)
            
            # Get videos tab to count videos
            video_count = None
            try:
                videos_info = ydl.extract_info(f'https://www.youtube.com/channel/{channel_id}/videos', download=False)
                if videos_info:
                    video_count = videos_info.get('playlist_count') or len(videos_info.get('entries', []))
            except:
                pass
            
            if info:
                return {
                    "thumbnail": info.get('thumbnails', [{}])[-1].get('url') if info.get('thumbnails') else None,
                    "subscriber_count": info.get('channel_follower_count'),
                    "video_count": video_count,
                    "description": info.get('description', '')
                }
        except:
            pass
    return {}

@app.get("/api/v1/proxy/image")
def proxy_image(url: str):
    try:
        response = requests.get(url, timeout=5)
        return Response(content=response.content, media_type=response.headers.get('content-type', 'image/jpeg'))
    except:
        raise HTTPException(404, "Image not found")

@app.get("/api/v1/preview/channel/{channel_id}")
def preview_channel(channel_id: str):
    ydl_opts = {'quiet': True, 'extract_flat': True, 'playlistend': 12}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f'https://www.youtube.com/channel/{channel_id}/videos', download=False)
        
        videos = []
        if 'entries' in info:
            for entry in info['entries']:
                if entry:
                    videos.append({
                        'video_id': entry.get('id'),
                        'title': entry.get('title'),
                        'thumbnail': f"https://i.ytimg.com/vi/{entry.get('id')}/mqdefault.jpg"
                    })
        
        return {
            'channel_id': channel_id,
            'channel_name': info.get('channel', info.get('uploader', 'Unknown')),
            'videos': videos
        }

@app.get("/api/v1/channel")
def get_channels(db: Session = Depends(get_db)):
    channels = db.query(Channel).all()
    result = []
    for ch in channels:
        video_count = db.query(Video).filter_by(channel_id=ch.id).count()
        downloaded_count = db.query(Video).filter_by(channel_id=ch.id, downloaded=True).count()
        
        ch_dict = {
            'id': ch.id,
            'channel_name': ch.channel_name,
            'channel_url': ch.channel_url,
            'channel_id': ch.channel_id,
            'monitored': ch.monitored,
            'quality': ch.quality,
            'added': ch.added,
            'thumbnail': ch.thumbnail,
            'video_count': video_count,
            'downloaded_count': downloaded_count
        }
        result.append(ch_dict)
    return result

@app.get("/api/v1/channel/{channel_id}")
def get_channel_detail(channel_id: int, limit: int = 25, offset: int = 0, sort: str = 'date_desc', filter: str = 'all', db: Session = Depends(get_db)):
    channel = db.query(Channel).filter_by(id=channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    # Build query
    query = db.query(Video).filter_by(channel_id=channel_id)
    
    # Apply filters
    if filter == 'downloaded':
        query = query.filter_by(downloaded=True)
    elif filter == 'available':
        query = query.filter_by(downloaded=False)
    
    # Apply sorting
    if sort == 'date_desc':
        query = query.order_by(Video.publish_date.desc())
    elif sort == 'date_asc':
        query = query.order_by(Video.publish_date.asc())
    elif sort == 'title':
        query = query.order_by(Video.title)
    
    # Get total count
    total_count = query.count()
    
    # Apply pagination
    db_videos = query.limit(limit).offset(offset).all()
    
    videos = []
    for v in db_videos:
        videos.append({
            'video_id': v.video_id,
            'title': v.title,
            'downloaded': bool(v.downloaded),
            'thumbnail': f"https://i.ytimg.com/vi/{v.video_id}/mqdefault.jpg",
            'duration': v.duration,
            'view_count': None
        })
    
    downloaded_count = db.query(Video).filter_by(channel_id=channel_id, downloaded=True).count()
    
    return {
        "channel": channel,
        "videos": videos,
        "total_videos": total_count,
        "loaded_videos": len(videos),
        "downloaded_count": downloaded_count,
        "has_more": (offset + len(videos)) < total_count
    }

@app.get("/api/v1/channel/{channel_id}/playlists")
def get_channel_playlists(channel_id: int, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter_by(id=channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    ydl_opts = {'quiet': True, 'extract_flat': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f'https://www.youtube.com/channel/{channel.channel_id}/playlists', download=False)
        
        playlists = []
        if 'entries' in info:
            for entry in info['entries']:
                if entry:
                    count = 0
                    downloaded_count = 0
                    try:
                        pl_info = ydl.extract_info(f'https://www.youtube.com/playlist?list={entry.get("id")}', download=False)
                        count = pl_info.get('playlist_count', len(pl_info.get('entries', [])))
                        
                        # Get actual video IDs from playlist and check if downloaded
                        if pl_info.get('entries'):
                            video_ids = [v.get('id') for v in pl_info['entries'] if v and v.get('id')]
                            downloaded_count = db.query(Video).filter(
                                Video.video_id.in_(video_ids),
                                Video.downloaded == True
                            ).count()
                    except:
                        pass
                    
                    # Check if monitored
                    pl_db = db.query(Playlist).filter_by(playlist_id=entry.get('id')).first()
                    monitored = pl_db.monitored if pl_db else False
                    
                    playlists.append({
                        'playlist_id': entry.get('id'),
                        'title': entry.get('title'),
                        'video_count': count,
                        'monitored': monitored,
                        'downloaded_count': downloaded_count
                    })
        return playlists

@app.get("/api/v1/playlist/{playlist_id}")
def get_playlist_videos(playlist_id: str, db: Session = Depends(get_db)):
    monitor = Monitor(db)
    videos = monitor.get_playlist_videos(f'https://www.youtube.com/playlist?list={playlist_id}')
    
    # Enrich with database info
    result = []
    for vid in videos:
        db_video = db.query(Video).filter_by(video_id=vid['video_id']).first()
        result.append({
            'video_id': vid['video_id'],
            'title': vid['title'],
            'playlist_id': vid['playlist_id'],
            'duration': db_video.duration if db_video else None,
            'downloaded': db_video.downloaded if db_video else False
        })
    
    return result

@app.post("/api/v1/playlist/{playlist_id}/monitor")
async def monitor_playlist(
    background_tasks: BackgroundTasks,
    playlist_id: str, 
    channel_id: int, 
    download_all: bool = True,
    db: Session = Depends(get_db)
):
    channel = db.query(Channel).filter_by(id=channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    # Check if already monitored
    existing = db.query(Playlist).filter_by(playlist_id=playlist_id).first()
    if existing:
        existing.monitored = True
        db.commit()
        return {"status": "already_monitored"}
    
    # Get playlist info
    monitor = Monitor(db)
    ydl_opts = {'quiet': True, 'extract_flat': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f'https://www.youtube.com/playlist?list={playlist_id}', download=False)
        
        playlist = Playlist(
            playlist_id=playlist_id,
            channel_id=channel_id,
            title=info.get('title'),
            monitored=True,
            download_path=channel.download_path,
            quality=channel.quality,
            season_number=get_next_season_number(db, channel_id)
        )
        db.add(playlist)
        db.commit()
        
        # Download all videos in playlist if requested
        if download_all and background_tasks:
            background_tasks.add_task(download_playlist_videos, playlist_id, channel_id)
        
        return {"status": "monitoring", "playlist_id": playlist_id, "downloading": download_all}

@app.post("/api/v1/playlist/{playlist_id}/unmonitor")
def unmonitor_playlist(playlist_id: str, db: Session = Depends(get_db)):
    playlist = db.query(Playlist).filter_by(playlist_id=playlist_id).first()
    if playlist:
        playlist.monitored = False
        db.commit()
    return {"status": "unmonitored"}

def download_playlist_videos(playlist_id: str, channel_id: int):
    db = SessionLocal()
    try:
        print(f"Starting playlist download: {playlist_id} for channel {channel_id}")
        channel = db.query(Channel).filter_by(id=channel_id).first()
        playlist = db.query(Playlist).filter_by(playlist_id=playlist_id).first()
        if not channel or not playlist:
            print(f"ERROR: Channel or playlist not found. Channel: {channel}, Playlist: {playlist}")
            return
        
        print(f"Fetching videos for playlist: {playlist.title}")
        monitor = Monitor(db)
        videos = monitor.get_playlist_videos(f'https://www.youtube.com/playlist?list={playlist_id}')
        print(f"Found {len(videos)} videos in playlist")
        
        settings = get_settings()
        downloader = Downloader()
        
        # Get playlist thumbnail from first video
        playlist_thumbnail = None
        if videos and len(videos) > 0:
            first_video_id = videos[0].get('video_id')
            if first_video_id:
                playlist_thumbnail = f"https://i.ytimg.com/vi/{first_video_id}/maxresdefault.jpg"
        
        downloaded_count = 0
        skipped_count = 0
        failed_count = 0
        
        for idx, vid in enumerate(videos, 1):
            # Skip if video_id is None (unavailable/hidden videos)
            if not vid.get('video_id'):
                print(f"Skipping unavailable video at position {idx}")
                skipped_count += 1
                continue
            
            video = db.query(Video).filter_by(video_id=vid['video_id']).first()
            if not video:
                video = Video(
                    video_id=vid['video_id'],
                    channel_id=channel_id,
                    title=vid.get('title', 'Unknown'),
                    publish_date=datetime.now(),
                    season_number=playlist.season_number,
                    episode_number=idx,
                    playlist_id=playlist_id
                )
                db.add(video)
                db.commit()
            
            if not video.downloaded:
                try:
                    print(f"Downloading video {idx}/{len(videos)}: {video.title}")
                    video.download_status = 'downloading'
                    db.commit()
                    
                    path = downloader.download_video(
                        video.video_id,
                        channel.channel_name,
                        playlist.download_path or settings.get('defaultPath', '/downloads'),
                        playlist.quality,
                        playlist.season_number,
                        idx,
                        settings.get('namingFormat', 'standard'),
                        settings.get('customNaming'),
                        playlist.title,  # Pass playlist title as season name
                        channel.thumbnail  # Pass channel thumbnail
                    )
                    
                    video.downloaded = True
                    video.download_path = path
                    video.download_status = 'completed'
                    db.commit()
                    downloaded_count += 1
                    print(f"Successfully downloaded: {video.title}")
                    
                    # Download season poster on first video
                    if idx == 1 and playlist_thumbnail:
                        import os
                        season_dir = os.path.dirname(path)
                        downloader.download_season_poster(season_dir, playlist_thumbnail)
                    
                except Exception as e:
                    video.download_status = 'failed'
                    db.commit()
                    failed_count += 1
                    print(f"ERROR downloading {video.title}: {str(e)}")
                    import traceback
                    traceback.print_exc()
        
        print(f"Playlist download complete. Downloaded: {downloaded_count}, Skipped: {skipped_count}, Failed: {failed_count}")
    except Exception as e:
        print(f"FATAL ERROR in download_playlist_videos: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

@app.post("/api/v1/channel", response_model=ChannelResponse)
def add_channel(channel: ChannelCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    downloader = Downloader()
    info = downloader.get_channel_info(channel.channel_url)
    
    # Get full channel info including description
    ydl_opts = {'quiet': True, 'extract_flat': True}
    description = None
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            ch_info = ydl.extract_info(channel.channel_url, download=False)
            description = ch_info.get('description', '')
        except:
            pass
    
    new_channel = Channel(
        channel_url=channel.channel_url,
        channel_id=info['channel_id'],
        channel_name=info['channel_name'],
        thumbnail=info.get('thumbnail'),
        description=description,
        download_path=channel.download_path,
        quality=channel.quality,
        monitored=channel.monitored
    )
    
    db.add(new_channel)
    db.commit()
    db.refresh(new_channel)
    
    # Fetch all videos in background
    background_tasks.add_task(fetch_channel_videos, new_channel.id)
    
    return new_channel

def fetch_channel_videos(channel_id: int):
    db = SessionLocal()
    try:
        channel = db.query(Channel).filter_by(id=channel_id).first()
        if not channel:
            return
        
        monitor = Monitor(db)
        videos = monitor.get_channel_videos(channel, limit=None)
        for vid in videos:
            existing = db.query(Video).filter_by(video_id=vid['video_id']).first()
            if not existing:
                video = Video(
                    video_id=vid['video_id'],
                    channel_id=channel.id,
                    title=vid['title'],
                    publish_date=datetime.now(),
                    download_status='available',
                    duration=vid.get('duration')
                )
                db.add(video)
            else:
                # Update existing video with duration if missing
                if not existing.duration and vid.get('duration'):
                    existing.duration = vid.get('duration')
        db.commit()
    finally:
        db.close()

@app.post("/api/v1/channel/{channel_id}/sync")
def sync_channel(channel_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter_by(id=channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    background_tasks.add_task(fetch_channel_videos, channel_id)
    return {"status": "syncing"}

@app.delete("/api/v1/channel/{channel_id}")
def delete_channel(channel_id: int, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter_by(id=channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    # Delete all videos for this channel
    db.query(Video).filter_by(channel_id=channel_id).delete()
    
    # Delete the channel
    db.delete(channel)
    db.commit()
    return {"status": "deleted"}

@app.patch("/api/v1/channel/{channel_id}/monitor")
def toggle_monitor(channel_id: int, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter_by(id=channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
    channel.monitored = not channel.monitored
    db.commit()
    return {"monitored": channel.monitored}

@app.get("/api/v1/video", response_model=List[VideoResponse])
def get_videos(db: Session = Depends(get_db)):
    return db.query(Video).filter(Video.channel_id.isnot(None)).order_by(Video.publish_date.desc()).all()

@app.post("/api/v1/video/{video_id}/download")
def download_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter_by(id=video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    channel = db.query(Channel).filter_by(id=video.channel_id).first()
    downloader = Downloader()
    
    try:
        path = downloader.download_video(
            video.video_id,
            channel.channel_name,
            channel.download_path,
            channel.quality
        )
        video.downloaded = True
        video.download_path = path
        db.commit()
        return {"status": "success", "path": path}
    except Exception as e:
        raise HTTPException(500, str(e))

class VideoDownloadRequest(BaseModel):
    channel_id: int

@app.post("/api/v1/video/download/{youtube_video_id}")
def download_video_by_id(youtube_video_id: str, request: VideoDownloadRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter_by(id=request.channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    video = db.query(Video).filter_by(video_id=youtube_video_id, channel_id=channel.id).first()
    if not video:
        video = Video(
            video_id=youtube_video_id,
            channel_id=channel.id,
            title="Fetching info...",
            publish_date=datetime.now(),
            download_status='queued'
        )
        db.add(video)
        db.commit()
    else:
        video.download_status = 'queued'
        db.commit()
    
    background_tasks.add_task(background_download, youtube_video_id, channel.id)
    return {"status": "queued", "message": "Download started in background"}

@app.delete("/api/v1/video/{video_id}")
def delete_video(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter_by(video_id=video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    # Delete file from disk if it exists
    if video.download_path and os.path.exists(video.download_path):
        try:
            os.remove(video.download_path)
        except Exception as e:
            print(f"Failed to delete file: {e}")
    
    # Delete from database completely
    db.delete(video)
    db.commit()
    
    return {"status": "deleted"}

@app.post("/api/v1/command/sync")
def sync_channels(db: Session = Depends(get_db)):
    monitor = Monitor(db)
    new_videos = monitor.check_all_channels()
    return {"status": "success", "new_videos": len(new_videos)}

@app.get("/api/v1/system/status")
def system_status(db: Session = Depends(get_db)):
    channel_count = db.query(Channel).count()
    video_count = db.query(Video).count()
    downloaded_count = db.query(Video).filter_by(downloaded=True).count()
    
    # Get yt-dlp version
    try:
        ytdlp_version = yt_dlp.version.__version__
    except:
        ytdlp_version = "unknown"
    
    return {
        "channels": channel_count,
        "videos": video_count,
        "downloaded": downloaded_count,
        "ytdlp_version": ytdlp_version,
        "app_version": "1.0.2"
    }

@app.get("/api/v1/settings")
def get_settings():
    settings_file = f'{CONFIG_PATH}/settings.json'
    if os.path.exists(settings_file):
        with open(settings_file, 'r') as f:
            return json.load(f)
    return {
        "apiKey": "",
        "defaultPath": os.getenv('TUBARR_DOWNLOADS_PATH', '/downloads'),
        "defaultQuality": "1080p",
        "autoSync": False,
        "syncInterval": 15,
        "theme": "dark",
        "namingFormat": "standard",
        "customNaming": "{channel} - S{season:00}E{episode:000} - {title}"
    }

@app.post("/api/v1/settings")
def save_settings(settings: dict):
    settings_file = f'{CONFIG_PATH}/settings.json'
    with open(settings_file, 'w') as f:
        json.dump(settings, f, indent=2)
    return {"status": "saved"}

@app.post("/api/v1/settings/generate-key")
def generate_api_key():
    import secrets
    api_key = secrets.token_urlsafe(32)
    settings = get_settings()
    settings['apiKey'] = api_key
    save_settings(settings)
    return {"apiKey": api_key}

@app.post("/api/v1/command/rescan")
def rescan_files(db: Session = Depends(get_db)):
    """Scan download folders and update database with actual file status"""
    channels = db.query(Channel).all()
    updated = 0
    imported = 0
    
    for channel in channels:
        channel_folder = os.path.join(channel.download_path, channel.channel_name)
        
        # Get all video files in channel folder
        video_files = []
        if os.path.exists(channel_folder):
            video_files = glob.glob(os.path.join(channel_folder, "*.mkv")) + \
                         glob.glob(os.path.join(channel_folder, "*.mp4")) + \
                         glob.glob(os.path.join(channel_folder, "*.webm"))
        
        # Get all videos for this channel
        db_videos = db.query(Video).filter_by(channel_id=channel.id).all()
        
        if not video_files:
            # No files exist - mark all as not downloaded
            for video in db_videos:
                if video.downloaded:
                    video.downloaded = False
                    video.download_status = 'pending'
                    video.download_path = None
                    updated += 1
        else:
            # Check each file
            video_ids_on_disk = set()
            for filepath in video_files:
                filename = os.path.basename(filepath)
                
                # Try to extract video ID from filename
                video_id = None
                if '[' in filename and ']' in filename:
                    video_id = filename.split('[')[-1].split(']')[0]
                    video_ids_on_disk.add(video_id)
                    
                    # Check if video exists in DB
                    video = db.query(Video).filter_by(video_id=video_id, channel_id=channel.id).first()
                    if video:
                        if not video.downloaded:
                            video.downloaded = True
                            video.download_status = 'completed'
                            video.download_path = filepath
                            updated += 1
                    else:
                        # Import new video
                        title = filename.rsplit('.', 1)[0]
                        if '[' in title:
                            title = title.rsplit('[', 1)[0].strip()
                        
                        new_video = Video(
                            video_id=video_id,
                            channel_id=channel.id,
                            title=title,
                            publish_date=datetime.fromtimestamp(os.path.getmtime(filepath)),
                            downloaded=True,
                            download_status='completed',
                            download_path=filepath
                        )
                        db.add(new_video)
                        imported += 1
            
            # Mark videos as not downloaded if file doesn't exist
            for video in db_videos:
                if video.downloaded and video.video_id not in video_ids_on_disk:
                    video.downloaded = False
                    video.download_status = 'pending'
                    video.download_path = None
                    updated += 1
    
    db.commit()
    return {"status": "success", "updated": updated, "imported": imported}

@app.get("/api/v1/history")
def get_history(db: Session = Depends(get_db)):
    videos = db.query(Video).filter_by(downloaded=True).order_by(Video.publish_date.desc()).limit(50).all()
    result = []
    for v in videos:
        channel = db.query(Channel).filter_by(id=v.channel_id).first()
        result.append({
            'id': v.id,
            'video_id': v.video_id,
            'video_title': v.title,
            'channel_name': channel.channel_name if channel else 'Unknown',
            'downloaded_at': v.publish_date
        })
    return result

@app.get("/api/v1/queue")
def get_queue(db: Session = Depends(get_db)):
    # Get all videos that are queued or downloading
    videos = db.query(Video).filter(Video.download_status.in_(['pending', 'queued', 'downloading'])).order_by(Video.publish_date.desc()).limit(50).all()
    result = []
    for v in videos:
        channel = db.query(Channel).filter_by(id=v.channel_id).first()
        if channel:
            status_map = {
                'pending': 'Pending',
                'queued': 'Queued',
                'downloading': '⬇️ Downloading...'
            }
            result.append({
                'id': v.id,
                'video_id': v.video_id,
                'title': v.title,
                'channel_id': v.channel_id,
                'channel_name': channel.channel_name,
                'publish_date': v.publish_date,
                'status': status_map.get(v.download_status, v.download_status)
            })
    return result

# Background scheduler
def scheduled_sync():
    db = SessionLocal()
    monitor = Monitor(db)
    monitor.check_all_channels()
    db.close()

def scheduled_rescan():
    db = SessionLocal()
    # Run rescan logic
    channels = db.query(Channel).all()
    for channel in channels:
        channel_folder = os.path.join(channel.download_path, channel.channel_name)
        video_files = []
        if os.path.exists(channel_folder):
            video_files = glob.glob(os.path.join(channel_folder, "*.mkv")) + \
                         glob.glob(os.path.join(channel_folder, "*.mp4")) + \
                         glob.glob(os.path.join(channel_folder, "*.webm"))
        
        if not video_files:
            # Mark all as not downloaded
            for video in db.query(Video).filter_by(channel_id=channel.id, downloaded=True).all():
                video.downloaded = False
                video.download_status = 'pending'
                video.download_path = None
        else:
            video_ids_on_disk = set()
            for filepath in video_files:
                filename = os.path.basename(filepath)
                if '[' in filename and ']' in filename:
                    video_id = filename.split('[')[-1].split(']')[0]
                    video_ids_on_disk.add(video_id)
            
            for video in db.query(Video).filter_by(channel_id=channel.id, downloaded=True).all():
                if video.video_id not in video_ids_on_disk:
                    video.downloaded = False
                    video.download_status = 'pending'
                    video.download_path = None
    
    db.commit()
    db.close()

scheduler = BackgroundScheduler()

# @app.on_event("startup")
# def startup_event():
#     scheduler.add_job(scheduled_sync, 'interval', minutes=15)
#     scheduler.add_job(scheduled_rescan, 'interval', minutes=5)
#     scheduler.start()

# @app.on_event("shutdown")
# def shutdown_event():
#     scheduler.shutdown()
scheduler.start()

# Serve frontend
@app.get("/")
async def serve_frontend():
    static_dir = os.getenv('STATIC_DIR', '/app/frontend/build')
    index_path = os.path.join(static_dir, 'index.html')
    
    # Mount static files if not already mounted
    static_files = os.path.join(static_dir, 'static')
    if os.path.exists(static_files):
        try:
            app.mount("/static", StaticFiles(directory=static_files), name="static")
        except:
            pass  # Already mounted
    
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"app": "Tubarr", "version": "1.0.0", "static_dir": static_dir, "index_path": index_path, "exists": os.path.exists(index_path)}

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # Don't catch API routes or static files
    if full_path.startswith("api/") or full_path.startswith("static/"):
        raise HTTPException(404)
    
    static_dir = os.getenv('STATIC_DIR', '/app/frontend/build')
    index_path = os.path.join(static_dir, 'index.html')
    if os.path.exists(index_path):
        return FileResponse(index_path)
    raise HTTPException(404)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7171)
