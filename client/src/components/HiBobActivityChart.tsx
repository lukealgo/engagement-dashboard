import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { hibobApi } from '../services/api';
import type { HiBobEmployee, HiBobTenureData } from '../services/api';

interface ActivityData {
  date: string;
  employeeUpdates: number;
  lifecycleEvents: number;
  workChanges: number;
  totalActivity: number;
  formattedDate?: string;
}

interface ActivityChartProps {
  className?: string;
  days?: number;
}

const HiBobActivityChart: React.FC<ActivityChartProps> = ({
  className = '',
  days = 90
}) => {
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'area'>('area');

  useEffect(() => {
    fetchActivityData();
  }, [days]);

  const fetchActivityData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('HiBobActivityChart: Starting to fetch activity data...');

      // Fetch data from different HiBob endpoints with error handling
      let employees: HiBobEmployee[] = [];
      let lifecycle = [];
      let workHistory: HiBobTenureData;

      try {
        const employeesResult = await hibobApi.getEmployees();
        employees = Array.isArray(employeesResult) ? employeesResult : [];
        console.log(`HiBobActivityChart: Fetched ${employees.length} employees`);
      } catch (err) {
        console.warn('HiBobActivityChart: Failed to fetch employees:', err);
      }

      try {
        const lifecycleResult = await hibobApi.getOrgMobility(days);
        lifecycle = Array.isArray(lifecycleResult) ? lifecycleResult : [];
        console.log(`HiBobActivityChart: Fetched ${lifecycle.length} lifecycle events`);
      } catch (err) {
        console.warn('HiBobActivityChart: Failed to fetch lifecycle data:', err);
      }

      try {
        const workHistoryResult = await hibobApi.getTenureData();
        workHistory = workHistoryResult || { tenure: [], upcomingAnniversaries: [] };
        console.log(`HiBobActivityChart: Fetched ${workHistory.tenure.length} work history records`);
      } catch (err) {
        console.warn('HiBobActivityChart: Failed to fetch work history:', err);
        workHistory = { tenure: [], upcomingAnniversaries: [] };
      }

      // Process and aggregate data by date
      const activityMap: Record<string, ActivityData> = {};

      // Process employee updates (simplified - using today's date as fallback)
      employees.forEach(employee => {
        // Use updated_at if available, otherwise use today's date
        const date = employee.updated_at ?
          employee.updated_at.split('T')[0] :
          new Date().toISOString().split('T')[0];

        if (!activityMap[date]) {
          activityMap[date] = {
            date,
            employeeUpdates: 0,
            lifecycleEvents: 0,
            workChanges: 0,
            totalActivity: 0,
          };
        }
        activityMap[date].employeeUpdates++;
      });

      // Process lifecycle events
      lifecycle.forEach((event: any) => {
        // Handle different date field names
        const date = event.effective_date || event.date ||
          new Date().toISOString().split('T')[0];

        if (!activityMap[date]) {
          activityMap[date] = {
            date,
            employeeUpdates: 0,
            lifecycleEvents: 0,
            workChanges: 0,
            totalActivity: 0,
          };
        }
        activityMap[date].lifecycleEvents++;
      });

      // Process work history changes
      if (workHistory.tenure && Array.isArray(workHistory.tenure)) {
        workHistory.tenure.forEach((record: any) => {
          // Handle different date field names
          const date = record.start_date || record.date ||
            new Date().toISOString().split('T')[0];

          if (!activityMap[date]) {
            activityMap[date] = {
              date,
              employeeUpdates: 0,
              lifecycleEvents: 0,
              workChanges: 0,
              totalActivity: 0,
            };
          }
          activityMap[date].workChanges++;
        });
      }

      // Calculate total activity and convert to array
      const rawData = Object.values(activityMap)
        .map(item => ({
          ...item,
          totalActivity: (item.employeeUpdates || 0) + (item.lifecycleEvents || 0) + (item.workChanges || 0),
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-days); // Last N days

      console.log(`HiBobActivityChart: Generated ${rawData.length} raw data points`);

      // Validate and sanitize data for recharts
      const data = rawData.map(item => ({
        date: item.date,
        employeeUpdates: Number(item.employeeUpdates) || 0,
        lifecycleEvents: Number(item.lifecycleEvents) || 0,
        workChanges: Number(item.workChanges) || 0,
        totalActivity: Number(item.totalActivity) || 0,
        formattedDate: formatDate(item.date),
      }));

      console.log(`HiBobActivityChart: Sanitized ${data.length} data points for chart`);
      console.log('HiBobActivityChart: Sample data point:', data[0]);

      // If no data, create a sample data point to prevent chart errors
      if (data.length === 0) {
        console.log('HiBobActivityChart: No data available, creating sample data point');
        const today = new Date().toISOString().split('T')[0];
        data.push({
          date: today,
          employeeUpdates: 0,
          lifecycleEvents: 0,
          workChanges: 0,
          totalActivity: 0,
          formattedDate: formatDate(today),
        });
      }

      // Ensure all data points have required properties
      const validatedData = data.map(item => ({
        date: item.date || new Date().toISOString().split('T')[0],
        employeeUpdates: isNaN(item.employeeUpdates) ? 0 : item.employeeUpdates,
        lifecycleEvents: isNaN(item.lifecycleEvents) ? 0 : item.lifecycleEvents,
        workChanges: isNaN(item.workChanges) ? 0 : item.workChanges,
        totalActivity: isNaN(item.totalActivity) ? 0 : item.totalActivity,
        formattedDate: item.formattedDate || formatDate(item.date),
      }));

      console.log(`HiBobActivityChart: Final validated data:`, validatedData);
      setActivityData(validatedData);
    } catch (err) {
      console.error('HiBobActivityChart: Failed to fetch activity data:', err);
      setError('Failed to load activity data');

      // Set empty data to prevent chart errors
      const today = new Date().toISOString().split('T')[0];
      setActivityData([{
        date: today,
        employeeUpdates: 0,
        lifecycleEvents: 0,
        workChanges: 0,
        totalActivity: 0,
        formattedDate: formatDate(today),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`Date: ${new Date(label).toLocaleDateString()}`}</p>
          <p className="tooltip-value" style={{ color: '#00D4FF' }}>
            {`Profile Updates: ${data.employeeUpdates}`}
          </p>
          <p className="tooltip-value" style={{ color: '#00FF88' }}>
            {`Lifecycle Events: ${data.lifecycleEvents}`}
          </p>
          <p className="tooltip-value" style={{ color: '#FFA500' }}>
            {`Work Changes: ${data.workChanges}`}
          </p>
          <p className="tooltip-value" style={{ color: '#FF4757', fontWeight: 'bold' }}>
            {`Total Activity: ${data.totalActivity}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`hibob-activity-chart ${className}`}>
        <div className="chart-loading">
          <div className="skeleton skeleton-chart"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`hibob-activity-chart ${className}`}>
        <div className="chart-error">
          <p>{error}</p>
          <button onClick={fetchActivityData} className="btn btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (activityData.length === 0) {
    return (
      <div className={`hibob-activity-chart ${className}`}>
        <div className="chart-empty">
          <p>No activity data available</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = activityData.map(item => ({
    ...item,
    formattedDate: item.formattedDate || formatDate(item.date),
  }));

  return (
    <div className={`hibob-activity-chart ${className}`}>
      <div className="chart-header">
        <h3>Employee Profile Activity Trends</h3>
        <div className="chart-controls">
          <select
            value={days}
            onChange={(_e) => {
              // This would trigger a re-fetch with new days value
              // For now, just show the concept
            }}
            className="time-range-select"
          >
            <option value={30}>30 Days</option>
            <option value={60}>60 Days</option>
            <option value={90}>90 Days</option>
            <option value={180}>180 Days</option>
          </select>
          <button
            onClick={() => setChartType('area')}
            className={`chart-type-btn ${chartType === 'area' ? 'active' : ''}`}
          >
            📈
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`}
          >
            📊
          </button>
        </div>
      </div>

      <div className="chart-content">
        {(() => {
          // Additional safety checks
          if (!chartData || chartData.length === 0) {
            return (
              <div className="chart-placeholder">
                <p>Loading chart data...</p>
              </div>
            );
          }

          // Ensure all data points have required properties
          const safeChartData = chartData.filter(item =>
            item &&
            typeof item.employeeUpdates === 'number' &&
            typeof item.lifecycleEvents === 'number' &&
            typeof item.workChanges === 'number' &&
            typeof item.totalActivity === 'number' &&
            item.formattedDate
          );

          if (safeChartData.length === 0) {
            return (
              <div className="chart-placeholder">
                <p>Invalid chart data structure</p>
              </div>
            );
          }

          if (chartType === 'area' && safeChartData.length > 0) {
            return (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={safeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="formattedDate" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="employeeUpdates"
                    stackId="1"
                    stroke="#00D4FF"
                    fill="#00D4FF"
                    fillOpacity={0.6}
                    name="Profile Updates"
                  />
                  <Area
                    type="monotone"
                    dataKey="lifecycleEvents"
                    stackId="1"
                    stroke="#00FF88"
                    fill="#00FF88"
                    fillOpacity={0.6}
                    name="Lifecycle Events"
                  />
                  <Area
                    type="monotone"
                    dataKey="workChanges"
                    stackId="1"
                    stroke="#FFA500"
                    fill="#FFA500"
                    fillOpacity={0.6}
                    name="Work Changes"
                  />
                </AreaChart>
              </ResponsiveContainer>
            );
          } else if (chartType === 'line' && safeChartData.length > 0) {
            return (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={safeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="formattedDate" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="employeeUpdates"
                    stroke="#00D4FF"
                    strokeWidth={2}
                    name="Profile Updates"
                    dot={{ fill: '#00D4FF', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lifecycleEvents"
                    stroke="#00FF88"
                    strokeWidth={2}
                    name="Lifecycle Events"
                    dot={{ fill: '#00FF88', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="workChanges"
                    stroke="#FFA500"
                    strokeWidth={2}
                    name="Work Changes"
                    dot={{ fill: '#FFA500', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalActivity"
                    stroke="#FF4757"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    name="Total Activity"
                    dot={{ fill: '#FF4757', strokeWidth: 2, r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            );
          } else {
            return (
              <div className="chart-placeholder">
                <p>No chart data available</p>
              </div>
            );
          }
        })()}
      </div>

      <div className="chart-summary">
        <div className="summary-item">
          <span className="summary-label">Total Activity:</span>
          <span className="summary-value">
            {activityData && activityData.length > 0
              ? activityData.reduce((sum, item) => sum + (item?.totalActivity || 0), 0)
              : 0
            }
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Most Active Day:</span>
          <span className="summary-value">
            {activityData && activityData.length > 0
              ? (() => {
                  const maxActivity = activityData.reduce((max, item) =>
                    (item?.totalActivity || 0) > (max?.totalActivity || 0) ? item : max
                  );
                  return maxActivity ? formatDate(maxActivity.date) : 'N/A';
                })()
              : 'N/A'
            }
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Avg Daily Activity:</span>
          <span className="summary-value">
            {activityData && activityData.length > 0
              ? Math.round(
                  activityData.reduce((sum, item) => sum + (item?.totalActivity || 0), 0) /
                  activityData.length
                )
              : 0
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default HiBobActivityChart;
