import React, { useState, useEffect } from 'react';
import { webinarApi } from '../services/api';
import type { Webinar, WebinarStats } from '../services/api';
import { useToast } from '../hooks/useToast';
import WebinarCSVUpload from './WebinarCSVUpload';
import './WebinarDashboardSection.css';

interface AttendeeStats {
  participant_name: string;
  total_webinars: number;
  total_duration: number;
  average_duration: string;
  engagement_score: number;
}

const WebinarDashboardSection: React.FC = () => {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [stats, setStats] = useState<WebinarStats | null>(null);
  const [attendeeStats, setAttendeeStats] = useState<AttendeeStats[]>([]);
  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'webinars' | 'upload' | 'details' | 'attendees'>('overview');
  const [attendeeSortBy, setAttendeeSortBy] = useState<'webinars' | 'time' | 'engagement'>('engagement');
  const { error } = useToast();

  const calculateAttendeeStats = (webinars: Webinar[]): AttendeeStats[] => {
    const attendeeMap = new Map<string, { webinars: number; totalDuration: number; durations: number[] }>();

    webinars.forEach(webinar => {
      webinar.attendees.forEach(attendee => {
        if (!attendeeMap.has(attendee.participant_name)) {
          attendeeMap.set(attendee.participant_name, { webinars: 0, totalDuration: 0, durations: [] });
        }

        const stats = attendeeMap.get(attendee.participant_name)!;
        stats.webinars++;
        const durationSeconds = parseDuration(attendee.attended_duration);
        stats.totalDuration += durationSeconds;
        stats.durations.push(durationSeconds);
      });
    });

    return Array.from(attendeeMap.entries())
      .map(([name, stats]) => {
        const avgDurationSeconds = stats.totalDuration / stats.webinars;
        // Engagement score = webinars * average_duration_seconds
        // This rewards both quantity (webinars) and quality (time spent)
        const engagementScore = Math.round(stats.webinars * avgDurationSeconds);

        return {
          participant_name: name,
          total_webinars: stats.webinars,
          total_duration: stats.totalDuration,
          average_duration: formatDuration(Math.floor(avgDurationSeconds)),
          engagement_score: engagementScore
        };
      })
      .sort((a, b) => b.engagement_score - a.engagement_score);
  };

  const parseDuration = (duration: string): number => {
    const hoursMatch = duration.match(/(\d+)\s*h/i);
    const minutesMatch = duration.match(/(\d+)\s*min/i);
    const secondsMatch = duration.match(/(\d+)\s*s/i);

    let totalSeconds = 0;
    if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;
    if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
    if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);
    return totalSeconds;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [webinarsData, statsData] = await Promise.all([
        webinarApi.getWebinars(),
        webinarApi.getWebinarStats()
      ]);

      setWebinars(webinarsData);
      setStats(statsData);
      const stats = calculateAttendeeStats(webinarsData);
      const sortedStats = sortAttendeeStats(stats, attendeeSortBy);
      setAttendeeStats(sortedStats);
    } catch (err) {
      console.error('Failed to load webinar data:', err);
      error('Failed to load data', 'Could not fetch webinar information');
    } finally {
      setLoading(false);
    }
  };

  const handleWebinarClick = async (webinar: Webinar) => {
    try {
      const fullWebinar = await webinarApi.getWebinar(webinar.id);
      setSelectedWebinar(fullWebinar);
      setActiveView('details');
    } catch (err) {
      console.error('Failed to load webinar details:', err);
      error('Failed to load webinar details', 'Could not fetch attendee information');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sortAttendeeStats = (stats: AttendeeStats[], sortBy: 'webinars' | 'time' | 'engagement'): AttendeeStats[] => {
    return [...stats].sort((a, b) => {
      if (sortBy === 'webinars') {
        return b.total_webinars - a.total_webinars;
      } else if (sortBy === 'time') {
        return b.total_duration - a.total_duration;
      } else {
        return b.engagement_score - a.engagement_score;
      }
    });
  };

  const handleSortChange = (sortBy: 'webinars' | 'time' | 'engagement') => {
    setAttendeeSortBy(sortBy);
    const sortedStats = sortAttendeeStats(attendeeStats, sortBy);
    setAttendeeStats(sortedStats);
  };

  const handleUploadSuccess = () => {
    loadData();
    setActiveView('overview');
  };

  if (loading) {
    return (
      <div className="webinar-loading">
        <div className="loading-spinner">⏳</div>
        <p>Loading webinar data...</p>
      </div>
    );
  }

  return (
    <div className="webinar-dashboard-section">
      {/* Navigation Tabs */}
      <div className="webinar-nav-tabs">
        {activeView === 'details' && (
          <button
            className="nav-tab back-button"
            onClick={() => setActiveView('overview')}
          >
            ← Back
          </button>
        )}
        <button
          className={`nav-tab ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`nav-tab ${activeView === 'webinars' ? 'active' : ''}`}
          onClick={() => setActiveView('webinars')}
        >
          📋 Webinars ({webinars.length})
        </button>
        <button
          className={`nav-tab ${activeView === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveView('upload')}
        >
          📤 Upload CSV
        </button>
        <button
          className={`nav-tab ${activeView === 'attendees' ? 'active' : ''}`}
          onClick={() => setActiveView('attendees')}
        >
          👥 Attendees ({attendeeStats.length})
        </button>
      </div>

      {/* Content */}
      {activeView === 'overview' && stats && (
        <div className="webinar-overview">
          {/* Key Metrics */}
          <div className="webinar-metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">🎥</div>
              <div className="metric-content">
                <div className="metric-value">{stats.total_webinars}</div>
                <div className="metric-label">Total Webinars</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">👥</div>
              <div className="metric-content">
                <div className="metric-value">{stats.total_attendees}</div>
                <div className="metric-label">Total Attendees</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📈</div>
              <div className="metric-content">
                <div className="metric-value">{stats.average_attendance_per_webinar}</div>
                <div className="metric-label">Avg Attendance</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">⭐</div>
              <div className="metric-content">
                <div className="metric-value">{stats.most_popular_host}</div>
                <div className="metric-label">Top Host</div>
              </div>
            </div>
          </div>

          {/* Recent Webinars */}
          <div className="recent-webinars-section">
            <h3>Recent Webinars</h3>
            {stats.recent_webinars.length > 0 ? (
              <div className="recent-webinars-list">
                {stats.recent_webinars.map((webinar) => (
                  <div key={webinar.id} className="webinar-card clickable" onClick={() => handleWebinarClick(webinar)}>
                    <div className="webinar-header">
                      <h4>{webinar.name}</h4>
                      <span className="webinar-host">{webinar.host}</span>
                    </div>
                    <div className="webinar-stats">
                      <span className="stat-item">👥 {webinar.total_attendees} attendees</span>
                      <span className="stat-item">⏱️ Avg: {webinar.average_duration}</span>
                      <span className="stat-item">📅 {new Date(webinar.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="click-hint">Click to view attendees</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No webinars uploaded yet. <button onClick={() => setActiveView('upload')} className="link-button">Upload your first CSV</button></p>
              </div>
            )}
          </div>

          {/* Top Webinars by Attendance */}
          {stats.top_webinars_by_attendance.length > 0 && (
            <div className="top-webinars-section">
              <h3>Top Webinars by Attendance</h3>
              <div className="top-webinars-list">
                {stats.top_webinars_by_attendance.slice(0, 5).map((webinar, index) => (
                  <div key={webinar.id} className="top-webinar-item clickable" onClick={() => handleWebinarClick(webinar)}>
                    <div className="rank">#{index + 1}</div>
                    <div className="webinar-info">
                      <h4>{webinar.name}</h4>
                      <p>{webinar.host} • {webinar.total_attendees} attendees</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Most Active Attendees */}
          {attendeeStats.length > 0 && (
            <div className="attendee-analytics-section">
              <div className="attendee-header">
                <h3>🏆 Most Active Attendees</h3>
                <div className="sort-buttons">
                  <button
                    className={`sort-btn ${attendeeSortBy === 'engagement' ? 'active' : ''}`}
                    onClick={() => handleSortChange('engagement')}
                  >
                    🏆 By Engagement
                  </button>
                  <button
                    className={`sort-btn ${attendeeSortBy === 'webinars' ? 'active' : ''}`}
                    onClick={() => handleSortChange('webinars')}
                  >
                    📊 By Webinars
                  </button>
                  <button
                    className={`sort-btn ${attendeeSortBy === 'time' ? 'active' : ''}`}
                    onClick={() => handleSortChange('time')}
                  >
                    ⏱️ By Time
                  </button>
                </div>
              </div>
              <div className="attendee-stats-list">
                {attendeeStats.slice(0, 10).map((attendee, index) => (
                  <div key={attendee.participant_name} className="attendee-stat-item">
                    <div className="attendee-rank">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${index + 1}`}
                    </div>
                    <div className="attendee-info">
                      <h4>{attendee.participant_name}</h4>
                      <div className="attendee-metrics">
                        <span className="metric engagement-score">🏆 <strong>{attendee.engagement_score.toLocaleString()}</strong> engagement</span>
                        <span className="metric">🎥 <strong>{attendee.total_webinars}</strong> webinars</span>
                        <span className="metric">⏱️ <strong>{formatTotalDuration(attendee.total_duration)}</strong> total time</span>
                        <span className="metric">📊 <strong>{attendee.average_duration}</strong> avg per webinar</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {attendeeStats.length > 10 && (
                <div className="view-more-attendees">
                  <p>And {attendeeStats.length - 10} more attendees...</p>
                  <button className="view-all-btn" onClick={() => setActiveView('attendees')}>
                    View All Attendees
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeView === 'webinars' && (
        <div className="webinars-list-view">
          <div className="webinars-header">
            <h3>All Webinars</h3>
            <button onClick={() => setActiveView('upload')} className="primary-button">
              📤 Upload New Webinar
            </button>
          </div>

          {webinars.length > 0 ? (
            <div className="webinars-table-container">
              <table className="webinars-table">
                <thead>
                  <tr>
                    <th>Webinar Name</th>
                    <th>Host</th>
                    <th>Total Attendees</th>
                    <th>Unique Attendees</th>
                    <th>Avg Duration</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {webinars.map((webinar) => (
                    <tr key={webinar.id} className="clickable-row" onClick={() => handleWebinarClick(webinar)}>
                      <td className="webinar-name-cell">
                        <div className="webinar-name">{webinar.name}</div>
                        {webinar.meeting_code && (
                          <div className="meeting-code">Code: {webinar.meeting_code}</div>
                        )}
                      </td>
                      <td>{webinar.host}</td>
                      <td className="number-cell">{webinar.total_attendees}</td>
                      <td className="number-cell">{webinar.unique_attendees}</td>
                      <td>{webinar.average_duration}</td>
                      <td>{new Date(webinar.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h4>No webinars found</h4>
              <p>Upload your first webinar CSV to get started.</p>
              <button onClick={() => setActiveView('upload')} className="primary-button">
                📤 Upload CSV
              </button>
            </div>
          )}
        </div>
      )}

      {activeView === 'attendees' && (
        <div className="attendees-view">
          <div className="attendees-header">
            <h2>All Attendees</h2>
            <div className="sort-buttons">
              <button
                className={`sort-btn ${attendeeSortBy === 'engagement' ? 'active' : ''}`}
                onClick={() => handleSortChange('engagement')}
              >
                🏆 By Engagement
              </button>
              <button
                className={`sort-btn ${attendeeSortBy === 'webinars' ? 'active' : ''}`}
                onClick={() => handleSortChange('webinars')}
              >
                📊 By Webinars
              </button>
              <button
                className={`sort-btn ${attendeeSortBy === 'time' ? 'active' : ''}`}
                onClick={() => handleSortChange('time')}
              >
                ⏱️ By Time
              </button>
            </div>
          </div>

          {attendeeStats.length > 0 ? (
            <div className="attendees-stats-list">
              {attendeeStats.map((attendee, index) => (
                <div key={attendee.participant_name} className="attendee-stat-item full">
                  <div className="attendee-rank">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `#${index + 1}`}
                  </div>
                  <div className="attendee-info">
                    <h4>{attendee.participant_name}</h4>
                    <div className="attendee-metrics">
                      <span className="metric engagement-score">🏆 <strong>{attendee.engagement_score.toLocaleString()}</strong> engagement score</span>
                      <span className="metric">🎥 <strong>{attendee.total_webinars}</strong> webinars attended</span>
                      <span className="metric">⏱️ <strong>{formatTotalDuration(attendee.total_duration)}</strong> total time spent</span>
                      <span className="metric">📊 <strong>{attendee.average_duration}</strong> average per webinar</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h4>No attendees found</h4>
              <p>Upload webinar CSVs to see attendee analytics.</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'upload' && (
        <WebinarCSVUpload onUploadSuccess={handleUploadSuccess} />
      )}

      {activeView === 'details' && selectedWebinar && (
        <div className="webinar-details-view">
          <div className="webinar-details-header">
            <h2>{selectedWebinar.name}</h2>
            <div className="webinar-details-meta">
              <span className="meta-item">👤 Host: {selectedWebinar.host}</span>
              <span className="meta-item">👥 {selectedWebinar.total_attendees} attendees</span>
              <span className="meta-item">⏱️ Avg: {selectedWebinar.average_duration}</span>
              {selectedWebinar.meeting_code && (
                <span className="meta-item">📋 Code: {selectedWebinar.meeting_code}</span>
              )}
              <span className="meta-item">📅 {new Date(selectedWebinar.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="attendees-section">
            <h3>Attendees ({selectedWebinar.attendees.length})</h3>
            {selectedWebinar.attendees.length > 0 ? (
              <div className="attendees-table-container">
                <table className="attendees-table">
                  <thead>
                    <tr>
                      <th>Participant Name</th>
                      <th>Attendance Started</th>
                      <th>Joined At</th>
                      <th>Attendance Stopped</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedWebinar.attendees.map((attendee) => (
                      <tr key={attendee.id}>
                        <td className="attendee-name-cell">{attendee.participant_name}</td>
                        <td>{attendee.attendance_started_at ? new Date(attendee.attendance_started_at).toLocaleTimeString() : '-'}</td>
                        <td>{attendee.joined_at ? new Date(attendee.joined_at).toLocaleTimeString() : '-'}</td>
                        <td>{attendee.attendance_stopped_at ? new Date(attendee.attendance_stopped_at).toLocaleTimeString() : '-'}</td>
                        <td className="duration-cell">{attendee.attended_duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>No attendee data available for this webinar.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebinarDashboardSection;
