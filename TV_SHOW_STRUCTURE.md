# Tubarr TV Show Structure

Tubarr now downloads YouTube videos in a TV show structure compatible with Jellyfin, Plex, Emby, and other media servers.

## Structure

```
/downloads/
  └── Channel Name/              # TV Show
      └── Season 01/             # Season (default: Season 01)
          ├── Channel Name - S01E001 - Video Title.mkv
          ├── Channel Name - S01E001 - Video Title.nfo
          ├── Channel Name - S01E002 - Video Title.mkv
          └── Channel Name - S01E002 - Video Title.nfo
```

## Mapping

- **YouTube Channel** → **TV Show**
- **Playlist** → **Season** (future feature)
- **Video** → **Episode**

## File Naming

Format: `Show Name - S##E### - Episode Title.mkv`

Example: `Linus Tech Tips - S01E042 - This GPU is INSANE.mkv`

## Metadata

Each video includes:

1. **Video file (.mkv)** - H.264/H.265 video with embedded:
   - Thumbnail (as cover art)
   - Subtitles (English auto-generated + manual if available)
   - Metadata (title, description, upload date)

2. **NFO file (.nfo)** - XML metadata for media servers:
   ```xml
   <episodedetails>
     <title>Video Title</title>
     <showtitle>Channel Name</showtitle>
     <season>1</season>
     <episode>42</episode>
     <plot>Video description</plot>
     <aired>2025-01-15</aired>
     <studio>Channel Name</studio>
     <thumb>https://thumbnail.url</thumb>
     <runtime>1234</runtime>
     <uniqueid type="youtube">dQw4w9WgXcQ</uniqueid>
   </episodedetails>
   ```

3. **Additional files**:
   - `.info.json` - Full YouTube metadata
   - `.description` - Video description text
   - `.en.vtt` - Subtitle files

## Episode Numbering

Episodes are numbered sequentially based on when they were added to Tubarr:
- First video added = E001
- Second video added = E002
- etc.

This ensures consistent numbering even if videos are added out of chronological order.

## Media Server Setup

### Jellyfin
1. Add library → TV Shows
2. Point to `/downloads` directory
3. Jellyfin will automatically detect each channel as a show

### Plex
1. Add library → TV Shows
2. Point to `/downloads` directory
3. Use "Personal Media Shows" agent
4. Plex will scan NFO files for metadata

### Emby
1. Add library → TV Shows
2. Point to `/downloads` directory
3. Enable NFO metadata reader
4. Emby will parse episode information

## Future Features

- Playlist support (playlists become seasons)
- Custom season assignment
- Episode number based on upload date
- Show-level NFO files (tvshow.nfo)
