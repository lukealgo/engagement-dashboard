import React from 'react';
import type { Channel } from '../services/api';

interface ChannelSelectorProps {
  channels: Channel[];
  selectedChannel: string;
  onChannelChange: (channelId: string) => void;
}

const ChannelSelector: React.FC<ChannelSelectorProps> = ({
  channels,
  selectedChannel,
  onChannelChange,
}) => {
  return (
    <div className="channel-selector">
      <label htmlFor="channel-select">Channel:</label>
      <select
        id="channel-select"
        value={selectedChannel}
        onChange={(e) => onChannelChange(e.target.value)}
        className="channel-select"
      >
        <option value="">Select a channel</option>
        {channels.map((channel) => (
          <option key={channel.id} value={channel.id}>
            #{channel.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ChannelSelector;