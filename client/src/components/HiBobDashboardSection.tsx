import React, { useState, useEffect } from 'react';
import { hibobApi } from '../services/api';
import type { HiBobDashboardMetrics } from '../services/api';
import HiBobMetricCards from './HiBobMetricCards';
import HiBobTaskChart from './HiBobTaskChart';
import HiBobActivityChart from './HiBobActivityChart';
import HiBobTimeOffCalendar from './HiBobTimeOffCalendar';
import HiBobWhosOutToday from './HiBobWhosOutToday';

interface HiBobDashboardSectionProps {
  className?: string;
}

const HiBobDashboardSection: React.FC<HiBobDashboardSectionProps> = ({ className = '' }) => {
  const [metrics, setMetrics] = useState<HiBobDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hibobApi.getDashboardMetrics();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to fetch HiBob metrics:', err);

      if (err.response?.status === 401) {
        setError('HiBob API Authentication Failed: Please check your HIBOBSECRET and HIBOBSERVICE credentials in the .env file.');
      } else if (err.response?.status === 403) {
        setError('HiBob API Access Denied: Please verify your service user has the required permissions.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to load HiBob metrics. Please check your configuration.');
      }
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    try {
      setLoading(true);
      setError(null);
      await hibobApi.syncAllData();
      // Fetch fresh metrics after sync
      await fetchMetrics();
    } catch (err: any) {
      console.error('Failed to sync HiBob data:', err);

      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to sync data. Please check your HiBob API credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (error) {
    return (
      <div className={`hibob-dashboard-section ${className}`}>
        <div className="error-message">
          <h3>HiBob Integration Error</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchMetrics} className="btn btn-primary">
              Retry
            </button>
            <button onClick={syncData} className="btn btn-secondary">
              Sync Data
            </button>
          </div>
          <div className="setup-instructions">
            <h4>Setup Instructions:</h4>
            <ol>
              <li>Ensure your environment variables are set: HIBOBSECRET and HIBOBSERVICE</li>
              <li>Verify your HiBob service user has the correct permissions</li>
              <li>Check that your HiBob API base URL is correct</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`hibob-dashboard-section ${className}`}>
      <div className="section-header">
        <h2>HiBob People Analytics</h2>
        <div className="header-actions">
          <button
            onClick={syncData}
            className="btn btn-secondary"
            disabled={loading}
          >
            {loading ? 'Syncing...' : 'Sync Data'}
          </button>
          <button
            onClick={fetchMetrics}
            className="btn btn-ghost"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {lastUpdated && (
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}

      <HiBobMetricCards metrics={metrics!} loading={loading} />

      {!loading && metrics && (
        <div className="hibob-insights">
          <div className="insights-grid">
            <div className="insight-card">
              <h4>Headcount Distribution</h4>
              <div className="department-breakdown">
                {Object.entries(metrics.headcount.byDepartment)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([dept, count]) => (
                    <div key={dept} className="department-item">
                      <span className="department-name">{dept}</span>
                      <span className="department-count">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="insight-card">
              <h4>Recent Activity</h4>
              <div className="activity-summary">
                <div className="activity-item">
                  <span className="activity-label">New joiners (30d)</span>
                  <span className="activity-value">+{metrics.headcount.joiners30d}</span>
                </div>
                <div className="activity-item">
                  <span className="activity-label">Leavers (30d)</span>
                  <span className="activity-value">-{metrics.headcount.leavers30d}</span>
                </div>
                <div className="activity-item">
                  <span className="activity-label">Open tasks</span>
                  <span className="activity-value">{metrics.tasks.totalOpen}</span>
                </div>
                <div className="activity-item">
                  <span className="activity-label">Time-off today</span>
                  <span className="activity-value">{metrics.timeOff.whosOutToday}</span>
                </div>
              </div>
            </div>

            <div className="insight-card">
              <h4>Task Performance</h4>
              <div className="task-performance">
                <div className="performance-metric">
                  <span className="metric-label">Completion Rate</span>
                  <span className="metric-value">{metrics.tasks.completionRate30d.toFixed(1)}%</span>
                </div>
                <div className="performance-metric">
                  <span className="metric-label">Overdue Tasks</span>
                  <span className="metric-value">{metrics.tasks.overdueCount}</span>
                </div>
                <div className="performance-metric">
                  <span className="metric-label">Due Soon</span>
                  <span className="metric-value">{metrics.tasks.dueSoonCount}</span>
                </div>
              </div>
            </div>

            <div className="insight-card">
              <h4>Time Off Trends</h4>
              <div className="timeoff-trends">
                <div className="trend-metric">
                  <span className="trend-label">Requests (30d)</span>
                  <span className="trend-value">{metrics.timeOff.totalRequests30d}</span>
                </div>
                <div className="trend-metric">
                  <span className="trend-label">Approval Rate</span>
                  <span className="trend-value">{metrics.timeOff.approvalRate30d.toFixed(1)}%</span>
                </div>
                <div className="trend-metric">
                  <span className="trend-label">Out this week</span>
                  <span className="trend-value">{metrics.timeOff.whosOutThisWeek}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Off Section */}
      <div className="hibob-timeoff-section">
        <div className="timeoff-grid">
          <div className="timeoff-widget">
            <HiBobWhosOutToday />
          </div>
          <div className="timeoff-widget">
            <HiBobTimeOffCalendar />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="hibob-charts-section">
        <div className="charts-grid">
          <div className="chart-container">
            <HiBobTaskChart />
          </div>
          <div className="chart-container">
            <HiBobActivityChart />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HiBobDashboardSection;
