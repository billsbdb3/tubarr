import React, { createContext, useContext, useState, useEffect } from 'react';
import { channelsApi } from '../api/channels';
import { videosApi } from '../api/videos';
import { systemApi } from '../api/system';

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
    apiKey: '',
    defaultPath: '/downloads',
    defaultQuality: '1080p',
    autoSync: true,
    syncInterval: 15,
    theme: 'dark',
    namingFormat: 'standard',
    customNaming: '{channel} - S{season:00}E{episode:000} - {title}'
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const loadChannels = async () => {
    try {
      const res = await channelsApi.getAll();
      setChannels(res.data);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const loadQueue = async () => {
    try {
      const res = await videosApi.getQueue();
      setQueue(res.data);
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  };

  const loadStatus = async () => {
    try {
      const res = await systemApi.getStatus();
      setStatus(res.data);
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await systemApi.getSettings();
      setSettings(prev => ({ ...prev, ...res.data }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await systemApi.updateSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  const value = {
    view,
    setView,
    channels,
    setChannels,
    loadChannels,
    queue,
    loadQueue,
    status,
    loadStatus,
    settings,
    saveSettings
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
