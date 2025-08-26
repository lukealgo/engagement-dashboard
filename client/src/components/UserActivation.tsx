import React, { useState, useEffect } from 'react';
import type { UserActivationMetrics } from '../services/api';
import { engagementApi } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface UserActivationProps {
  timeRange: number;
}

const UserActivation: React.FC<UserActivationProps> = ({ timeRange }) => {
  const [metrics, setMetrics] = useState<UserActivationMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadActivationMetrics();
  }, [timeRange]);

  const loadActivationMetrics = async () => {
    try {
      setLoading(true);
      const data = await engagementApi.getUserActivationMetrics(timeRange);
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load activation metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'var(--color-success)';
      case 'down': return 'var(--color-error)';
      case 'stable': return 'var(--color-accent-blue)';
      default: return 'var(--color-accent-blue)';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="user-activation-loading">
        <div className="loading-spinner"></div>
        <p>Loading activation metrics...</p>
      </div>
    );
  }

  if (!metrics) {
    return <div className="no-data">No activation data available</div>;
  }

  // Format data for the chart
  const chartData = metrics.daily_activation.map(day => ({
    ...day,
    date: formatDate(day.date),
    activation_rate: Math.round(day.activation_rate * 10) / 10 // Round to 1 decimal
  }));

  return (
    <div className="user-activation">
      <div className="activation-header">
        <h2>👥 User Activation</h2>
        <div className="activation-summary">
          <span className="summary-text">
            {metrics.active_users} of {metrics.total_workspace_users} users active
          </span>
          <span 
            className="trend-indicator"
            style={{ color: getTrendColor(metrics.activation_trend) }}
          >
            {getTrendIcon(metrics.activation_trend)}
          </span>
        </div>
      </div>

      <div className="activation-metrics">
        <div className="activation-metric">
          <div className="metric-header">
            <span className="metric-icon">👥</span>
            <h3>Total Workspace Users</h3>
          </div>
          <div className="metric-value">{metrics.total_workspace_users.toLocaleString()}</div>
          <div className="metric-subtitle">All members</div>
        </div>

        <div className="activation-metric">
          <div className="metric-header">
            <span className="metric-icon">⚡</span>
            <h3>Active Users</h3>
          </div>
          <div className="metric-value">{metrics.active_users.toLocaleString()}</div>
          <div className="metric-subtitle">Posted or reacted</div>
        </div>

        <div className="activation-metric">
          <div className="metric-header">
            <span className="metric-icon">📊</span>
            <h3>Activation Rate</h3>
          </div>
          <div className="metric-value">
            {metrics.activation_rate.toFixed(1)}%
            <span 
              className="trend-icon"
              style={{ color: getTrendColor(metrics.activation_trend) }}
            >
              {getTrendIcon(metrics.activation_trend)}
            </span>
          </div>
          <div className="metric-subtitle">Active / Total ratio</div>
        </div>
      </div>

      <div className="activation-chart">
        <h3>Daily Activation Rate</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
            <XAxis 
              dataKey="date" 
              stroke="var(--text-secondary)"
              fontSize={12}
            />
            <YAxis 
              stroke="var(--text-secondary)"
              fontSize={12}
              domain={[0, 'dataMax']}
              label={{ 
                value: 'Activation Rate (%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: 'var(--text-secondary)' }
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)'
              }}
              formatter={(value: number, name: string) => [
                name === 'activation_rate' ? `${value.toFixed(1)}%` : value,
                name === 'activation_rate' ? 'Activation Rate' :
                name === 'active_users' ? 'Active Users' :
                name === 'new_users' ? 'New Users' : name
              ]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="activation_rate" 
              stroke="var(--color-accent-blue)" 
              strokeWidth={3}
              dot={{ fill: 'var(--color-accent-blue)', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'var(--color-accent-blue)', strokeWidth: 2 }}
              name="Activation Rate (%)"
            />
            <Line 
              type="monotone" 
              dataKey="active_users" 
              stroke="var(--color-accent-green)" 
              strokeWidth={2}
              dot={{ fill: 'var(--color-accent-green)', strokeWidth: 2, r: 3 }}
              name="Active Users"
            />
            <Line 
              type="monotone" 
              dataKey="new_users" 
              stroke="var(--color-accent-orange)" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'var(--color-accent-orange)', strokeWidth: 2, r: 3 }}
              name="New Users"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="activation-insights">
        <h4>📝 Insights</h4>
        <ul>
          <li>
            <strong>Current activation:</strong> {metrics.activation_rate.toFixed(1)}% of workspace members are active
          </li>
          <li>
            <strong>Trend:</strong> Activation rate is{' '}
            {metrics.activation_trend === 'up' ? 'increasing' : 
             metrics.activation_trend === 'down' ? 'decreasing' : 'stable'} over time
          </li>
          <li>
            <strong>Dormant users:</strong> {(metrics.total_workspace_users - metrics.active_users).toLocaleString()} users haven't engaged recently
          </li>
        </ul>
      </div>
    </div>
  );
};

export default UserActivation;