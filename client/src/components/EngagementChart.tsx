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
} from 'recharts';
import type { EngagementMetric } from '../services/api';
import { engagementApi } from '../services/api';

interface EngagementChartProps {
  channelId: string;
  timeRange: number;
}

const EngagementChart: React.FC<EngagementChartProps> = ({ channelId, timeRange }) => {
  const [metrics, setMetrics] = useState<EngagementMetric[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (channelId) {
      loadMetrics();
    }
  }, [channelId, timeRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);
      
      const data = await engagementApi.getMetrics({
        channelId,
        startDate: startDate.toISOString().split('T')[0],
        endDate,
      });
      
      // Sort by date
      setMetrics(data.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = metrics.map(metric => ({
    date: formatDate(metric.date),
    messages: metric.message_count,
    reactions: metric.reaction_count,
    users: metric.user_count,
    engagementScore: metric.engagement_score,
  }));

  if (loading) {
    return <div className="chart-loading">Loading chart data...</div>;
  }

  return (
    <div className="engagement-chart">
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="messages"
            stroke="#8884d8"
            strokeWidth={2}
            name="Messages"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="reactions"
            stroke="#82ca9d"
            strokeWidth={2}
            name="Reactions"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="users"
            stroke="#ffc658"
            strokeWidth={2}
            name="Active Users"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="engagementScore"
            stroke="#ff7300"
            strokeWidth={2}
            name="Engagement Score"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EngagementChart;