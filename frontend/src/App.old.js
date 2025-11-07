import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [view, setView] = useState(localStorage.getItem('tubarr_view') || 'home');
  const [channels, setChannels] = useState([]);
  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelDetail, setChannelDetail] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [playlistDetail, setPlaylistDetail] = useState(null);
  const [videoLimit, setVideoLimit] = useState(500);
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterBy, setFilterBy] = useState('all');
  const [channelPreview, setChannelPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rescanLoading, setRescanLoading] = useState(false);
  const [downloadingVideos, setDownloadingVideos] = useState(new Set());
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [addingChannel, setAddingChannel] = useState(null);
  const [syncPolling, setSyncPolling] = useState(null);
  const loadedVideosRef = useRef(25);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [settingsTab, setSettingsTab] = useState('general');
  const [channelModal, setChannelModal] = useState(null);
  const [selectedVideos, setSelectedVideos] = useState(new Set());
  const [playlistModal, setPlaylistModal] = useState(null);
  const [settings, setSettings] = useState({
    apiKey: '',
    defaultPath: '/downloads',
    defaultQuality: '1080p',
    autoSync: true,
    syncInterval: 15,
    theme: 'dark',
    namingFormat: 'standard',
    customNaming: '{channel} - S{season:00}E{episode:000} - {title}'
  });
  const [newChannel, setNewChannel] = useState({
    channel_url: '',
    download_path: '/downloads',
    quality: '1080p'
  });
  const [status, setStatus] = useState({});

  // Save view to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('tubarr_view', view);
  }, [view]);

  useEffect(() => {
    loadChannels();
    loadVideos();
    loadStatus();
    loadSettings();
    loadQueue();
    
    // If on channel-detail view but no data, go home
    if (view === 'channel-detail' && !channelDetail) {
      setView('home');
    }
  }, []);

  useEffect(() => {
    if (view === 'activity') {
      loadQueue();
      loadHistory();
      const interval = setInterval(() => {
        loadQueue();
        loadHistory();
      }, 1000);
      return () => clearInterval(interval);
    } else if (view === 'channel-detail' && channelDetail) {
      // Poll channel detail for updates every 5 seconds
      const interval = setInterval(async () => {
        loadQueue(); // Also update queue for badge
        const res = await axios.get(`/api/v1/channel/${channelDetail.channel.id}?limit=${loadedVideosRef.current}&offset=0&sort=${sortBy}&filter=${filterBy}`);
        setChannelDetail(res.data);
      }, 5000);
      return () => clearInterval(interval);
    } else if (view === 'playlist-detail' && playlistDetail && playlistDetail.length > 0) {
      // Poll playlist detail for updates
      const interval = setInterval(async () => {
        loadQueue();
        const playlistId = playlistDetail[0]?.playlist_id;
        if (playlistId) {
          const res = await axios.get(`/api/v1/playlist/${playlistId}`);
          setPlaylistDetail(res.data);
        }
      }, 5000);
      return () => clearInterval(interval);
    } else {
      // Poll queue for badge on all other views
      const interval = setInterval(() => {
        loadQueue();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [view, channelDetail?.channel?.id, playlistDetail, sortBy, filterBy]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    if (view === 'channel-detail' && channelDetail) {
      const reloadWithFilters = async () => {
        const res = await axios.get(`/api/v1/channel/${channelDetail.channel.id}?limit=25&offset=0&sort=${sortBy}&filter=${filterBy}`);
        setChannelDetail(res.data);
      };
      reloadWithFilters();
    }
  }, [sortBy, filterBy]);

  const loadChannels = async () => {
    const res = await axios.get('/api/v1/channel');
    setChannels(res.data);
  };

  const loadVideos = async () => {
    const res = await axios.get('/api/v1/video');
    setVideos(res.data);
  };

  const loadStatus = async () => {
    const res = await axios.get('/api/v1/system/status');
    setStatus(res.data);
  };

  const loadQueue = async () => {
    const res = await axios.get('/api/v1/queue');
    setQueue(res.data);
  };

  const loadHistory = async () => {
    const res = await axios.get('/api/v1/history');
    setHistory(res.data);
  };

  const searchChannels = async (e) => {
    e.preventDefault();
    const res = await axios.get(`/api/v1/search?query=${searchQuery}`);
    setSearchResults(res.data);
    setView('search');
    
    // Fetch full channel info in background
    res.data.forEach(async (result, idx) => {
      try {
        const infoRes = await axios.get(`/api/v1/channel/info/${result.channel_id}`);
        if (infoRes.data) {
          const proxiedUrl = infoRes.data.thumbnail ? `/api/v1/proxy/image?url=${encodeURIComponent(infoRes.data.thumbnail)}` : null;
          setSearchResults(prev => 
            prev.map((item, i) => 
              i === idx ? {...item, ...infoRes.data, thumbnail: proxiedUrl} : item
            )
          );
        }
      } catch (e) {
        // Keep placeholder
      }
    });
  };

  const addChannelFromSearch = async (result) => {
    setChannelModal({
      channel_url: result.channel_url,
      channel_id: result.channel_id,
      channel_name: result.channel_name,
      thumbnail: result.thumbnail,
      monitored: true,
      quality: settings.defaultQuality || '1080p',
      download_path: settings.defaultPath || '/downloads'
    });
  };

  const confirmAddChannel = async () => {
    try {
      setAddingChannel(channelModal.channel_id);
      const response = await axios.post('/api/v1/channel', {
        channel_url: channelModal.channel_url,
        download_path: channelModal.download_path,
        quality: channelModal.quality,
        monitored: channelModal.monitored
      });
      await loadChannels();
      setChannelModal(null);
      setAddingChannel(null);
      if (channelModal.monitored) {
        viewChannelDetail(response.data);
      }
    } catch (error) {
      console.error('Error adding channel:', error);
      alert('Failed to add channel: ' + (error.response?.data?.detail || error.message));
      setAddingChannel(null);
    }
  };

  const confirmPlaylist = async () => {
    try {
      if (playlistModal.monitored) {
        await axios.post(`/api/v1/playlist/${playlistModal.playlist_id}/unmonitor`);
        alert('Playlist unmonitored');
      } else {
        await axios.post(`/api/v1/playlist/${playlistModal.playlist_id}/monitor?channel_id=${channelDetail.channel.id}&download_all=${playlistModal.downloadAll}`);
        if (playlistModal.downloadAll) {
          alert(`Monitoring playlist and downloading all ${playlistModal.video_count} videos in background!`);
        } else {
          alert('Playlist is now monitored. New videos will be downloaded automatically.');
        }
      }
      setPlaylistModal(null);
      // Reload playlists to show updated status
      const playlistRes = await axios.get(`/api/v1/channel/${channelDetail.channel.id}/playlists`);
      setPlaylists(playlistRes.data);
    } catch (error) {
      alert('Failed: ' + error.message);
    }
  };

  const addChannel = async (e) => {
    e.preventDefault();
    await axios.post('/api/v1/channel', newChannel);
    setNewChannel({ channel_url: '', download_path: settings.defaultPath || '/downloads', quality: '1080p' });
    loadChannels();
  };

  const deleteChannel = async (id) => {
    await axios.delete(`/api/v1/channel/${id}`);
    loadChannels();
  };

  const viewChannelDetail = async (channel) => {
    setLoading(true);
    setView('channel-detail');
    setSortBy('date_desc');
    setFilterBy('all');
    setPlaylistsLoading(true);
    loadedVideosRef.current = 25;
    try {
      const res = await axios.get(`/api/v1/channel/${channel.id}?limit=25&offset=0&sort=date_desc&filter=all`);
      setChannelDetail(res.data);
      setLoading(false);
      // Load playlists in background
      axios.get(`/api/v1/channel/${channel.id}/playlists`).then(playlistRes => {
        setPlaylists(playlistRes.data);
        setPlaylistsLoading(false);
      }).catch(() => setPlaylistsLoading(false));
    } catch (error) {
      setLoading(false);
      setPlaylistsLoading(false);
    }
  };

  const loadMoreVideos = async () => {
    if (!channelDetail || !channelDetail.has_more) return;
    const currentLength = channelDetail.videos.length;
    const res = await axios.get(`/api/v1/channel/${channelDetail.channel.id}?limit=25&offset=${currentLength}&sort=${sortBy}&filter=${filterBy}`);
    const newCount = currentLength + res.data.videos.length;
    loadedVideosRef.current = newCount;
    setChannelDetail(prev => ({
      ...prev,
      videos: [...prev.videos, ...res.data.videos],
      loaded_videos: newCount,
      has_more: res.data.has_more
    }));
  };

  const loadMoreVideosOld = async () => {
    const newLimit = videoLimit + 25;
    setVideoLimit(newLimit);
    const res = await axios.get(`/api/v1/channel/${channelDetail.channel.id}?limit=${newLimit}`);
    setChannelDetail(res.data);
  };

  const viewPlaylist = async (playlistId) => {
    const res = await axios.get(`/api/v1/playlist/${playlistId}`);
    // Add playlist_id to each video for reference
    const videosWithPlaylistId = res.data.map(v => ({...v, playlist_id: playlistId}));
    setPlaylistDetail(videosWithPlaylistId);
    setView('playlist-detail');
  };

  const previewChannel = async (result) => {
    const res = await axios.get(`/api/v1/preview/channel/${result.channel_id}`);
    setChannelPreview({...res.data, search_result: result});
    setView('channel-preview');
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const downloadVideo = async (videoId) => {
    setDownloadingVideos(prev => new Set(prev).add(videoId));
    try {
      await axios.post(`/api/v1/video/${videoId}/download`);
      await loadVideos();
      if (channelDetail) {
        const res = await axios.get(`/api/v1/channel/${channelDetail.channel.id}`);
        setChannelDetail(res.data);
      }
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadingVideos(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  const downloadVideoById = async (youtubeVideoId, channelId = null) => {
    const cid = channelId || (channelDetail ? channelDetail.channel.id : null);
    if (!cid) {
      alert('Channel not found');
      return;
    }
    
    setDownloadingVideos(prev => new Set(prev).add(youtubeVideoId));
    try {
      await axios.post(`/api/v1/video/download/${youtubeVideoId}`, {
        channel_id: cid
      });
      // Clear downloading state immediately after queuing
      setDownloadingVideos(prev => {
        const next = new Set(prev);
        next.delete(youtubeVideoId);
        return next;
      });
      await loadVideos();
      await loadQueue();
      if (channelDetail) {
        const res = await axios.get(`/api/v1/channel/${channelDetail.channel.id}`);
        setChannelDetail(res.data);
      }
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadingVideos(prev => {
        const next = new Set(prev);
        next.delete(youtubeVideoId);
        return next;
      });
    }
  };

  const deleteVideo = async (videoId) => {
    if (window.confirm('Delete this video file from disk?')) {
      await axios.delete(`/api/v1/video/${videoId}`);
      loadVideos();
      if (channelDetail) {
        const res = await axios.get(`/api/v1/channel/${channelDetail.channel.id}`);
        setChannelDetail(res.data);
      }
      if (playlistDetail) {
        // Reload playlist detail
        const playlistId = playlistDetail[0]?.playlist_id;
        if (playlistId) {
          const res = await axios.get(`/api/v1/playlist/${playlistId}`);
          setPlaylistDetail(res.data);
        }
      }
    }
  };

  const syncChannels = async () => {
    await axios.post('/api/v1/command/sync');
    setTimeout(() => {
      loadVideos();
      loadStatus();
    }, 1000);
  };

  const syncChannel = async (channelId) => {
    try {
      await axios.post(`/api/v1/channel/${channelId}/sync`);
      alert('Channel sync started! Updates will appear automatically.');
    } catch (error) {
      alert('Sync failed: ' + (error.response?.data?.detail || error.message));
    }
  };

  const toggleMonitor = async (channelId) => {
    await axios.patch(`/api/v1/channel/${channelId}/monitor`);
    if (channelDetail && channelDetail.channel.id === channelId) {
      const res = await axios.get(`/api/v1/channel/${channelId}`);
      setChannelDetail(res.data);
    }
    loadChannels();
  };

  const deleteChannelFromDetail = async (channelId) => {
    if (window.confirm('Are you sure you want to delete this channel?')) {
      await axios.delete(`/api/v1/channel/${channelId}`);
      setView('home');
      loadChannels();
    }
  };

  const downloadAllQueued = async () => {
    for (const item of queue) {
      try {
        await axios.post(`/api/v1/video/download/${item.video_id}`, {
          channel_id: item.channel_id || 1
        });
      } catch (e) {
        console.error('Download failed:', e);
      }
    }
  };

  const rescanFiles = async () => {
    try {
      setRescanLoading(true);
      await axios.post('/api/v1/command/rescan');
      await loadStatus();
      await loadChannels();
      if (channelDetail) {
        const res = await axios.get(`/api/v1/channel/${channelDetail.channel.id}`);
        setChannelDetail(res.data);
      }
      alert('File scan complete!');
    } catch (error) {
      console.error('Rescan failed:', error);
      alert('Rescan failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setRescanLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await axios.get('/api/v1/settings');
      setSettings(res.data);
    } catch (e) {
      console.log('Settings not found, using defaults');
    }
  };

  const saveSettings = async () => {
    await axios.post('/api/v1/settings', settings);
    alert('Settings saved!');
  };

  const generateApiKey = async () => {
    const res = await axios.post('/api/v1/settings/generate-key');
    setSettings({...settings, apiKey: res.data.apiKey});
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h1>📺 Tubarr</h1>
        <nav>
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>
            🏠 Channels
          </button>
          <button className={view === 'activity' ? 'active' : ''} onClick={() => { setView('activity'); loadQueue(); loadHistory(); }}>
            📊 Activity {queue.filter(v => v.status === 'Pending' || v.status.includes('Downloading') || v.status === 'Queued').length > 0 && (
              <span className="badge">{queue.filter(v => v.status === 'Pending' || v.status.includes('Downloading') || v.status === 'Queued').length}</span>
            )}
          </button>
          <button className={view === 'search' ? 'active' : ''} onClick={() => setView('search')}>
            🔍 Search
          </button>
          <button className={view === 'add' ? 'active' : ''} onClick={() => setView('add')}>
            ➕ Add Channel
          </button>
          <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>
            ⚙️ Settings
          </button>
          <button onClick={rescanFiles} disabled={rescanLoading}>
            {rescanLoading ? '⏳ Scanning...' : '📁 Rescan Files'}
          </button>
        </nav>
      </div>

      <div className="main-content">

      {view === 'home' && (
        <>
          <div className="page-header">
            <h2>Channels</h2>
            <div className="stats">
              <span>{status.channels || 0} Channels • {status.downloaded || 0} Downloaded</span>
            </div>
          </div>

          <div className="card-grid">
            {channels.map(channel => {
              // Calculate status color
              const totalVideos = channel.video_count || 0;
              const downloadedVideos = channel.downloaded_count || 0;
              const hasDownloading = queue.some(q => q.channel_id === channel.id);
              
              let statusColor = '#6c757d'; // gray default
              if (hasDownloading) {
                statusColor = '#9b59b6'; // purple - downloading
              } else if (channel.monitored && downloadedVideos < totalVideos) {
                statusColor = '#e74c3c'; // red - missing episodes (monitored)
              } else if (!channel.monitored && downloadedVideos < totalVideos) {
                statusColor = '#f39c12'; // orange - missing episodes (not monitored)
              } else if (downloadedVideos === totalVideos && totalVideos > 0) {
                statusColor = channel.monitored ? '#5d9cec' : '#27ae60'; // blue - continuing (monitored), green - ended (not monitored)
              }
              
              return (
                <div 
                  key={channel.id} 
                  className="card" 
                  onClick={() => viewChannelDetail(channel)}
                  style={{'--status-color': statusColor}}
                >
                  {channel.thumbnail ? (
                    <img src={`/api/v1/proxy/image?url=${encodeURIComponent(channel.thumbnail)}`} alt={channel.channel_name} style={{aspectRatio: '1', borderRadius: '50%'}} />
                  ) : (
                    <div style={{width: '100%', aspectRatio: '1', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: 'white'}}>
                      {channel.channel_name.charAt(0)}
                    </div>
                  )}
                  <h3>{channel.channel_name}</h3>
                  <p>{channel.quality} • {channel.monitored ? 'Monitored' : 'Paused'}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === 'activity' && (
        <>
          <div className="page-header">
            <h2>Activity</h2>
            <div className="stats">
              <span style={{color: '#5d9cec'}}>🔄 Auto-refreshing every 1s</span>
            </div>
          </div>

          <div className="section-header">
            <h3>Queue ({queue.filter(v => v.status === 'Pending' || v.status.includes('Downloading') || v.status === 'Queued').length})</h3>
          </div>
          <div className="activity-section" style={{marginBottom: '30px'}}>
            {queue.filter(v => v.status === 'Pending' || v.status.includes('Downloading') || v.status === 'Queued').length === 0 ? (
              <p style={{padding: '20px', textAlign: 'center', color: 'var(--text-secondary)'}}>No active downloads</p>
            ) : (
              queue.filter(v => v.status === 'Pending' || v.status.includes('Downloading') || v.status === 'Queued').map(item => (
                <div key={item.id} style={{padding: '15px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{flex: 1}}>
                    <h4 style={{fontSize: '14px', marginBottom: '5px'}}>{item.title}</h4>
                    <p style={{fontSize: '12px', color: 'var(--text-secondary)'}}>{item.channel_name}</p>
                  </div>
                  <span style={{fontSize: '12px', color: '#f39c12'}}>⏳ {item.status || 'Pending'}</span>
                </div>
              ))
            )}
          </div>

          <div className="section-header">
            <h3>Recently Downloaded ({history.length})</h3>
          </div>
          <div className="activity-section">
            {history.length === 0 ? (
              <p style={{padding: '20px', textAlign: 'center', color: 'var(--text-secondary)'}}>No download history</p>
            ) : (
              history.map(item => (
                <div key={item.id} style={{padding: '15px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{flex: 1}}>
                    <h4 style={{fontSize: '14px', marginBottom: '5px'}}>{item.video_title}</h4>
                    <p style={{fontSize: '12px', color: 'var(--text-secondary)'}}>{item.channel_name} • {new Date(item.downloaded_at).toLocaleString()}</p>
                  </div>
                  <span style={{fontSize: '12px', color: '#5d9cec'}}>✅ Downloaded</span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {view === 'search' && (
        <>
          <div className="page-header">
            <h2>Search Channels</h2>
          </div>
          
          <form onSubmit={searchChannels}>
            <input
              type="text"
              placeholder="Search for YouTube channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              required
            />
            <button type="submit">Search</button>
          </form>

          {searchResults.length > 0 && (
            <div style={{marginTop: '30px'}}>
              {searchResults.map((result, idx) => (
                <div key={idx} className="channel-header" style={{marginBottom: '20px'}}>
                  {result.thumbnail ? (
                    <img src={result.thumbnail} alt={result.channel_name} style={{width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover'}} />
                  ) : (
                    <div style={{width: '140px', height: '140px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: 'bold', color: 'white', flexShrink: 0}}>
                      {result.channel_name.charAt(0)}
                    </div>
                  )}
                  <div className="channel-info" style={{flex: 1}}>
                    <h2>{result.channel_name}</h2>
                    <div className="info-row">
                      {result.subscriber_count && (
                        <span><strong>Subscribers:</strong> {result.subscriber_count.toLocaleString()}</span>
                      )}
                      {result.video_count && (
                        <span><strong>Videos:</strong> {result.video_count.toLocaleString()}</span>
                      )}
                    </div>
                    {result.description && (
                      <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: '1.4'}}>{result.description}</p>
                    )}
                    <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                      <button onClick={() => previewChannel(result)}>Preview</button>
                      <button onClick={() => addChannelFromSearch(result)} disabled={addingChannel === result.channel_id}>
                        {addingChannel === result.channel_id ? 'Adding...' : 'Add Channel'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'add' && (
        <div className="section">
          <h2>Add Channel Manually</h2>
          <form onSubmit={addChannel}>
            <input
              type="text"
              placeholder="Channel URL"
              value={newChannel.channel_url}
              onChange={(e) => setNewChannel({...newChannel, channel_url: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="Download Path"
              value={newChannel.download_path}
              onChange={(e) => setNewChannel({...newChannel, download_path: e.target.value})}
            />
            <select
              value={newChannel.quality}
              onChange={(e) => setNewChannel({...newChannel, quality: e.target.value})}
            >
              <option value="2160p">2160p (4K)</option>
              <option value="1080p">1080p (Full HD)</option>
              <option value="720p">720p (HD)</option>
              <option value="480p">480p (SD)</option>
              <option value="best">Best Available</option>
            </select>
            <button type="submit">Add Channel</button>
          </form>
        </div>
      )}

      {view === 'channel-detail' && (
        <>
          <button onClick={() => setView('home')} className="secondary" style={{marginBottom: '20px'}}>← Back to Channels</button>
          {loading ? (
            <div className="loading">
              <div className="loading-spinner">⏳</div>
              <p>Loading channel videos...</p>
            </div>
          ) : channelDetail && (
            <>
              <div className="channel-header">
                {channelDetail.channel.thumbnail && (
                  <img src={`/api/v1/proxy/image?url=${encodeURIComponent(channelDetail.channel.thumbnail)}`} alt={channelDetail.channel.channel_name} />
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
                    <p style={{fontSize: '13px', color: '#b3b3b3', marginTop: '10px', lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>{channelDetail.channel.description}</p>
                  )}
                  <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                    <button onClick={() => syncChannel(channelDetail.channel.id)}>
                      🔄 Sync Channel
                    </button>
                    <button onClick={() => toggleMonitor(channelDetail.channel.id)}>
                      {channelDetail.channel.monitored ? 'Pause Monitoring' : 'Resume Monitoring'}
                    </button>
                    <button onClick={() => deleteChannelFromDetail(channelDetail.channel.id)} className="danger">
                      Delete Channel
                    </button>
                  </div>
                </div>
              </div>
          
          {playlistsLoading && (
            <div style={{padding: '20px', textAlign: 'center'}}>
              <span style={{fontSize: '24px'}}>⏳</span> Loading playlists...
            </div>
          )}
          
          {!playlistsLoading && playlists.length > 0 && (
            <>
              <div className="section-header">
                <h3>Playlists</h3>
              </div>
              <div className="card-grid">
                {playlists.map(playlist => {
                  // Calculate status color
                  const totalVideos = playlist.video_count || 0;
                  const downloadedVideos = playlist.downloaded_count || 0;
                  
                  let statusColor = '#6c757d'; // gray default
                  if (playlist.monitored && downloadedVideos < totalVideos) {
                    statusColor = '#e74c3c'; // red - missing episodes (monitored)
                  } else if (!playlist.monitored && downloadedVideos < totalVideos && downloadedVideos > 0) {
                    statusColor = '#f39c12'; // orange - missing episodes (not monitored)
                  } else if (downloadedVideos === totalVideos && totalVideos > 0) {
                    statusColor = playlist.monitored ? '#5d9cec' : '#27ae60'; // blue - continuing (monitored), green - ended (not monitored)
                  }
                  
                  return (
                    <div 
                      key={playlist.playlist_id} 
                      className="playlist-card"
                      style={{'--status-color': statusColor}}
                    >
                      <div onClick={() => viewPlaylist(playlist.playlist_id)} style={{cursor: 'pointer'}}>
                        <h4>
                          {playlist.monitored && '✓ '}
                          📁 {playlist.title}
                        </h4>
                        <p>{playlist.video_count} videos • {playlist.downloaded_count || 0} downloaded</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistModal({
                            playlist_id: playlist.playlist_id,
                            title: playlist.title,
                            video_count: playlist.video_count,
                            monitored: playlist.monitored || false,
                            downloadAll: false
                          });
                        }}
                        style={{marginTop: '10px', width: '100%', fontSize: '12px', padding: '5px'}}
                      >
                        {playlist.monitored ? 'Manage Playlist' : 'Add Playlist'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="section-header">
            <h3>Videos ({channelDetail.loaded_videos} of {channelDetail.total_videos})</h3>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
              {selectedVideos.size > 0 && (
                <>
                  <span style={{fontSize: '14px', color: 'var(--text-secondary)'}}>{selectedVideos.size} selected</span>
                  <button onClick={() => {
                    selectedVideos.forEach(vid => downloadVideoById(vid));
                    setSelectedVideos(new Set());
                  }} style={{padding: '5px 10px'}}>Download Selected</button>
                  <button onClick={() => {
                    if (confirm(`Delete ${selectedVideos.size} videos?`)) {
                      selectedVideos.forEach(vid => deleteVideo(vid));
                      setSelectedVideos(new Set());
                    }
                  }} className="danger" style={{padding: '5px 10px'}}>Delete Selected</button>
                  <button onClick={() => setSelectedVideos(new Set())} style={{padding: '5px 10px', background: 'var(--bg-secondary)'}}>Clear</button>
                </>
              )}
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
            {channelDetail.videos.map(video => (
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
                <img src={video.thumbnail} alt={video.title} />
                <div className="video-card-content">
                  <h4>{video.title}</h4>
                  <p>{formatDuration(video.duration)} {video.view_count && `• ${(video.view_count / 1000).toFixed(0)}K views`}</p>
                  <p>
                    {video.downloaded ? '✅ Downloaded' : 
                     queue.find(q => q.video_id === video.video_id) ? '⏳ Downloading...' : 
                     '📥 Not Downloaded'}
                  </p>
                  {video.downloaded ? (
                    <button onClick={() => deleteVideo(video.video_id)} className="danger">Delete</button>
                  ) : (
                    <button onClick={() => downloadVideoById(video.video_id)} disabled={downloadingVideos.has(video.video_id)}>
                      {downloadingVideos.has(video.video_id) ? 'Queuing...' : 'Download'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {channelDetail.loaded_videos < channelDetail.total_videos && (
            <button onClick={loadMoreVideos} style={{marginTop: '20px', width: '100%'}}>
              Load More Videos
            </button>
          )}
            </>
          )}
        </>
      )}

      {view === 'playlist-detail' && playlistDetail && (
        <>
          <button onClick={() => setView('channel-detail')} className="secondary" style={{marginBottom: '20px'}}>← Back to Channel</button>
          
          <div className="section-header">
            <h3>Playlist Videos ({playlistDetail.length})</h3>
          </div>
          <div className="video-grid">
            {playlistDetail.map(video => (
              <div key={video.video_id} className="video-card">
                <img src={`https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`} alt={video.title} />
                <div className="video-card-content">
                  <h4>{video.title}</h4>
                  <p>{formatDuration(video.duration)}</p>
                  <p>
                    {video.downloaded ? '✅ Downloaded' : 
                     queue.find(q => q.video_id === video.video_id) ? '⏳ Downloading...' : 
                     '📥 Not Downloaded'}
                  </p>
                  {video.downloaded ? (
                    <button onClick={() => deleteVideo(video.video_id)} className="danger">Delete</button>
                  ) : (
                    <button onClick={() => downloadVideoById(video.video_id)} disabled={downloadingVideos.has(video.video_id)}>
                      {downloadingVideos.has(video.video_id) ? 'Queuing...' : 'Download'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'channel-preview' && channelPreview && (
        <>
          <button onClick={() => setView('search')} className="secondary" style={{marginBottom: '20px'}}>← Back to Search</button>
          
          <div className="channel-header">
            {channelPreview.search_result.thumbnail && (
              <img src={channelPreview.search_result.thumbnail} alt={channelPreview.channel_name} />
            )}
            <div className="channel-info">
              <h2>{channelPreview.channel_name}</h2>
              <div className="info-row">
                {channelPreview.search_result.subscriber_count && (
                  <span><strong>Subscribers:</strong> {channelPreview.search_result.subscriber_count.toLocaleString()}</span>
                )}
                {channelPreview.search_result.video_count && (
                  <span><strong>Videos:</strong> {channelPreview.search_result.video_count.toLocaleString()}</span>
                )}
              </div>
              {channelPreview.search_result.description && (
                <p style={{fontSize: '13px', color: '#b3b3b3', marginTop: '10px', lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>{channelPreview.search_result.description}</p>
              )}
              <button onClick={() => addChannelFromSearch(channelPreview.search_result)} style={{marginTop: '15px'}} disabled={addingChannel === channelPreview.search_result.channel_id}>
                {addingChannel === channelPreview.search_result.channel_id ? 'Adding Channel...' : 'Add This Channel'}
              </button>
            </div>
          </div>

          <div className="section-header">
            <h3>Recent Videos</h3>
          </div>
          <div className="video-grid">
            {channelPreview.videos.map(video => (
              <div key={video.video_id} className="video-card">
                <img src={video.thumbnail} alt={video.title} />
                <div className="video-card-content">
                  <h4>{video.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'settings' && (
        <>
          <div className="page-header">
            <h2>Settings</h2>
          </div>

          <div className="settings-tabs">
            <button 
              onClick={() => setSettingsTab('general')} 
              className={settingsTab === 'general' ? 'active' : ''}
            >
              General
            </button>
            <button 
              onClick={() => setSettingsTab('media')} 
              className={settingsTab === 'media' ? 'active' : ''}
            >
              Media Management
            </button>
            <button 
              onClick={() => setSettingsTab('quality')} 
              className={settingsTab === 'quality' ? 'active' : ''}
            >
              Quality
            </button>
            <button 
              onClick={() => setSettingsTab('ui')} 
              className={settingsTab === 'ui' ? 'active' : ''}
            >
              UI
            </button>
          </div>

          {settingsTab === 'general' && (
            <div className="settings-section">
              <h3 style={{marginBottom: '20px'}}>General</h3>
              
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>API Key</label>
                <div style={{display: 'flex', gap: '10px'}}>
                  <input 
                    type="text" 
                    value={settings.apiKey || 'Not generated'} 
                    readOnly 
                    style={{flex: 1}} 
                  />
                  <button onClick={generateApiKey}>Generate New Key</button>
                </div>
                <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px'}}>Required for API access and integrations</p>
              </div>

              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Default Download Path</label>
                <input 
                  type="text" 
                  value={settings.defaultPath} 
                  onChange={(e) => setSettings({...settings, defaultPath: e.target.value})}
                  style={{width: '100%'}} 
                />
                <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px'}}>Where new channels will download by default</p>
              </div>

              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Auto Sync</label>
                <label style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <input 
                    type="checkbox" 
                    checked={settings.autoSync}
                    onChange={(e) => setSettings({...settings, autoSync: e.target.checked})}
                  />
                  <span>Automatically check for new videos</span>
                </label>
              </div>

              {settings.autoSync && (
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Sync Interval (minutes)</label>
                  <input 
                    type="number" 
                    value={settings.syncInterval} 
                    onChange={(e) => setSettings({...settings, syncInterval: parseInt(e.target.value)})}
                    min="5"
                    max="1440"
                    style={{width: '200px'}} 
                  />
                </div>
              )}

              <button onClick={saveSettings}>Save Settings</button>
            </div>
          )}

          {settingsTab === 'media' && (
            <div className="settings-section">
              <h3 style={{marginBottom: '20px'}}>Media Management</h3>
              
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>File Naming Format</label>
                <select 
                  value={settings.namingFormat}
                  onChange={(e) => setSettings({...settings, namingFormat: e.target.value})}
                  style={{width: '100%', marginBottom: '10px'}}
                >
                  <option value="standard">Standard: Channel - S01E01 - Title</option>
                  <option value="scene">Scene: Channel.S01E01.Title</option>
                  <option value="plex">Plex: Channel - s01e01 - Title</option>
                  <option value="custom">Custom Pattern</option>
                </select>
              </div>

              {settings.namingFormat === 'custom' && (
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Custom Pattern</label>
                  <input 
                    type="text" 
                    value={settings.customNaming || '{channel} - S{season:00}E{episode:000} - {title}'}
                    onChange={(e) => setSettings({...settings, customNaming: e.target.value})}
                    style={{width: '100%', marginBottom: '5px'}} 
                  />
                  <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px'}}>
                    Tokens: {'{channel}'}, {'{title}'}, {'{season:00}'}, {'{episode:000}'}, {'{id}'}, {'{date}'}
                  </p>
                  <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px'}}>
                    Example: {settings.customNaming?.replace('{channel}', 'Linus Tech Tips').replace('{season:00}', '01').replace('{episode:000}', '042').replace('{title}', 'This GPU is INSANE').replace('{id}', 'dQw4w9WgXcQ').replace('{date}', '2025-01-15') || 'Enter pattern above'}
                  </p>
                </div>
              )}

              {settings.namingFormat !== 'custom' && (
                <div style={{marginBottom: '20px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '4px'}}>
                  <div style={{fontSize: '12px', color: 'var(--text-secondary)'}}>Preview:</div>
                  <div style={{fontSize: '14px', marginTop: '5px'}}>
                    {settings.namingFormat === 'standard' && 'Linus Tech Tips - S01E042 - This GPU is INSANE.mkv'}
                    {settings.namingFormat === 'scene' && 'Linus.Tech.Tips.S01E042.This.GPU.is.INSANE.mkv'}
                    {settings.namingFormat === 'plex' && 'Linus Tech Tips - s01e42 - This GPU is INSANE.mkv'}
                  </div>
                </div>
              )}

              <button onClick={saveSettings}>Save Settings</button>
            </div>
          )}

          {settingsTab === 'quality' && (
            <div className="settings-section">
              <h3 style={{marginBottom: '20px'}}>Quality Profiles</h3>
              
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Default Quality</label>
                <select 
                  value={settings.defaultQuality}
                  onChange={(e) => setSettings({...settings, defaultQuality: e.target.value})}
                  style={{width: '100%'}}
                >
                  <option value="2160p">2160p (4K)</option>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="720p">720p (HD)</option>
                  <option value="480p">480p (SD)</option>
                  <option value="best">Best Available</option>
                </select>
              </div>

              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Preferred Format</label>
                <select style={{width: '100%'}}>
                  <option value="mkv">MKV (Matroska)</option>
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                </select>
              </div>

              <button onClick={saveSettings}>Save Settings</button>
            </div>
          )}

          {settingsTab === 'ui' && (
            <div className="settings-section">
              <h3 style={{marginBottom: '20px'}}>UI Settings</h3>
              
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Theme</label>
                <select 
                  value={settings.theme}
                  onChange={(e) => setSettings({...settings, theme: e.target.value})}
                  style={{width: '100%'}}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>

              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Videos Per Page</label>
                <input type="number" defaultValue="50" min="10" max="200" style={{width: '200px'}} />
              </div>

              <button onClick={saveSettings}>Save Settings</button>
            </div>
          )}

          <div className="settings-section" style={{marginTop: '20px'}}>
            <h3 style={{marginBottom: '15px'}}>System Information</h3>
            <div style={{display: 'grid', gridTemplateColumns: '200px 1fr', gap: '10px', fontSize: '14px'}}>
              <span style={{color: 'var(--text-secondary)'}}>Version:</span>
              <span>{status.app_version || '1.0.2'}</span>
              <span style={{color: 'var(--text-secondary)'}}>yt-dlp Version:</span>
              <span>{status.ytdlp_version || 'unknown'}</span>
              <span style={{color: 'var(--text-secondary)'}}>Backend Status:</span>
              <span style={{color: '#5d9cec'}}>● Running</span>
              <span style={{color: 'var(--text-secondary)'}}>Database:</span>
              <span>{status.videos} videos, {status.downloaded} downloaded</span>
              <span style={{color: 'var(--text-secondary)'}}>Channels:</span>
              <span>{status.channels} monitored</span>
            </div>
          </div>
        </>
      )}
      </div>

      {channelModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{background: 'var(--bg-primary)', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '90%'}}>
            <h2 style={{marginBottom: '20px'}}>Add Channel</h2>
            
            <div style={{display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center'}}>
              {channelModal.thumbnail && (
                <img src={channelModal.thumbnail} alt="" style={{width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover'}} />
              )}
              <div>
                <div style={{fontSize: '18px', fontWeight: 'bold'}}>{channelModal.channel_name}</div>
              </div>
            </div>

            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>Download Path</label>
              <input 
                type="text" 
                value={channelModal.download_path}
                onChange={(e) => setChannelModal({...channelModal, download_path: e.target.value})}
                style={{width: '100%'}}
              />
            </div>

            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>Quality</label>
              <select 
                value={channelModal.quality}
                onChange={(e) => setChannelModal({...channelModal, quality: e.target.value})}
                style={{width: '100%'}}
              >
                <option value="2160p">2160p (4K)</option>
                <option value="1080p">1080p (Full HD)</option>
                <option value="720p">720p (HD)</option>
                <option value="480p">480p (SD)</option>
                <option value="best">Best Available</option>
              </select>
            </div>

            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}>
                <input 
                  type="checkbox" 
                  checked={channelModal.monitored}
                  onChange={(e) => setChannelModal({...channelModal, monitored: e.target.checked})}
                />
                <span>Monitor this channel for new videos</span>
              </label>
            </div>

            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
              <button onClick={() => setChannelModal(null)} style={{background: 'var(--bg-secondary)'}}>Cancel</button>
              <button onClick={confirmAddChannel} disabled={addingChannel}>
                {addingChannel ? 'Adding...' : 'Add Channel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {playlistModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{background: 'var(--bg-primary)', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '90%'}}>
            <h2 style={{marginBottom: '20px'}}>{playlistModal.monitored ? 'Manage' : 'Add'} Playlist</h2>
            
            <div style={{marginBottom: '20px'}}>
              <div style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '5px'}}>📁 {playlistModal.title}</div>
              <div style={{fontSize: '14px', color: 'var(--text-secondary)'}}>{playlistModal.video_count} videos</div>
            </div>

            {!playlistModal.monitored && (
              <>
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}>
                    <input 
                      type="checkbox" 
                      checked={playlistModal.downloadAll}
                      onChange={(e) => setPlaylistModal({...playlistModal, downloadAll: e.target.checked})}
                    />
                    <span>Download all existing videos now</span>
                  </label>
                  <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px', marginLeft: '30px'}}>
                    If unchecked, only new videos added to the playlist will be downloaded
                  </p>
                </div>
              </>
            )}

            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
              <button onClick={() => setPlaylistModal(null)} style={{background: 'var(--bg-secondary)'}}>Cancel</button>
              <button onClick={confirmPlaylist}>
                {playlistModal.monitored ? 'Unmonitor' : 'Monitor Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
