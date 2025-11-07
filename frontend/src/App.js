import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ChannelList } from './components/views/ChannelList';
import { ChannelDetailView } from './components/views/ChannelDetailView';
import { PlaylistDetail } from './components/views/PlaylistDetail';
import { ChannelPreview } from './components/views/ChannelPreview';
import { ActivityView } from './components/views/ActivityView';
import { SearchView } from './components/views/SearchView';
import { AddChannel } from './components/views/AddChannel';
import { SettingsView } from './components/views/SettingsView';
import { ChannelModal, PlaylistModal } from './components/Modals';
import './App.css';

function App() {
  const [view, setView] = useState(localStorage.getItem('tubarr_view') || 'home');
  const [channels, setChannels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [channelDetail, setChannelDetail] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [playlistDetail, setPlaylistDetail] = useState(null);
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterBy, setFilterBy] = useState('all');
  const [channelPreview, setChannelPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rescanLoading, setRescanLoading] = useState(false);
  const [downloadingVideos, setDownloadingVideos] = useState(new Set());
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [addingChannel, setAddingChannel] = useState(null);
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

  useEffect(() => {
    localStorage.setItem('tubarr_view', view);
  }, [view]);

  useEffect(() => {
    loadChannels();
    loadStatus();
    loadSettings();
    loadQueue();
  }, []);

  // WebSocket for real-time updates
  useEffect(() => {
    const wsUrl = `ws://${window.location.host}/api/v1/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'queue_update') {
          setQueue(data.queue);
        } else if (data.type === 'channel_update') {
          loadChannels();
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = () => console.log('WebSocket error');
    ws.onclose = () => console.log('WebSocket closed');

    return () => ws.close();
  }, []);

  // Polling for views
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
      const interval = setInterval(async () => {
        loadQueue();
        const res = await axios.get(`/api/v1/channel/${channelDetail.channel.id}?limit=${loadedVideosRef.current}&offset=0&sort=${sortBy}&filter=${filterBy}`);
        setChannelDetail(res.data);
      }, 5000);
      return () => clearInterval(interval);
    } else if (view === 'playlist-detail' && playlistDetail && playlistDetail.length > 0) {
      const interval = setInterval(async () => {
        loadQueue();
        const playlistId = playlistDetail[0]?.playlist_id;
        if (playlistId) {
          const res = await axios.get(`/api/v1/playlist/${playlistId}`);
          setPlaylistDetail(res.data);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [view, channelDetail?.channel?.id, playlistDetail, sortBy, filterBy]);

  useEffect(() => {
    if (view === 'channel-detail' && channelDetail) {
      const reloadWithFilters = async () => {
        const res = await axios.get(`/api/v1/channel/${channelDetail.channel.id}?limit=25&offset=0&sort=${sortBy}&filter=${filterBy}`);
        setChannelDetail(res.data);
      };
      reloadWithFilters();
    }
  }, [sortBy, filterBy]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const loadChannels = async () => {
    const res = await axios.get('/api/v1/channel');
    setChannels(res.data);
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

  const loadSettings = async () => {
    try {
      const res = await axios.get('/api/v1/settings');
      setSettings(res.data);
    } catch (e) {
      console.log('Settings not found, using defaults');
    }
  };

  const addChannel = async (e) => {
    e.preventDefault();
    await axios.post('/api/v1/channel', newChannel);
    setNewChannel({ channel_url: '', download_path: settings.defaultPath || '/downloads', quality: '1080p' });
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

  const viewPlaylist = async (playlistId) => {
    const res = await axios.get(`/api/v1/playlist/${playlistId}`);
    const videosWithPlaylistId = res.data.map(v => ({...v, playlist_id: playlistId}));
    setPlaylistDetail(videosWithPlaylistId);
    setView('playlist-detail');
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const downloadVideoById = async (youtubeVideoId, channelId = null) => {
    const cid = channelId || (channelDetail ? channelDetail.channel.id : null);
    if (!cid) {
      alert('Channel not found');
      return;
    }
    
    setDownloadingVideos(prev => new Set(prev).add(youtubeVideoId));
    try {
      await axios.post(`/api/v1/video/download/${youtubeVideoId}`, { channel_id: cid });
      setDownloadingVideos(prev => {
        const next = new Set(prev);
        next.delete(youtubeVideoId);
        return next;
      });
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
      if (channelDetail) {
        const res = await axios.get(`/api/v1/channel/${channelDetail.channel.id}`);
        setChannelDetail(res.data);
      }
      if (playlistDetail) {
        const playlistId = playlistDetail[0]?.playlist_id;
        if (playlistId) {
          const res = await axios.get(`/api/v1/playlist/${playlistId}`);
          setPlaylistDetail(res.data);
        }
      }
    }
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
      const playlistRes = await axios.get(`/api/v1/channel/${channelDetail.channel.id}/playlists`);
      setPlaylists(playlistRes.data);
    } catch (error) {
      alert('Failed: ' + error.message);
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
          <ChannelList 
            channels={channels}
            queue={queue}
            status={status}
            onChannelClick={viewChannelDetail}
          />
        )}

        {view === 'channel-detail' && (
          <ChannelDetailView
            channelDetail={channelDetail}
            loading={loading}
            playlists={playlists}
            playlistsLoading={playlistsLoading}
            selectedVideos={selectedVideos}
            setSelectedVideos={setSelectedVideos}
            sortBy={sortBy}
            setSortBy={setSortBy}
            filterBy={filterBy}
            setFilterBy={setFilterBy}
            queue={queue}
            downloadingVideos={downloadingVideos}
            setView={setView}
            syncChannel={syncChannel}
            toggleMonitor={toggleMonitor}
            deleteChannelFromDetail={deleteChannelFromDetail}
            viewPlaylist={viewPlaylist}
            setPlaylistModal={setPlaylistModal}
            downloadVideoById={downloadVideoById}
            deleteVideo={deleteVideo}
            loadMoreVideos={loadMoreVideos}
            formatDuration={formatDuration}
          />
        )}

        {view === 'playlist-detail' && playlistDetail && (
          <PlaylistDetail
            playlistDetail={playlistDetail}
            queue={queue}
            downloadingVideos={downloadingVideos}
            formatDuration={formatDuration}
            deleteVideo={deleteVideo}
            downloadVideoById={downloadVideoById}
            onBack={() => setView('channel-detail')}
          />
        )}

        {view === 'channel-preview' && channelPreview && (
          <ChannelPreview
            channelPreview={channelPreview}
            addingChannel={addingChannel}
            addChannelFromSearch={addChannelFromSearch}
            onBack={() => setView('search')}
          />
        )}

        {view === 'activity' && (
          <ActivityView queue={queue} history={history} />
        )}

        {view === 'search' && (
          <SearchView 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            addingChannel={addingChannel}
            setChannelModal={setChannelModal}
            setChannelPreview={setChannelPreview}
            setView={setView}
            settings={settings}
          />
        )}

        {view === 'add' && (
          <AddChannel
            newChannel={newChannel}
            setNewChannel={setNewChannel}
            onSubmit={addChannel}
          />
        )}

        {view === 'settings' && (
          <SettingsView 
            settings={settings}
            setSettings={setSettings}
            settingsTab={settingsTab}
            setSettingsTab={setSettingsTab}
            status={status}
          />
        )}
      </div>

      <ChannelModal
        channelModal={channelModal}
        setChannelModal={setChannelModal}
        addingChannel={addingChannel}
        onConfirm={confirmAddChannel}
      />

      <PlaylistModal
        playlistModal={playlistModal}
        setPlaylistModal={setPlaylistModal}
        onConfirm={confirmPlaylist}
      />
    </div>
  );
}

export default App;
