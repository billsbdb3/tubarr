import React from 'react';
import { useApp } from '../../context/AppContext';
import { systemApi } from '../../api/system';
import { getStatusColor } from '../../utils/formatters';

export const ChannelList = ({ onChannelClick }) => {
  const { channels, queue, status } = useApp();

  return (
    <>
      <div className="page-header">
        <h2>Channels</h2>
        <div className="stats">
          <span>{status.channels || 0} Channels • {status.downloaded || 0} Downloaded</span>
        </div>
      </div>

      <div className="card-grid">
        {channels.map(channel => {
          const statusColor = getStatusColor(channel, queue);
          
          return (
            <div 
              key={channel.id} 
              className="card" 
              onClick={() => onChannelClick(channel)}
              style={{'--status-color': statusColor}}
            >
              {channel.thumbnail ? (
                <img 
                  src={systemApi.proxyImage(channel.thumbnail)} 
                  alt={channel.channel_name} 
                  style={{aspectRatio: '1', borderRadius: '50%'}} 
                />
              ) : (
                <div style={{
                  width: '100%', 
                  aspectRatio: '1', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '32px', 
                  fontWeight: 'bold', 
                  color: 'white'
                }}>
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
  );
};
