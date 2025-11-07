import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { channelsApi } from '../api/channels';
import { videosApi } from '../api/videos';
import { systemApi } from '../api/system';
import { useWebSocket } from '../hooks/useWebSocket';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  const [view, setView] = useState(localStorage.getItem('tubarr_view') || 'home');
  const [channels, setChannels] = useState([]);
  const [queue, setQueue] = useState([]);
  const [status, setStatus] = useState({});
  const [settings, setSettings] = useState({
    download_path: '/downloads',
    quality: 'best',
    download_subtitles: false,
    embed_metadata: true,
    check_interval: 60,
    max_concurrent: 3
  });

  useEffect(() => {
    localStorage.setItem('tubarr_view', view);
  }, [view]);

  useEffect(() => {
    loadChannels();
    loadQueue();
    loadStatus();
    loadSettings();
  }, []);

  const loadChannels = async () => {
    try {
      const data = await channelsApi.getAll();
      setChannels(data);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const loadQueue = async () => {
    try {
      const data = await videosApi.getQueue();
      setQueue(data);
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  };

  const loadStatus = async () => {
    try {
      const data = await systemApi.getStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await systemApi.getSettings();
      setSettings(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'queue_update') {
      setQueue(data.queue);
    } else if (data.type === 'channel_update') {
      loadChannels();
    } else if (data.type === 'status_update') {
      setStatus(data.status);
    }
  }, []);

  const wsUrl = `ws://${window.location.host}/api/v1/ws`;
  useWebSocket(wsUrl, handleWebSocketMessage);

  const value = {
    view,
    setView,
    channels,
    setChannels,
    refreshChannels: loadChannels,
    queue,
    setQueue,
    refreshQueue: loadQueue,
    status,
    refreshStatus: loadStatus,
    settings,
    refreshSettings: loadSettings
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
