import React from 'react';
import type { WorkspaceOverview } from '../services/api';
import Tooltip from './Tooltip';

interface WorkspaceMetricsProps {
  overview: WorkspaceOverview;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, trend, color }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '';
    }
  };

  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="metric-icon" style={{ color }}>{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className="metric-value">
        {value}
        {trend && <span className="trend-icon">{getTrendIcon()}</span>}
      </div>
      <div className="metric-subtitle">{subtitle}</div>
    </div>
  );
};

const WorkspaceMetrics: React.FC<WorkspaceMetricsProps> = ({ overview }) => {
  const EngagementScoreTooltip = () => (
    <div className="engagement-tooltip">
      <h4>📊 Engagement Score Calculation</h4>
      <p>Measures average engagement per active user using weighted activities:</p>
      
      <div className="formula">
        Score = (Messages + Reactions×2 + Threads×1.5 + Users×0.5) ÷ Active Users
      </div>
      
      <div className="weights">
        <strong>Activity Weights:</strong>
        <ul>
          <li><strong>Messages:</strong> 1.0 (base activity)</li>
          <li><strong>Reactions:</strong> 2.0 (deeper engagement)</li>
          <li><strong>Thread Replies:</strong> 1.5 (conversation depth)</li>
          <li><strong>User Participation:</strong> 0.5 (collaboration bonus)</li>
        </ul>
      </div>
      
      <div className="example">
        <strong>Example:</strong> 100 messages, 50 reactions, 20 threads, 25 users<br/>
        Score = (100 + 100 + 30 + 12.5) ÷ 25 = <strong>9.7</strong>
      </div>
      
      <p><em>Higher scores indicate more engaged conversations per participant.</em></p>
    </div>
  );

  return (
    <div className="metric-cards">
      <MetricCard
        title="Total Channels"
        value={overview.total_channels}
        subtitle="Active channels"
        icon="📺"
        color="var(--color-accent-blue)"
      />
      
      <MetricCard
        title="Total Messages"
        value={overview.total_messages.toLocaleString()}
        subtitle="Across all channels"
        icon="💬"
        color="var(--color-accent-green)"
      />
      
      <MetricCard
        title="Active Users"
        value={overview.total_users.toLocaleString()}
        subtitle="Participating members"
        icon="👥"
        color="var(--color-accent-orange)"
      />
      
      <MetricCard
        title="Total Reactions"
        value={overview.total_reactions.toLocaleString()}
        subtitle="Engagement indicators"
        icon="⚡"
        color="var(--color-accent-blue)"
      />
      
      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-icon" style={{ color: "var(--color-accent-green)" }}>📊</span>
          <h3>Avg Engagement</h3>
          <Tooltip content={<EngagementScoreTooltip />} position="bottom" maxWidth="400px">
            <span className="info-icon" style={{ fontSize: 'var(--font-size-sm)', cursor: 'help', color: 'var(--color-accent-blue)' }}>
              ℹ️
            </span>
          </Tooltip>
        </div>
        <div className="metric-value">
          {overview.avg_engagement_score.toFixed(1)}
          <span className="trend-icon">➡️</span>
        </div>
        <div className="metric-subtitle">Engagement score</div>
      </div>
      
      <MetricCard
        title="Most Active Channel"
        value={`#${overview.most_active_channel.name}`}
        subtitle={`${overview.most_active_channel.message_count} messages`}
        icon="🏆"
        color="var(--color-accent-orange)"
      />
    </div>
  );
};

export default WorkspaceMetrics;