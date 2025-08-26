import React from 'react';

interface ChannelBreakdownProps {
  channels: Array<{
    channel_id: string;
    channel_name: string;
    message_count: number;
    user_count: number;
    engagement_score: number;
  }>;
}

const ChannelBreakdown: React.FC<ChannelBreakdownProps> = ({ channels }) => {
  if (channels.length === 0) {
    return <div className="no-data">No channel data available</div>;
  }

  return (
    <div className="channel-breakdown">
      <div className="channel-breakdown-grid">
        {channels.map((channel, index) => (
          <div key={channel.channel_id} className="channel-card">
            <div className="channel-rank">#{index + 1}</div>
            <div className="channel-info">
              <h4 className="channel-name">#{channel.channel_name}</h4>
              <div className="channel-stats">
                <div className="stat">
                  <span className="stat-label">Messages:</span>
                  <span className="stat-value">{channel.message_count.toLocaleString()}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Users:</span>
                  <span className="stat-value">{channel.user_count.toLocaleString()}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Score:</span>
                  <span className="stat-value">{channel.engagement_score.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChannelBreakdown;