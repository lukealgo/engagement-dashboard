import React from 'react';
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

interface WorkspaceChartProps {
  data: Array<{
    date: string;
    message_count: number;
    user_count: number;
    engagement_score: number;
  }>;
}

const WorkspaceChart: React.FC<WorkspaceChartProps> = ({ data }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = data.map(item => ({
    date: formatDate(item.date),
    messages: item.message_count,
    users: item.user_count,
    engagementScore: item.engagement_score,
  }));

  if (data.length === 0) {
    return <div className="chart-loading">No data available</div>;
  }

  return (
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
          dataKey="users"
          stroke="#82ca9d"
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
  );
};

export default WorkspaceChart;