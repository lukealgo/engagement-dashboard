import React from 'react';
import type { EngagementSummary } from '../services/api';

interface MetricCardsProps {
  activity: EngagementSummary;
}

const MetricCards: React.FC<MetricCardsProps> = ({ activity }) => {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      default:
        return '→';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return '#4CAF50';
      case 'down':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };

  return (
    <div className="metric-cards">
      <div className="metric-card">
        <h3>Total Messages</h3>
        <div className="metric-value">{activity.total_messages.toLocaleString()}</div>
      </div>
      
      <div className="metric-card">
        <h3>Active Users</h3>
        <div className="metric-value">{activity.total_users.toLocaleString()}</div>
      </div>
      
      <div className="metric-card">
        <h3>Total Reactions</h3>
        <div className="metric-value">{activity.total_reactions.toLocaleString()}</div>
      </div>
      
      <div className="metric-card">
        <h3>Engagement Score</h3>
        <div className="metric-value">
          {activity.avg_engagement_score.toFixed(1)}
          <span 
            className="trend-icon"
            style={{ color: getTrendColor(activity.trend) }}
          >
            {getTrendIcon(activity.trend)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MetricCards;