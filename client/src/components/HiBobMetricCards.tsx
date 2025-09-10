import React from 'react';
import type { HiBobDashboardMetrics } from '../services/api';

interface HiBobMetricCardsProps {
  metrics: HiBobDashboardMetrics;
  loading?: boolean;
}

const HiBobMetricCards: React.FC<HiBobMetricCardsProps> = ({ metrics, loading = false }) => {
  if (loading) {
    return (
      <div className="metric-cards hibob-metrics">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="metric-card skeleton">
            <div className="skeleton-title"></div>
            <div className="skeleton-value"></div>
          </div>
        ))}
      </div>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <div className="metric-cards hibob-metrics">
      {/* Headcount Metrics */}
      <div className="metric-card headcount">
        <h3>Total Headcount</h3>
        <div className="metric-value">{formatNumber(metrics.headcount.total)}</div>
        <div className="metric-subtitle">
          +{metrics.headcount.joiners30d} joined (30d)
        </div>
      </div>

      <div className="metric-card joiners">
        <h3>New Joiners</h3>
        <div className="metric-value">{metrics.headcount.joiners30d}</div>
        <div className="metric-subtitle">
          {metrics.headcount.joiners90d} in 90 days
        </div>
      </div>

      <div className="metric-card leavers">
        <h3>Leavers</h3>
        <div className="metric-value">{metrics.headcount.leavers30d}</div>
        <div className="metric-subtitle">
          {metrics.headcount.leavers90d} in 90 days
        </div>
      </div>

      {/* Task Metrics */}
      <div className="metric-card tasks">
        <h3>Open Tasks</h3>
        <div className="metric-value">{formatNumber(metrics.tasks.totalOpen)}</div>
        <div className="metric-subtitle">
          {metrics.tasks.overdueCount} overdue
        </div>
      </div>

      <div className="metric-card task-completion">
        <h3>Task Completion</h3>
        <div className="metric-value">{formatPercentage(metrics.tasks.completionRate30d)}</div>
        <div className="metric-subtitle">
          30-day rate
        </div>
      </div>

      {/* Time Off Metrics */}
      <div className="metric-card timeoff">
        <h3>Time Off Today</h3>
        <div className="metric-value">{metrics.timeOff.whosOutToday}</div>
        <div className="metric-subtitle">
          {metrics.timeOff.whosOutThisWeek} this week
        </div>
      </div>

      <div className="metric-card timeoff-requests">
        <h3>Time Off Requests</h3>
        <div className="metric-value">{metrics.timeOff.totalRequests30d}</div>
        <div className="metric-subtitle">
          {formatPercentage(metrics.timeOff.approvalRate30d)} approved
        </div>
      </div>

      {/* Engagement Metrics (if available) */}
      {metrics.engagement.averageEngagementScore && (
        <div className="metric-card engagement">
          <h3>Engagement Score</h3>
          <div className="metric-value">{metrics.engagement.averageEngagementScore.toFixed(1)}</div>
          <div className="metric-subtitle">
            {metrics.engagement.responseRate ? `${metrics.engagement.responseRate.toFixed(1)}% response` : 'From surveys'}
          </div>
        </div>
      )}
    </div>
  );
};

export default HiBobMetricCards;
