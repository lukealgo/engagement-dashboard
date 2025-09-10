import React, { useState, useEffect } from 'react';
import { hibobApi } from '../services/api';
import type { HiBobTimeOffEntry } from '../services/api';

interface WhosOutTodayProps {
  className?: string;
}

interface TimeOffSummary {
  totalOut: number;
  byPortion: {
    full: number;
    am: number;
    pm: number;
  };
  byDepartment: Record<string, number>;
  entries: HiBobTimeOffEntry[];
}

const HiBobWhosOutToday: React.FC<WhosOutTodayProps> = ({ className = '' }) => {
  const [data, setData] = useState<TimeOffSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchTodaysData();
  }, []);

  const fetchTodaysData = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];
      const entries = await hibobApi.getWhosOut({ from: today, to: today });

      // Process data
      const summary: TimeOffSummary = {
        totalOut: entries.length,
        byPortion: { full: 0, am: 0, pm: 0 },
        byDepartment: {},
        entries,
      };

      entries.forEach(entry => {
        // Count by portion
        if (entry.portion === 'full') summary.byPortion.full++;
        else if (entry.portion === 'am') summary.byPortion.am++;
        else if (entry.portion === 'pm') summary.byPortion.pm++;

        // Count by department
        const dept = entry.department || 'Unknown';
        summary.byDepartment[dept] = (summary.byDepartment[dept] || 0) + 1;
      });

      setData(summary);
    } catch (err) {
      console.error('Failed to fetch today\'s time-off data:', err);
      setError('Failed to load today\'s data');
    } finally {
      setLoading(false);
    }
  };

  const getPortionIcon = (portion: string) => {
    switch (portion) {
      case 'full': return '🏖️';
      case 'am': return '🌅';
      case 'pm': return '🌆';
      default: return '❓';
    }
  };

  const getPortionLabel = (portion: string) => {
    switch (portion) {
      case 'full': return 'All day';
      case 'am': return 'Morning only';
      case 'pm': return 'Afternoon only';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className={`whos-out-today ${className}`}>
        <div className="loading-state">
          <div className="skeleton skeleton-card"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`whos-out-today ${className}`}>
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchTodaysData} className="btn btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className={`whos-out-today ${className}`}>
      <div className="today-header">
        <div className="date-info">
          <h3>Who's Out Today</h3>
          <p className="today-date">{today}</p>
        </div>
        <div className="total-count">
          <span className="count-number">{data.totalOut}</span>
          <span className="count-label">people out</span>
        </div>
      </div>

      {data.totalOut === 0 ? (
        <div className="no-one-out">
          <div className="celebration-icon">🎉</div>
          <p>Everyone is in the office today!</p>
        </div>
      ) : (
        <>
          <div className="portion-breakdown">
            <div className="portion-item">
              <span className="portion-icon">{getPortionIcon('full')}</span>
              <span className="portion-count">{data.byPortion.full}</span>
              <span className="portion-label">Full day</span>
            </div>
            <div className="portion-item">
              <span className="portion-icon">{getPortionIcon('am')}</span>
              <span className="portion-count">{data.byPortion.am}</span>
              <span className="portion-label">Morning</span>
            </div>
            <div className="portion-item">
              <span className="portion-icon">{getPortionIcon('pm')}</span>
              <span className="portion-count">{data.byPortion.pm}</span>
              <span className="portion-label">Afternoon</span>
            </div>
          </div>

          <div className="department-breakdown">
            <h4>By Department</h4>
            {Object.entries(data.byDepartment)
              .sort(([, a], [, b]) => b - a)
              .map(([dept, count]) => (
                <div key={dept} className="dept-item">
                  <span className="dept-name">{dept}</span>
                  <span className="dept-count">{count}</span>
                </div>
              ))}
          </div>

          <div className="details-toggle">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="btn btn-ghost"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {showDetails && (
            <div className="timeoff-details">
              <h4>Detailed List</h4>
              <div className="employee-list">
                {data.entries.map((entry, index) => (
                  <div key={index} className="employee-item">
                    <div className="employee-info">
                      <span className="employee-name">
                        {entry.employee_name || 'Unknown Employee'}
                      </span>
                      <span className="employee-dept">
                        {entry.department || 'Unknown Department'}
                      </span>
                    </div>
                    <div className="timeoff-info">
                      <span className="timeoff-type">{entry.policy_type}</span>
                      <span className="timeoff-portion">
                        {getPortionIcon(entry.portion)} {getPortionLabel(entry.portion)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HiBobWhosOutToday;
