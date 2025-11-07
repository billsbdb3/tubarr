import React, { useState, useEffect } from 'react';
import { systemApi } from '../../api/system';
import { useApp } from '../../context/AppContext';

export function SettingsView() {
  const { settings, refreshSettings } = useApp();
  const [localSettings, setLocalSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [rescanning, setRescanning] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await systemApi.updateSettings(localSettings);
      await refreshSettings();
      alert('Settings saved successfully');
    } catch (error) {
      alert('Failed to save settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await systemApi.sync();
      alert('Sync completed');
    } catch (error) {
      alert('Sync failed');
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const handleRescan = async () => {
    setRescanning(true);
    try {
      await systemApi.rescan();
      alert('Rescan completed');
    } catch (error) {
      alert('Rescan failed');
      console.error(error);
    } finally {
      setRescanning(false);
    }
  };

  const updateSetting = (key, value) => {
    setLocalSettings({ ...localSettings, [key]: value });
  };

  return (
    <div className="settings-view">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>Download Settings</h3>
        
        <div className="setting-item">
          <label>Download Path</label>
          <input
            type="text"
            value={localSettings.download_path || ''}
            onChange={(e) => updateSetting('download_path', e.target.value)}
          />
        </div>

        <div className="setting-item">
          <label>Video Quality</label>
          <select
            value={localSettings.quality || 'best'}
            onChange={(e) => updateSetting('quality', e.target.value)}
          >
            <option value="best">Best</option>
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
          </select>
        </div>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={localSettings.download_subtitles || false}
              onChange={(e) => updateSetting('download_subtitles', e.target.checked)}
            />
            Download Subtitles
          </label>
        </div>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={localSettings.embed_metadata || false}
              onChange={(e) => updateSetting('embed_metadata', e.target.checked)}
            />
            Embed Metadata
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Monitoring Settings</h3>
        
        <div className="setting-item">
          <label>Check Interval (minutes)</label>
          <input
            type="number"
            value={localSettings.check_interval || 60}
            onChange={(e) => updateSetting('check_interval', parseInt(e.target.value))}
            min="5"
          />
        </div>

        <div className="setting-item">
          <label>Max Concurrent Downloads</label>
          <input
            type="number"
            value={localSettings.max_concurrent || 3}
            onChange={(e) => updateSetting('max_concurrent', parseInt(e.target.value))}
            min="1"
            max="10"
          />
        </div>
      </div>

      <div className="settings-actions">
        <button onClick={handleSave} disabled={saving} className="primary">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="settings-section">
        <h3>System Actions</h3>
        
        <div className="action-buttons">
          <button onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync All Channels'}
          </button>
          <button onClick={handleRescan} disabled={rescanning}>
            {rescanning ? 'Rescanning...' : 'Rescan Library'}
          </button>
        </div>
      </div>
    </div>
  );
}
