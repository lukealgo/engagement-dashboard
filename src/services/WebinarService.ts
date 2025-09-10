import { runQuery, getQuery, allQuery } from '../database/setup';
import { WebinarAttendee, WebinarHost } from '../database/models';

// Database result interfaces
interface WebinarDBResult {
  id: number;
  name: string;
  host_id: number;
  meeting_code?: string;
  total_attendees: number;
  unique_attendees: number;
  average_duration: string;
  created_at: string;
  updated_at: string;
  host_name?: string;
  attendee_count?: number;
}

interface WebinarWithHostDBResult extends WebinarDBResult {
  host_name: string;
}

// API response interfaces
interface WebinarAPI {
  id: number;
  name: string;
  host: string;
  host_id?: number;
  meeting_code?: string;
  total_attendees: number;
  unique_attendees: number;
  average_duration: string;
  created_at: string;
  updated_at: string;
  attendees: WebinarAttendee[];
}

interface WebinarStats {
  total_webinars: number;
  total_attendees: number;
  average_attendance_per_webinar: number;
  most_popular_host: string;
  top_webinars_by_attendance: WebinarAPI[];
  recent_webinars: WebinarAPI[];
}

interface CSVUploadResponse {
  success: boolean;
  webinar_id: number;
  attendees_imported: number;
  attendees_filtered: number;
  message: string;
}

export class WebinarService {
  // Parse duration string (e.g., "46 min 35s" or "2 min 52s") into seconds
  private parseDuration(duration: string): number {
    const hoursMatch = duration.match(/(\d+)\s*h/i);
    const minutesMatch = duration.match(/(\d+)\s*min/i);
    const secondsMatch = duration.match(/(\d+)\s*s/i);

    let totalSeconds = 0;

    if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;
    if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
    if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);

    return totalSeconds;
  }

  // Format seconds back to duration string
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Calculate average duration from attendees
  private calculateAverageDuration(attendees: WebinarAttendee[]): string {
    if (attendees.length === 0) return '00:00';

    const totalSeconds = attendees.reduce((sum, attendee) => {
      return sum + this.parseDuration(attendee.attended_duration);
    }, 0);

    const avgSeconds = Math.floor(totalSeconds / attendees.length);
    return this.formatDuration(avgSeconds);
  }

  // Get or create webinar host
  private async getOrCreateHost(hostName: string): Promise<number> {
    // First, try to find existing host
    let host = await getQuery('SELECT id FROM webinar_hosts WHERE name = ?', [hostName]);

    if (host) {
      return host.id;
    }

    // Create new host
    const result = await runQuery('INSERT INTO webinar_hosts (name) VALUES (?)', [hostName]);
    return result.lastID;
  }

  // Parse CSV content and extract attendees
  private parseCSV(csvContent: string): WebinarAttendee[] {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1);

    const attendees: WebinarAttendee[] = [];

    for (const row of rows) {
      const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length < headers.length) continue;

      const attendee: Partial<WebinarAttendee> = {};

      headers.forEach((header, index) => {
        const value = values[index];

        switch (header.toLowerCase()) {
          case 'participant name':
            attendee.participant_name = value;
            break;
          case 'attendance started at':
            attendee.attendance_started_at = value || undefined;
            break;
          case 'joined at(beta)':
            attendee.joined_at = value || undefined;
            break;
          case 'attendance stopped at':
            attendee.attendance_stopped_at = value || undefined;
            break;
          case 'attended duration':
            attendee.attended_duration = value;
            break;
          case 'meeting code':
            attendee.meeting_code = value || undefined;
            break;
        }
      });

      // Only add if we have required fields
      if (attendee.participant_name && attendee.attended_duration) {
        attendees.push(attendee as WebinarAttendee);
      }
    }

    return attendees;
  }

  // Filter out Fathom NoteTaker entries
  private filterFathomNoteTakers(attendees: WebinarAttendee[]): WebinarAttendee[] {
    return attendees.filter(attendee =>
      !attendee.participant_name.toLowerCase().includes('fathom') ||
      !attendee.participant_name.toLowerCase().includes('notetaker')
    );
  }

  async getWebinars(): Promise<WebinarAPI[]> {
    const webinars = await allQuery(`
      SELECT
        w.*,
        h.name as host_name
      FROM webinars w
      LEFT JOIN webinar_hosts h ON w.host_id = h.id
      ORDER BY w.created_at DESC
    `);

    // Fetch attendees for each webinar
    const webinarsWithAttendees = await Promise.all(
      webinars.map(async (w: any) => {
        const attendees = await allQuery(`
          SELECT * FROM webinar_attendees
          WHERE webinar_id = ?
          ORDER BY participant_name
        `, [w.id]);

        return {
          id: w.id,
          name: w.name,
          host: w.host_name || 'Unknown Host',
          host_id: w.host_id,
          meeting_code: w.meeting_code,
          total_attendees: w.total_attendees,
          unique_attendees: w.unique_attendees,
          average_duration: w.average_duration,
          created_at: w.created_at,
          updated_at: w.updated_at,
          attendees: attendees as WebinarAttendee[]
        };
      })
    );

    return webinarsWithAttendees;
  }

  async getWebinar(id: number): Promise<WebinarAPI | null> {
    const webinar = await getQuery(`
      SELECT
        w.*,
        h.name as host_name
      FROM webinars w
      LEFT JOIN webinar_hosts h ON w.host_id = h.id
      WHERE w.id = ?
    `, [id]);

    if (!webinar) return null;

    const attendees = await allQuery(`
      SELECT * FROM webinar_attendees
      WHERE webinar_id = ?
      ORDER BY participant_name
    `, [id]);

    return {
      id: webinar.id,
      name: webinar.name,
      host: (webinar as any).host_name || 'Unknown Host',
      host_id: webinar.host_id,
      meeting_code: webinar.meeting_code,
      total_attendees: webinar.total_attendees,
      unique_attendees: webinar.unique_attendees,
      average_duration: webinar.average_duration,
      created_at: webinar.created_at,
      updated_at: webinar.updated_at,
      attendees
    };
  }

  async getWebinarHosts(): Promise<WebinarHost[]> {
    const hosts = await allQuery(`
      SELECT
        h.*,
        COUNT(w.id) as webinar_count,
        COALESCE(SUM(w.total_attendees), 0) as total_attendees
      FROM webinar_hosts h
      LEFT JOIN webinars w ON h.id = w.host_id
      GROUP BY h.id
      ORDER BY webinar_count DESC, total_attendees DESC
    `);

    return hosts;
  }

  async getWebinarStats(): Promise<WebinarStats> {
    // Get basic stats
    const stats = await getQuery(`
      SELECT
        COUNT(DISTINCT w.id) as total_webinars,
        COALESCE(SUM(w.total_attendees), 0) as total_attendees,
        AVG(w.total_attendees) as average_attendance_per_webinar
      FROM webinars w
    `);

    // Get most popular host
    const popularHost = await getQuery(`
      SELECT h.name
      FROM webinar_hosts h
      JOIN webinars w ON h.id = w.host_id
      GROUP BY h.id, h.name
      ORDER BY SUM(w.total_attendees) DESC
      LIMIT 1
    `);

    // Get top webinars by attendance with attendees
    const topWebinarsData = await allQuery(`
      SELECT
        w.*,
        h.name as host_name
      FROM webinars w
      LEFT JOIN webinar_hosts h ON w.host_id = h.id
      ORDER BY w.total_attendees DESC
      LIMIT 5
    `);

    // Get recent webinars with attendees
    const recentWebinarsData = await allQuery(`
      SELECT
        w.*,
        h.name as host_name
      FROM webinars w
      LEFT JOIN webinar_hosts h ON w.host_id = h.id
      ORDER BY w.created_at DESC
      LIMIT 5
    `);

    // Fetch attendees for top webinars
    const topWebinars = await Promise.all(
      topWebinarsData.map(async (w: any) => {
        const attendees = await allQuery(`
          SELECT * FROM webinar_attendees
          WHERE webinar_id = ?
          ORDER BY participant_name
        `, [w.id]);

        return {
          id: w.id,
          name: w.name,
          host: w.host_name || 'Unknown Host',
          host_id: w.host_id,
          meeting_code: w.meeting_code,
          total_attendees: w.total_attendees,
          unique_attendees: w.unique_attendees,
          average_duration: w.average_duration,
          created_at: w.created_at,
          updated_at: w.updated_at,
          attendees: attendees as WebinarAttendee[]
        };
      })
    );

    // Fetch attendees for recent webinars
    const recentWebinars = await Promise.all(
      recentWebinarsData.map(async (w: any) => {
        const attendees = await allQuery(`
          SELECT * FROM webinar_attendees
          WHERE webinar_id = ?
          ORDER BY participant_name
        `, [w.id]);

        return {
          id: w.id,
          name: w.name,
          host: w.host_name || 'Unknown Host',
          host_id: w.host_id,
          meeting_code: w.meeting_code,
          total_attendees: w.total_attendees,
          unique_attendees: w.unique_attendees,
          average_duration: w.average_duration,
          created_at: w.created_at,
          updated_at: w.updated_at,
          attendees: attendees as WebinarAttendee[]
        };
      })
    );

    return {
      total_webinars: stats.total_webinars || 0,
      total_attendees: stats.total_attendees || 0,
      average_attendance_per_webinar: Math.round(stats.average_attendance_per_webinar || 0),
      most_popular_host: popularHost?.name || 'N/A',
      top_webinars_by_attendance: topWebinars,
      recent_webinars: recentWebinars
    };
  }

  async uploadCSV(csvContent: string, webinarName: string, webinarHost: string): Promise<CSVUploadResponse> {
    try {
      // Parse CSV
      const allAttendees = this.parseCSV(csvContent);

      // Filter out Fathom NoteTakers
      const filteredAttendees = this.filterFathomNoteTakers(allAttendees);

      // Get or create host
      const hostId = await this.getOrCreateHost(webinarHost);

      // Create webinar
      const result = await runQuery(`
        INSERT INTO webinars (name, host_id, meeting_code)
        VALUES (?, ?, ?)
      `, [webinarName, hostId, allAttendees[0]?.meeting_code || null]);

      const webinarId = result.lastID;

      // Insert attendees
      let attendeesImported = 0;
      for (const attendee of filteredAttendees) {
        try {
          await runQuery(`
            INSERT INTO webinar_attendees (
              webinar_id,
              participant_name,
              attendance_started_at,
              joined_at,
              attendance_stopped_at,
              attended_duration,
              meeting_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            webinarId,
            attendee.participant_name,
            attendee.attendance_started_at,
            attendee.joined_at,
            attendee.attendance_stopped_at,
            attendee.attended_duration,
            attendee.meeting_code
          ]);
          attendeesImported++;
        } catch (error) {
          console.warn('Failed to insert attendee:', attendee.participant_name, error);
        }
      }

      // Update webinar stats
      const uniqueAttendees = new Set(filteredAttendees.map(a => a.participant_name)).size;
      const avgDuration = this.calculateAverageDuration(filteredAttendees);

      await runQuery(`
        UPDATE webinars
        SET
          total_attendees = ?,
          unique_attendees = ?,
          average_duration = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [attendeesImported, uniqueAttendees, avgDuration, webinarId]);

      return {
        success: true,
        webinar_id: webinarId,
        attendees_imported: attendeesImported,
        attendees_filtered: allAttendees.length - filteredAttendees.length,
        message: `Successfully imported ${attendeesImported} attendees (${allAttendees.length - filteredAttendees.length} filtered)`
      };

    } catch (error) {
      console.error('Error uploading CSV:', error);
      throw error;
    }
  }

  async deleteWebinar(id: number): Promise<void> {
    // Delete attendees first (due to foreign key constraint)
    await runQuery('DELETE FROM webinar_attendees WHERE webinar_id = ?', [id]);

    // Delete webinar
    await runQuery('DELETE FROM webinars WHERE id = ?', [id]);
  }
}
