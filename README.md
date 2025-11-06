# Tubarr

A YouTube channel and playlist monitoring and download manager inspired by Sonarr/Radarr. Automatically organizes downloads in a TV show structure compatible with Jellyfin, Plex, and Emby.

## Features

### Core Features
- 🎬 Monitor YouTube channels for new videos
- 📁 Monitor YouTube playlists as seasons
- ⬇️ Download videos in your preferred quality (4K, 1080p, 720p, 480p)
- 📺 TV show structure: Channels = Shows, Playlists = Seasons, Videos = Episodes
- 🎨 Dark/Light theme support
- 🔍 Search and preview channels before adding
- 📊 Activity tracking and download queue with real-time updates
- 🎯 Multi-select videos for bulk download/delete operations

### Organization & Naming
- **Customizable file naming** with presets (Standard, Scene, Plex) or custom patterns
- **Season structure**:
  - Season 00 (Specials) - Individual videos not in playlists
  - Season 01+ - Monitored playlists
- **Smart detection** - Videos automatically placed in correct season if part of monitored playlist
- **NFO metadata files** for media server compatibility
- **Embedded metadata** - Thumbnails, subtitles, and video info

### Media Server Integration
- ✅ Jellyfin compatible
- ✅ Plex compatible
- ✅ Emby compatible
- Automatic NFO generation with episode details
- TV show naming convention (Show - S01E01 - Title)
- Thumbnail and subtitle embedding

### Visual Status Indicators
Sonarr-style colored status bars on channel and playlist cards:
- 🟣 **Purple** - Currently downloading
- 🔴 **Red** - Missing episodes (monitored)
- 🟠 **Orange** - Missing episodes (not monitored)
- 🔵 **Blue** - All downloaded (monitored/continuing)
- 🟢 **Green** - All downloaded (not monitored/ended)

## Quick Start with Docker Compose

1. Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  tubarr:
    image: ghcr.io/billsbdb3/tubarr:latest
    container_name: tubarr
    ports:
      - "7171:7171"
    volumes:
      - /path/to/config:/config
      - /path/to/downloads:/downloads
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    restart: unless-stopped
```

2. Update the volume paths:
   - `/path/to/config` - Where Tubarr will store its database and settings
   - `/path/to/downloads` - Where downloaded videos will be saved

3. Start the container:

```bash
docker-compose up -d
```

4. Access the web UI at `http://localhost:7171`

## Docker Run

```bash
docker run -d \
  --name=tubarr \
  -p 7171:7171 \
  -v /path/to/config:/config \
  -v /path/to/downloads:/downloads \
  -e PUID=1000 \
  -e PGID=1000 \
  -e TZ=America/New_York \
  --restart unless-stopped \
  ghcr.io/billsbdb3/tubarr:latest
```

## Parameters

| Parameter | Function |
| :----: | --- |
| `-p 7171` | Web UI port |
| `-v /config` | Configuration and database files |
| `-v /downloads` | Downloaded video files |
| `-e PUID=1000` | User ID for file permissions |
| `-e PGID=1000` | Group ID for file permissions |
| `-e TZ=America/New_York` | Timezone |

## File Structure

Downloads are organized in a TV show structure:

```
/downloads/
  └── Channel Name/
      ├── Specials/                    # Season 00 - Individual videos
      │   ├── Channel Name - S00E001 - Video Title.mkv
      │   ├── Channel Name - S00E001 - Video Title.nfo
      │   └── ...
      ├── Season 01/                   # First monitored playlist
      │   ├── Channel Name - S01E001 - Video Title.mkv
      │   ├── Channel Name - S01E001 - Video Title.nfo
      │   └── ...
      └── Season 02/                   # Second monitored playlist
          └── ...
```

Each video includes:
- `.mkv` - Video file with embedded thumbnail and subtitles
- `.nfo` - XML metadata for media servers
- `.info.json` - Full YouTube metadata
- `.description` - Video description
- `.en.vtt` - Subtitle files

## Usage

### Adding Channels

1. **Search**: Use the search bar to find YouTube channels
2. **Preview**: Click "Preview" to see recent videos
3. **Add**: Click "Add Channel" to open configuration modal
4. **Configure**:
   - Set download path
   - Choose quality (4K, 1080p, 720p, 480p)
   - Enable/disable monitoring
5. **Confirm**: Click "Add Channel"

### Managing Playlists

1. **View Playlists**: Click on a channel to see its playlists
2. **Monitor Playlist**: Click "Add Playlist" on any playlist
3. **Configure**:
   - Choose to download all existing videos or only new ones
   - Monitored playlists automatically download new videos
4. **Status**: Monitored playlists show a ✓ checkmark

### Downloading Videos

**Individual Videos:**
- Click "Download" on any video
- Videos not in playlists go to Season 00 (Specials)
- Videos in monitored playlists go to correct season

**Bulk Operations:**
- Select multiple videos with checkboxes
- Use "Download Selected" or "Delete Selected" buttons

### Settings

**General:**
- API key generation
- Default download path
- Auto-sync interval

**Media Management:**
- File naming format (Standard, Scene, Plex, or Custom)
- Custom naming patterns with tokens:
  - `{channel}` - Channel name
  - `{season:00}` - Season with padding
  - `{episode:000}` - Episode with padding
  - `{title}` - Video title
  - `{id}` - YouTube video ID
  - `{date}` - Upload date

**Quality:**
- Default quality profile
- Video format preferences

**UI:**
- Theme (Dark/Light)
- Videos per page

## Building from Source

### Requirements

- Python 3.11+
- Node.js 20+
- yt-dlp
- ffmpeg

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn api.main:app --host 0.0.0.0 --port 7171
```

### Frontend

```bash
cd frontend
npm install
npm run build
```

### Build Docker Image

```bash
docker build -t ghcr.io/billsbdb3/tubarr:latest .
```

## API

The application exposes a REST API on port 7171:

### Channels
- `GET /api/v1/channel` - List all channels
- `POST /api/v1/channel` - Add a new channel
- `GET /api/v1/channel/{id}` - Get channel details with videos
- `PATCH /api/v1/channel/{id}/monitor` - Toggle channel monitoring
- `POST /api/v1/channel/{id}/sync` - Sync channel videos
- `DELETE /api/v1/channel/{id}` - Delete channel

### Playlists
- `GET /api/v1/channel/{id}/playlists` - Get channel playlists
- `GET /api/v1/playlist/{id}` - Get playlist videos
- `POST /api/v1/playlist/{id}/monitor` - Monitor playlist
- `POST /api/v1/playlist/{id}/unmonitor` - Unmonitor playlist

### Videos
- `POST /api/v1/video/download/{video_id}` - Download a video
- `DELETE /api/v1/video/{video_id}` - Delete video from disk

### Activity
- `GET /api/v1/queue` - Get download queue
- `GET /api/v1/history` - Get download history

### Settings
- `GET /api/v1/settings` - Get settings
- `POST /api/v1/settings` - Update settings

## Troubleshooting

### Videos not downloading
- Check that yt-dlp is up to date
- Verify ffmpeg is installed
- Check download path permissions

### Media server not detecting files
- Ensure NFO files are present
- Check file naming matches your media server's requirements
- Verify folder structure (Channel/Season/Episode)

### Playlist videos showing 0 downloaded
- Refresh the page to update counts
- Check that videos were downloaded to the correct season folder

## License

MIT
