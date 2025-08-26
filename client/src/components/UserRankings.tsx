import React, { useState, useEffect } from 'react';
import type { UserRanking } from '../services/api';
import { engagementApi } from '../services/api';

interface UserRankingsProps {
  channelId?: string; // Make channelId optional for workspace-wide rankings
  timeRange: number;
}

const UserRankings: React.FC<UserRankingsProps> = ({ channelId, timeRange }) => {
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRankings(); // Always load rankings - channelId can be undefined for workspace-wide
  }, [channelId, timeRange]);

  const loadRankings = async () => {
    try {
      setLoading(true);
      const data = await engagementApi.getUserRankings({
        channelId: channelId || undefined, // Send undefined instead of empty string for workspace-wide
        days: timeRange,
      });
      setRankings(data);
    } catch (error) {
      console.error('Failed to load user rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'var(--color-accent-blue)',
      'var(--color-accent-green)',
      'var(--color-accent-orange)',
      'var(--color-accent-red)',
      'var(--color-primary-500)',
      'var(--color-primary-600)'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const LoadingSkeleton = () => (
    <div className="rankings-loading">
      <div className="loading-spinner"></div>
      <p>Loading rankings...</p>
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="user-rankings">

      <div className="rankings-list">
        {rankings.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">📊</div>
            <h3>No data available</h3>
            <p>Rankings will appear here once there's activity data</p>
          </div>
        ) : (
          rankings.map((user, index) => (
            <div 
              key={user.user_id} 
              className={`ranking-item ${index < 3 ? 'ranking-item--top' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="rank-badge">
                {getRankBadge(user.rank)}
              </div>
              
              <div 
                className="user-avatar"
                style={{ backgroundColor: getAvatarColor(user.user_name) }}
              >
                {getInitials(user.user_name)}
              </div>
              
              <div className="user-info">
                <div className="user-name">{user.user_name}</div>
                <div className="user-stats">
                  <div className="stat">
                    <span className="stat-icon">💬</span>
                    <span className="stat-label">Messages:</span>
                    <span className="stat-value">{user.message_count.toLocaleString()}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-icon">⚡</span>
                    <span className="stat-label">Reactions:</span>
                    <span className="stat-value">{user.reaction_count.toLocaleString()}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-icon">📊</span>
                    <span className="stat-label">Score:</span>
                    <span className="stat-value">{user.engagement_score.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              
              {index < 3 && (
                <div className="achievement-badge">
                  {index === 0 && '👑'}
                  {index === 1 && '🌟'}
                  {index === 2 && '⭐'}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserRankings;