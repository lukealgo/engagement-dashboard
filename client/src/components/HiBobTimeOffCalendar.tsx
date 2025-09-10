import React, { useState, useEffect } from 'react';
import { hibobApi } from '../services/api';
import type { HiBobTimeOffEntry } from '../services/api';

interface TimeOffCalendarProps {
  className?: string;
}

interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  entries: HiBobTimeOffEntry[];
  totalOut: number;
}

const HiBobTimeOffCalendar: React.FC<TimeOffCalendarProps> = ({ className = '' }) => {
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get date range for current month view
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const startOfWeek = new Date(startOfMonth);
      startOfWeek.setDate(startOfMonth.getDate() - startOfMonth.getDay());
      const endOfWeek = new Date(endOfMonth);
      endOfWeek.setDate(endOfMonth.getDate() + (6 - endOfMonth.getDay()));

      const fromDate = startOfWeek.toISOString().split('T')[0];
      const toDate = endOfWeek.toISOString().split('T')[0];

      const entries = await hibobApi.getWhosOut({ from: fromDate, to: toDate });

      // Create calendar grid
      const calendarDays: CalendarDay[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let date = new Date(startOfWeek); date <= endOfWeek; date.setDate(date.getDate() + 1)) {
        const dateString = date.toISOString().split('T')[0];
        const dayEntries = entries.filter(entry => entry.date === dateString);
        const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
        const isToday = date.getTime() === today.getTime();

        calendarDays.push({
          date: dateString,
          day: date.getDate(),
          isCurrentMonth,
          isToday,
          entries: dayEntries,
          totalOut: dayEntries.length,
        });
      }

      setCalendarData(calendarDays);
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
      setError('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const getIntensityColor = (count: number): string => {
    if (count === 0) return 'var(--bg-tertiary)';
    if (count <= 2) return '#FFF3CD'; // Light yellow
    if (count <= 5) return '#FFE066'; // Yellow
    if (count <= 10) return '#FF9500'; // Orange
    return '#FF3B30'; // Red
  };

  const getIntensityTextColor = (count: number): string => {
    return count > 5 ? 'white' : 'var(--text-primary)';
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className={`hibob-calendar ${className}`}>
        <div className="calendar-loading">
          <div className="skeleton skeleton-calendar"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`hibob-calendar ${className}`}>
        <div className="calendar-error">
          <p>{error}</p>
          <button onClick={fetchCalendarData} className="btn btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`hibob-calendar ${className}`}>
      <div className="calendar-header">
        <button
          onClick={() => navigateMonth('prev')}
          className="calendar-nav-btn"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 className="calendar-title">{formatMonthYear(currentMonth)}</h3>
        <button
          onClick={() => navigateMonth('next')}
          className="calendar-nav-btn"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="calendar-grid">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarData.map((dayData, _index) => (
          <div
            key={dayData.date}
            className={`calendar-day ${
              dayData.isCurrentMonth ? '' : 'other-month'
            } ${dayData.isToday ? 'today' : ''} ${
              dayData.totalOut > 0 ? 'has-timeoff' : ''
            }`}
            onClick={() => setSelectedDay(dayData)}
            style={{
              backgroundColor: getIntensityColor(dayData.totalOut),
              color: getIntensityTextColor(dayData.totalOut),
            }}
            title={`${dayData.totalOut} people out on ${new Date(dayData.date).toLocaleDateString()}`}
          >
            <span className="day-number">{dayData.day}</span>
            {dayData.totalOut > 0 && (
              <span className="timeoff-count">{dayData.totalOut}</span>
            )}
          </div>
        ))}
      </div>

      {/* Day details modal */}
      {selectedDay && (
        <div className="calendar-modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="calendar-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>
                {new Date(selectedDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h4>
              <button
                onClick={() => setSelectedDay(null)}
                className="modal-close"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              {selectedDay.entries.length === 0 ? (
                <p className="no-timeoff">No one is out on this day.</p>
              ) : (
                <div className="timeoff-list">
                  {selectedDay.entries.map((entry, index) => (
                    <div key={index} className="timeoff-item">
                      <div className="timeoff-details">
                        <span className="timeoff-name">
                          {entry.employee_name || 'Unknown Employee'}
                        </span>
                        <span className="timeoff-type">{entry.policy_type}</span>
                      </div>
                      <div className="timeoff-duration">
                        {entry.portion === 'full' ? 'All day' :
                         entry.portion === 'am' ? 'Morning' : 'Afternoon'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'var(--bg-tertiary)' }}></div>
          <span>No time off</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FFF3CD' }}></div>
          <span>1-2 people</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FFE066' }}></div>
          <span>3-5 people</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FF9500' }}></div>
          <span>6-10 people</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FF3B30' }}></div>
          <span>10+ people</span>
        </div>
      </div>
    </div>
  );
};

export default HiBobTimeOffCalendar;
