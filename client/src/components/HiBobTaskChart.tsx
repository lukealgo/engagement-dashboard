import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { hibobApi } from '../services/api';
import type { HiBobTask } from '../services/api';

interface TaskCompletionData {
  department: string;
  total: number;
  completed: number;
  completionRate: number;
}

interface TaskChartProps {
  className?: string;
}

const COLORS = ['#00D4FF', '#00FF88', '#FFA500', '#FF4757', '#9B59B6', '#3498DB'];

const HiBobTaskChart: React.FC<TaskChartProps> = ({ className = '' }) => {
  const [tasks, setTasks] = useState<HiBobTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  useEffect(() => {
    fetchTaskData();
  }, []);

  const fetchTaskData = async () => {
    try {
      setLoading(true);
      setError(null);
      const taskData = await hibobApi.getTasks();
      setTasks(taskData);
    } catch (err) {
      console.error('Failed to fetch task data:', err);
      setError('Failed to load task data');
    } finally {
      setLoading(false);
    }
  };

  const processTaskData = (): TaskCompletionData[] => {
    const departmentStats: Record<string, { total: number; completed: number }> = {};

    tasks.forEach(task => {
      const dept = task.department || 'Unknown';
      if (!departmentStats[dept]) {
        departmentStats[dept] = { total: 0, completed: 0 };
      }

      departmentStats[dept].total++;
      if (task.status === 'completed') {
        departmentStats[dept].completed++;
      }
    });

    return Object.entries(departmentStats)
      .map(([department, stats]) => ({
        department,
        total: stats.total,
        completed: stats.completed,
        completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 departments
  };

  if (loading) {
    return (
      <div className={`hibob-task-chart ${className}`}>
        <div className="chart-loading">
          <div className="skeleton skeleton-chart"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`hibob-task-chart ${className}`}>
        <div className="chart-error">
          <p>{error}</p>
          <button onClick={fetchTaskData} className="btn btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const data = processTaskData();

  if (data.length === 0) {
    return (
      <div className={`hibob-task-chart ${className}`}>
        <div className="chart-empty">
          <p>No task data available</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`Department: ${label}`}</p>
          <p className="tooltip-value">{`Total Tasks: ${data.total}`}</p>
          <p className="tooltip-value">{`Completed: ${data.completed}`}</p>
          <p className="tooltip-value">{`Completion Rate: ${data.completionRate}%`}</p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{data.department}</p>
          <p className="tooltip-value">{`Tasks: ${data.total}`}</p>
          <p className="tooltip-value">{`Rate: ${data.completionRate}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`hibob-task-chart ${className}`}>
      <div className="chart-header">
        <h3>Task Completion by Department</h3>
        <div className="chart-controls">
          <button
            onClick={() => setChartType('bar')}
            className={`chart-type-btn ${chartType === 'bar' ? 'active' : ''}`}
          >
            📊
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`chart-type-btn ${chartType === 'pie' ? 'active' : ''}`}
          >
            🥧
          </button>
        </div>
      </div>

      <div className="chart-content">
        {chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="department"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="total" fill="#8884d8" name="Total Tasks" />
              <Bar dataKey="completed" fill="#82ca9d" name="Completed Tasks" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ department, completionRate }) => `${department}: ${completionRate}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="total"
              >
                {data.map((_entry, _index) => (
                  <Cell key={`cell-${_index}`} fill={COLORS[_index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-summary">
        <div className="summary-item">
          <span className="summary-label">Total Tasks:</span>
          <span className="summary-value">{tasks.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Open Tasks:</span>
          <span className="summary-value">{tasks.filter(t => t.status === 'open').length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Avg Completion Rate:</span>
          <span className="summary-value">
            {data.length > 0
              ? Math.round(data.reduce((sum, d) => sum + d.completionRate, 0) / data.length)
              : 0
            }%
          </span>
        </div>
      </div>
    </div>
  );
};

export default HiBobTaskChart;
