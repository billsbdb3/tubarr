import React, { useState, useEffect, useRef, useMemo } from 'react';
import { channelsApi } from '../../api/channels';
import { videosApi } from '../../api/videos';
import { playlistsApi } from '../../api/playlists';
import { systemApi } from '../../api/system';
import { useApp } from '../../context/AppContext';
import { formatDuration } from '../../utils/formatters';

export const ChannelDetail = ({ channel, onBack }) => {
  const { loadQueue, settings } = useApp();
  const [channelDetail, setChannelDetail] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedVideos, setSelectedVideos] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [playlistModal, setPlaylistModal] = useState(null);
  const loadedVideosRef = useRef(25);

  useEffect(() => {
    loadChannelDetail();
    loadPlaylists();
  }, [channel.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadChannelDetail(true); // silent reload
      loadQueue();
    }, 5000);
    return () => clearInterval(interval);
  }, [channel.id, sortBy, filterBy]);

  useEffect(() => {
    loadedVideosRef.current = 25;
    loadChannelDetail();
  }, [sortBy, filterBy]);

  const loadChannelDetail = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await channelsApi.getDetail(channel.id, {
        limit: loadedVideosRef.current,
        offset: 0,
        sort: sortBy,
        filter: filterBy
      });
      setChannelDetail(res.data);
      if (!silent) setLoading(false);
    } catch (error) {
      console.error('Failed to load channel detail:', error);
      setLoading(false);
    }
  };

  const loadPlaylists = async () => {
    try {
      const res = await channelsApi.getPlaylists(channel.id);
      setPlaylists(res.data);
    } catch (error) {
      console.error('Failed to load playlists:', error);
    }
  };

  const loadMoreVideos = async () => {
    if (!channelDetail || !channelDetail.has_more) return;
    const currentLength = channelDetail.videos.length;
    const res = await channelsApi.getDetail(channel.id, {
      limit: 25,
      offset: currentLength,
      sort: sortBy,
      filter: filterBy
    });
    loadedVideosRef.current = currentLength + res.data.videos.length;
    setChannelDetail(prev => ({
      ...prev,
      videos: [...prev.videos, ...res.data.videos],
      loaded_videos: loadedVideosRef.current,
      has_more: res.data.has_more
    }));
  };

  const downloadVideo = async (youtubeVideoId) => {
    try {
      await videosApi.downloadById(youtubeVideoId, channel.id);
      await loadQueue();
      await loadChannelDetail(true);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const deleteVideo = async (videoId) => {
    if (!window.confirm('Delete this video file from disk?')) return;
    try {
      await videosApi.delete(videoId);
      await loadChannelDetail(true);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const syncChannel = async () => {
    try {
      await channelsApi.sync(channel.id);
      alert('Channel sync started! Updates will appear automatically.');
    } catch (error) {
      alert('Sync failed: ' + (error.response?.data?.detail || error.message));
    }
  };

  const toggleMonitor = async () => {
    try {
      await channelsApi.toggleMonitor(channel.id);
      await loadChannelDetail(true);
    } catch (error) {
      console.error('Toggle monitor failed:', error);
    }
  };

  const deleteChannel = async () => {
    if (!window.confirm('Are you sure you want to delete this channel?')) return;
    try {
      await channelsApi.delete(channel.id);
      onBack();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handlePlaylistMonitor = async () => {
    try {
      if (playlistModal.monitored) {
        await playlistsApi.unmonitor(playlistModal.playlist_id);
        alert('Playlist unmonitored');
      } else {
        await playlistsApi.monitor(playlistModal.playlist_id, channel.id, playlistModal.downloadAll);
        if (playlistModal.downloadAll) {
          alert(`Monitoring playlist and downloading all ${playlistModal.video_count} videos in background!`);
        } else {
          alert('Playlist is now monitored. New videos will be downloaded automatically.');
        }
      }
      setPlaylistModal(null);
      await loadPlaylists();
    } catch (error) {
      alert('Failed: ' + error.message);
    }
  };

  // Filter videos based on search query
  const filteredVideos = useMemo(() => {
    if (!channelDetail?.videos) return [];
    if (!searchQuery.trim()) return channelDetail.videos;
    
    const query = searchQuery.toLowerCase();
    return channelDetail.videos.filter(video => 
      video.title.toLowerCase().includes(query)
    );
  }, [channelDetail?.videos, searchQuery]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner">⏳</div>
        <p>Loading channel videos...</p>
      </div>
    );
  }

  if (!channelDetail) return null;

  return (
    <>
      <button onClick={onBack} className="secondary" style={{marginBottom: '20px'}}>
        ← Back to Channels
      </button>

      <div className="channel-header">
        {channelDetail.channel.thumbnail && (
          <img 
            src={systemApi.proxyImage(channelDetail.channel.thumbnail)} 
            alt={channelDetail.channel.channel_name} 
          />
        )}
        <div className="channel-info">
          <h2>{channelDetail.channel.channel_name}</h2>
          <div className="info-row">
            <span><strong>Videos:</strong> {channelDetail.total_videos}</span>
            <span><strong>Downloaded:</strong> {channelDetail.downloaded_count}</span>
            <span><strong>Quality:</strong> {channelDetail.channel.quality}</span>
            <span><strong>Status:</strong> {channelDetail.channel.monitored ? '✅ Monitored' : '⏸️ Paused'}</span>
          </div>
          {channelDetail.channel.description && (
            <p style={{fontSize: '13px', color: '#b3b3b3', marginTop: '10px', lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>
              {channelDetail.channel.description}
            </p>
          )}
          <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
            <button onClick={syncChannel}>🔄 Sync Channel</button>
            <button onClick={toggleMonitor}>
              {channelDetail.channel.monitored ? 'Pause Monitoring' : 'Resume Monitoring'}
            </button>
            <button onClick={deleteChannel} className="danger">Delete Channel</button>
          </div>
        </div>
      </div>

      {playlists.length > 0 && (
        <div className="section" style={{marginTop: '30px'}}>
          <h3>Playlists</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', marginTop: '15px'}}>
            {playlists.map(playlist => (
              <div key={playlist.playlist_id} className="card" style={{cursor: 'pointer'}}>
                <h4 style={{fontSize: '14px', marginBottom: '10px'}}>{playlist.title}</h4>
                <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px'}}>
                  {playlist.video_count} videos • {playlist.downloaded_count} downloaded
                </p>
                <button 
                  onClick={() => setPlaylistModal({
                    ...playlist,
                    downloadAll: !playlist.monitored
                  })}
                  style={{width: '100%', padding: '8px'}}
                >
                  {playlist.monitored ? 'Unmonitor' : 'Monitor'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section-header" style={{marginTop: '30px'}}>
        <h3>Videos ({filteredVideos.length} {searchQuery ? 'filtered' : `of ${channelDetail.total_videos}`})</h3>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          {selectedVideos.size > 0 && (
            <>
              <span style={{fontSize: '14px', color: 'var(--text-secondary)'}}>{selectedVideos.size} selected</span>
              <button onClick={() => {
                selectedVideos.forEach(vid => downloadVideo(vid));
                setSelectedVideos(new Set());
              }} style={{padding: '5px 10px'}}>Download Selected</button>
              <button onClick={() => {
                if (window.confirm(`Delete ${selectedVideos.size} videos?`)) {
                  selectedVideos.forEach(vid => deleteVideo(vid));
                  setSelectedVideos(new Set());
                }
              }} className="danger" style={{padding: '5px 10px'}}>Delete Selected</button>
              <button onClick={() => setSelectedVideos(new Set())} style={{padding: '5px 10px', background: 'var(--bg-secondary)'}}>Clear</button>
            </>
          )}
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{width: '200px', padding: '5px 10px'}}
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{width: 'auto'}}>
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="title">Title A-Z</option>
          </select>
          <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)} style={{width: 'auto'}}>
            <option value="all">All Videos</option>
            <option value="downloaded">Downloaded Only</option>
            <option value="available">Not Downloaded</option>
          </select>
        </div>
      </div>

      <div className="video-grid">
        {filteredVideos.map(video => (
          <div key={video.video_id} className="video-card" style={{position: 'relative'}}>
            <input 
              type="checkbox" 
              checked={selectedVideos.has(video.video_id)}
              onChange={(e) => {
                const newSelected = new Set(selectedVideos);
                if (e.target.checked) {
                  newSelected.add(video.video_id);
                } else {
                  newSelected.delete(video.video_id);
                }
                setSelectedVideos(newSelected);
              }}
              style={{position: 'absolute', top: '10px', left: '10px', width: '20px', height: '20px', cursor: 'pointer', zIndex: 10}}
            />
            <img src={`https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`} alt={video.title} />
            <div className="video-card-content">
              <h4>{video.title}</h4>
              <p>{formatDuration(video.duration)}</p>
              {!video.downloaded ? (
                <button onClick={() => downloadVideo(video.video_id)}>Download</button>
              ) : (
                <button onClick={() => deleteVideo(video.video_id)} className="danger">Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!searchQuery && channelDetail.loaded_videos < channelDetail.total_videos && (
        <button onClick={loadMoreVideos} style={{marginTop: '20px', width: '100%'}}>
          Load More Videos
        </button>
      )}

      {playlistModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{background: 'var(--bg-primary)', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '90%'}}>
            <h2 style={{marginBottom: '20px'}}>{playlistModal.monitored ? 'Unmonitor' : 'Monitor'} Playlist</h2>
            <p style={{marginBottom: '20px'}}>{playlistModal.title}</p>
            {!playlistModal.monitored && (
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <input 
                    type="checkbox" 
                    checked={playlistModal.downloadAll}
                    onChange={(e) => setPlaylistModal({...playlistModal, downloadAll: e.target.checked})}
                  />
                  <span>Download all {playlistModal.video_count} videos now</span>
                </label>
              </div>
            )}
            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
              <button onClick={() => setPlaylistModal(null)} style={{background: 'var(--bg-secondary)'}}>Cancel</button>
              <button onClick={handlePlaylistMonitor}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
