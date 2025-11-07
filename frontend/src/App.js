import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ChannelList } from './components/views/ChannelList';
import { ChannelDetail } from './components/views/ChannelDetail';
import { ActivityView } from './components/views/ActivityView';
import { SearchView } from './components/views/SearchView';
import { SettingsView } from './components/views/SettingsView';
import './App.css';

function AppContent() {
  const { view, setView, queue } = useApp();
  const [selectedChannel, setSelectedChannel] = useState(null);

  const handleChannelClick = (channel) => {
    setSelectedChannel(channel);
    setView('channel-detail');
  };

  const handleBackToChannels = () => {
    setSelectedChannel(null);
    setView('home');
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h1>📺 Tubarr</h1>
        <nav>
          <button 
            className={view === 'home' ? 'active' : ''} 
            onClick={() => setView('home')}
          >
            🏠 Channels
          </button>
          <button 
            className={view === 'activity' ? 'active' : ''} 
            onClick={() => setView('activity')}
          >
            📊 Activity
            {queue.filter(v => v.status === 'Pending' || v.status.includes('Downloading') || v.status === 'Queued').length > 0 && (
              <span className="badge">
                {queue.filter(v => v.status === 'Pending' || v.status.includes('Downloading') || v.status === 'Queued').length}
              </span>
            )}
          </button>
          <button 
            className={view === 'search' ? 'active' : ''} 
            onClick={() => setView('search')}
          >
            🔍 Search
          </button>
          <button 
            className={view === 'settings' ? 'active' : ''} 
            onClick={() => setView('settings')}
          >
            ⚙️ Settings
          </button>
        </nav>
      </div>

      <div className="main-content">
        {view === 'home' && (
          <ChannelList onChannelClick={handleChannelClick} />
        )}

        {view === 'channel-detail' && selectedChannel && (
          <ChannelDetail 
            channel={selectedChannel} 
            onBack={handleBackToChannels}
          />
        )}

        {view === 'activity' && <ActivityView />}

        {view === 'search' && <SearchView />}

        {view === 'settings' && <SettingsView />}
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
