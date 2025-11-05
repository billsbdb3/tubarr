# Tubarr

A YouTube channel monitoring and download manager inspired by Sonarr/Radarr.

## Features

- Monitor YouTube channels for new videos
- Download videos in your preferred quality
- Organize downloads by channel
- Search and preview channels before adding
- Playlist support
- Activity tracking and download queue
- Dark/Light theme
- Pagination and filtering

## Quick Start with Docker Compose

1. Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  tubarr:
    image: tubarr/tubarr:latest
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
  tubarr/tubarr:latest
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

## Building from Source

### Requirements

- Python 3.11+
- Node.js 20+
- yt-dlp

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
npm start
```

### Build Docker Image

```bash
docker build -t tubarr/tubarr:latest .
```

## Usage

1. **Add a Channel**: Search for a YouTube channel and click "Add Channel"
2. **Browse Videos**: Click on a channel to see all available videos
3. **Download**: Click the download button on any video
4. **Monitor**: Enable monitoring to automatically check for new videos
5. **Sync**: Click "Sync Channel" to update video metadata and find new videos

## API

The application exposes a REST API on port 7171:

- `GET /api/v1/channel` - List all channels
- `POST /api/v1/channel` - Add a new channel
- `GET /api/v1/channel/{id}` - Get channel details with videos
- `POST /api/v1/video/download/{video_id}` - Download a video
- `GET /api/v1/queue` - Get download queue
- `GET /api/v1/history` - Get download history

## License

MIT
