import { SlackService } from './SlackService';
import { runQuery, getQuery, allQuery } from '../database/setup';
import { EngagementMetric, UserActivity, EngagementSummary, UserRanking } from '../database/models';

export interface EngagementMetricsQuery {
  channelId?: string;
  startDate?: string;
  endDate?: string;
}

export interface UserRankingsQuery {
  channelId?: string;
  days: number;
}

export interface WorkspaceOverview {
  total_channels: number;
  total_messages: number;
  total_users: number;
  total_reactions: number;
  avg_engagement_score: number;
  most_active_channel: {
    id: string;
    name: string;
    message_count: number;
  };
  daily_activity: Array<{
    date: string;
    message_count: number;
    user_count: number;
    engagement_score: number;
  }>;
  channel_breakdown: Array<{
    channel_id: string;
    channel_name: string;
    message_count: number;
    user_count: number;
    engagement_score: number;
  }>;
}

export class EngagementService {
  private slackService: SlackService;

  constructor() {
    this.slackService = new SlackService();
  }

  async syncChannelData(channelId: string): Promise<void> {
    try {
      // Sync channel info
      const channelInfo = await this.slackService.getChannelInfo(channelId);
      if (channelInfo) {
        await this.upsertChannel(channelInfo);
      }

      // Sync users
      const users = await this.slackService.getUsers();
      for (const user of users) {
        await this.upsertUser(user);
      }

      // Sync messages (last 90 days for comprehensive data)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const oldest = (ninetyDaysAgo.getTime() / 1000).toString();

      const messages = await this.slackService.getChannelMessages(channelId, 1000, oldest);
      
      for (const message of messages) {
        await this.upsertMessage(channelId, message);
      }

      // Calculate engagement metrics
      await this.calculateEngagementMetrics(channelId);
      
      console.log(`Sync completed for channel ${channelId}`);
    } catch (error) {
      if ((error as any).code === 'slack_webapi_platform_error' && (error as any).data?.error === 'not_in_channel') {
        throw new Error(`Bot is not a member of this channel. Please add the bot to the channel first by typing '/invite @Engagement Dashboard Bot' in the channel.`);
      }
      console.error('Error syncing channel data:', error);
      throw error;
    }
  }

  async getEngagementMetrics(query: EngagementMetricsQuery): Promise<EngagementMetric[]> {
    let sql = `
      SELECT * FROM engagement_metrics
      WHERE 1=1
    `;
    const params: any[] = [];

    if (query.channelId) {
      sql += ` AND channel_id = ?`;
      params.push(query.channelId);
    }

    if (query.startDate) {
      sql += ` AND date >= ?`;
      params.push(query.startDate);
    }

    if (query.endDate) {
      sql += ` AND date <= ?`;
      params.push(query.endDate);
    }

    sql += ` ORDER BY date DESC`;

    return await allQuery(sql, params);
  }

  async getChannelActivity(channelId: string, days: number): Promise<EngagementSummary> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const sql = `
      SELECT 
        channel_id,
        (SELECT name FROM channels WHERE id = channel_id) as channel_name,
        SUM(message_count) as total_messages,
        SUM(user_count) as total_users,
        SUM(reaction_count) as total_reactions,
        AVG(engagement_score) as avg_engagement_score
      FROM engagement_metrics em
      WHERE channel_id = ? AND date >= ?
      GROUP BY channel_id
    `;

    const result = await getQuery(sql, [channelId, startDate.toISOString().split('T')[0]]);
    
    if (!result) {
      return {
        channel_id: channelId,
        channel_name: 'Unknown',
        total_messages: 0,
        total_users: 0,
        total_reactions: 0,
        avg_engagement_score: 0,
        most_active_day: '',
        trend: 'stable'
      };
    }

    // Get most active day
    const mostActiveDayQuery = `
      SELECT date, message_count
      FROM engagement_metrics
      WHERE channel_id = ? AND date >= ?
      ORDER BY message_count DESC
      LIMIT 1
    `;
    const mostActiveDay = await getQuery(mostActiveDayQuery, [channelId, startDate.toISOString().split('T')[0]]);

    // Calculate trend (simple: compare last 3 days with previous 3 days)
    const trend = await this.calculateTrend(channelId, 3);

    return {
      ...result,
      most_active_day: mostActiveDay?.date || '',
      trend
    };
  }

  async getUserActivationMetrics(days: number): Promise<{
    total_workspace_users: number;
    active_users: number;
    activation_rate: number;
    daily_activation: Array<{
      date: string;
      total_users: number;
      active_users: number;
      activation_rate: number;
      new_users: number;
    }>;
    activation_trend: 'up' | 'down' | 'stable';
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get total workspace users (all non-bot users)
    const totalUsersQuery = `
      SELECT COUNT(*) as total_workspace_users
      FROM users 
      WHERE (is_bot = 0 OR is_bot IS NULL) AND (deleted = 0 OR deleted IS NULL)
    `;
    const totalUsers = await getQuery(totalUsersQuery, []);

    // Get active users in the time period
    const activeUsersQuery = `
      SELECT COUNT(DISTINCT user_id) as active_users
      FROM user_activity 
      WHERE date >= ?
    `;
    const activeUsers = await getQuery(activeUsersQuery, [startDateStr]);

    const activationRate = totalUsers?.total_workspace_users > 0 
      ? (activeUsers?.active_users || 0) / totalUsers.total_workspace_users * 100 
      : 0;

    // Get daily activation metrics with unique users and first-activity detection
    const dailyActivationQuery = `
      WITH RECURSIVE date_series AS (
        SELECT date(?) AS date
        UNION ALL
        SELECT date(date, '+1 day')
        FROM date_series
        WHERE date < date('now', 'localtime')
      ),
      active_per_day AS (
        SELECT ua.date AS date, COUNT(DISTINCT ua.user_id) AS active_users
        FROM user_activity ua
        WHERE ua.date >= ?
        GROUP BY ua.date
      ),
      first_seen AS (
        SELECT 
          u.id AS user_id, 
          DATE(u.updated_at) AS first_date
        FROM users u
        WHERE (u.is_bot = 0 OR u.is_bot IS NULL) AND (u.deleted = 0 OR u.deleted IS NULL)
      ),
      new_users_per_day AS (
        SELECT fs.first_date AS date, COUNT(*) AS new_users
        FROM first_seen fs
        WHERE fs.first_date >= ?
        GROUP BY fs.first_date
      )
      SELECT 
        ds.date,
        ? AS total_users,
        COALESCE(apd.active_users, 0) AS active_users,
        CASE WHEN ? > 0 THEN (COALESCE(apd.active_users, 0) * 100.0 / ?) ELSE 0 END AS activation_rate,
        COALESCE(nupd.new_users, 0) AS new_users
      FROM date_series ds
      LEFT JOIN active_per_day apd ON apd.date = ds.date
      LEFT JOIN new_users_per_day nupd ON nupd.date = ds.date
      ORDER BY ds.date ASC
    `;

    const totalWorkspaceUsers = totalUsers?.total_workspace_users || 0;
    const dailyActivation = await allQuery(dailyActivationQuery, [
      startDateStr,
      startDateStr,
      startDateStr,
      totalWorkspaceUsers,
      totalWorkspaceUsers,
      totalWorkspaceUsers
    ]);

    // Calculate trend (compare first half vs second half of period)
    const midpoint = Math.floor(dailyActivation.length / 2);
    const firstHalf = dailyActivation.slice(0, midpoint);
    const secondHalf = dailyActivation.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.activation_rate, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.activation_rate, 0) / secondHalf.length;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    const difference = secondHalfAvg - firstHalfAvg;
    if (difference > 2) trend = 'up';
    else if (difference < -2) trend = 'down';

    return {
      total_workspace_users: totalUsers?.total_workspace_users || 0,
      active_users: activeUsers?.active_users || 0,
      activation_rate: activationRate,
      daily_activation: dailyActivation || [],
      activation_trend: trend
    };
  }

  async getTopPosts(days: number, limit: number = 10): Promise<Array<{
    ts: string;
    channel_id: string;
    channel_name: string;
    user_id: string;
    user_name: string;
    text: string;
    reaction_count: number;
    reply_count: number;
    engagement_score: number;
    date: string;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const sql = `
      SELECT 
        m.ts,
        m.channel_id,
        c.name as channel_name,
        m.user_id,
        u.name as user_name,
        m.text,
        m.reaction_count,
        m.reply_count,
        (m.reaction_count * 2.0 + COALESCE(m.reply_count, 0) * 1.5) as engagement_score,
        DATE(datetime(CAST(m.ts AS INTEGER), 'unixepoch')) as date
      FROM messages m
      JOIN channels c ON m.channel_id = c.id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE DATE(datetime(CAST(m.ts AS INTEGER), 'unixepoch')) >= ?
        AND m.text IS NOT NULL 
        AND m.text != ''
        AND (m.reaction_count > 0 OR m.reply_count > 0)
        AND (u.is_bot = 0 OR u.is_bot IS NULL)
      ORDER BY engagement_score DESC, m.reaction_count DESC
      LIMIT ?
    `;

    return await allQuery(sql, [startDate.toISOString().split('T')[0], limit]);
  }

  async getUserRankings(query: UserRankingsQuery): Promise<UserRanking[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - query.days);
    
    let sql = `
      SELECT 
        ua.user_id,
        u.name as user_name,
        SUM(ua.message_count) as message_count,
        SUM(ua.reaction_count) as reaction_count,
        (SUM(ua.message_count) + SUM(ua.reaction_count) * 2.0) as engagement_score
      FROM user_activity ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.date >= ? AND u.is_bot = 0 AND u.deleted = 0
    `;
    
    const params: any[] = [startDate.toISOString().split('T')[0]];
    
    if (query.channelId) {
      sql += ` AND ua.channel_id = ?`;
      params.push(query.channelId);
    }
    
    sql += `
      GROUP BY ua.user_id, u.name
      ORDER BY engagement_score DESC
      LIMIT 50
    `;

    const results = await allQuery(sql, params);
    
    return results.map((result, index) => ({
      ...result,
      rank: index + 1
    }));
  }

  async syncAllChannels(): Promise<void> {
    try {
      // Get all channels where the bot is a member
      const channels = await this.slackService.getChannels();
      const memberChannels = channels.filter(c => c.is_member);
      
      console.log(`Starting sync for ${memberChannels.length} channels`);
      
      for (const channel of memberChannels) {
        try {
          await this.syncChannelData(channel.id);
          console.log(`✓ Synced channel: ${channel.name}`);
        } catch (error) {
          console.error(`✗ Failed to sync channel ${channel.name}:`, (error as any).message);
        }
      }
      
      console.log('All channels sync completed');
    } catch (error) {
      console.error('Error in syncAllChannels:', error);
      throw error;
    }
  }

  async getWorkspaceOverview(days: number): Promise<WorkspaceOverview> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get workspace totals
    const totalsQuery = `
      SELECT 
        COUNT(DISTINCT em.channel_id) as total_channels,
        SUM(em.message_count) as total_messages,
        (
          SELECT COUNT(DISTINCT ua.user_id)
          FROM user_activity ua
          WHERE ua.date >= ?
        ) as total_users,
        SUM(em.reaction_count) as total_reactions,
        AVG(em.engagement_score) as avg_engagement_score
      FROM engagement_metrics em
      WHERE em.date >= ?
    `;
    
    const totals = await getQuery(totalsQuery, [startDateStr, startDateStr]) || {
      total_channels: 0,
      total_messages: 0,
      total_users: 0,
      total_reactions: 0,
      avg_engagement_score: 0
    };

    // Get most active channel
    const mostActiveChannelQuery = `
      SELECT 
        em.channel_id as id,
        c.name,
        SUM(em.message_count) as message_count
      FROM engagement_metrics em
      JOIN channels c ON em.channel_id = c.id
      WHERE em.date >= ?
      GROUP BY em.channel_id, c.name
      ORDER BY message_count DESC
      LIMIT 1
    `;
    
    const mostActiveChannel = await getQuery(mostActiveChannelQuery, [startDateStr]) || {
      id: '',
      name: 'No data',
      message_count: 0
    };

    // Get daily activity with unique user count (avoid join duplication)
    const dailyActivityQuery = `
      WITH per_day AS (
        SELECT 
          em.date AS date,
          SUM(em.message_count) AS message_count,
          SUM(em.reaction_count) AS reaction_count,
          SUM(em.thread_count) AS thread_count
        FROM engagement_metrics em
        WHERE em.date >= ?
        GROUP BY em.date
      ),
      users_per_day AS (
        SELECT 
          ua.date AS date,
          COUNT(DISTINCT ua.user_id) AS user_count
        FROM user_activity ua
        WHERE ua.date >= ?
        GROUP BY ua.date
      )
      SELECT 
        p.date,
        p.message_count,
        COALESCE(u.user_count, 0) AS user_count,
        (
          (p.message_count * 1.0)
          + (p.reaction_count * 2.0)
          + (p.thread_count * 1.5)
          + (COALESCE(u.user_count, 0) * 0.5)
        ) / CASE WHEN COALESCE(u.user_count, 0) > 0 THEN COALESCE(u.user_count, 0) ELSE 1 END AS engagement_score
      FROM per_day p
      LEFT JOIN users_per_day u ON p.date = u.date
      ORDER BY p.date ASC
    `;
    
    const dailyActivity = await allQuery(dailyActivityQuery, [startDateStr, startDateStr]);

    // Get channel breakdown
    const channelBreakdownQuery = `
      SELECT 
        em.channel_id,
        c.name as channel_name,
        SUM(em.message_count) as message_count,
        (
          SELECT COUNT(DISTINCT ua.user_id)
          FROM user_activity ua
          WHERE ua.channel_id = em.channel_id AND ua.date >= ?
        ) as user_count,
        AVG(em.engagement_score) as engagement_score
      FROM engagement_metrics em
      JOIN channels c ON em.channel_id = c.id
      WHERE em.date >= ?
      GROUP BY em.channel_id, c.name
      ORDER BY engagement_score DESC
    `;
    
    const channelBreakdown = await allQuery(channelBreakdownQuery, [startDateStr, startDateStr]);

    return {
      total_channels: totals.total_channels || 0,
      total_messages: totals.total_messages || 0,
      total_users: totals.total_users || 0,
      total_reactions: totals.total_reactions || 0,
      avg_engagement_score: totals.avg_engagement_score || 0,
      most_active_channel: mostActiveChannel,
      daily_activity: dailyActivity || [],
      channel_breakdown: channelBreakdown || []
    };
  }

  private async upsertChannel(channel: any): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO channels 
      (id, name, is_member, num_members, topic, purpose, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    await runQuery(sql, [
      channel.id,
      channel.name,
      channel.is_member ? 1 : 0,
      channel.num_members,
      channel.topic?.value,
      channel.purpose?.value
    ]);
  }

  private async upsertUser(user: any): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO users 
      (id, name, real_name, display_name, is_bot, deleted, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    await runQuery(sql, [
      user.id,
      user.name,
      user.real_name,
      user.display_name,
      user.is_bot ? 1 : 0,
      user.deleted ? 1 : 0
    ]);
  }

  private async upsertMessage(channelId: string, message: any): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO messages 
      (ts, channel_id, user_id, text, thread_ts, reply_count, reaction_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const reactionCount = message.reactions?.reduce((sum: number, r: any) => sum + r.count, 0) || 0;
    
    await runQuery(sql, [
      message.ts,
      channelId,
      message.user,
      message.text,
      message.thread_ts,
      message.reply_count || 0,
      reactionCount
    ]);

    // Store reactions
    if (message.reactions) {
      for (const reaction of message.reactions) {
        await this.upsertReaction(message.ts, reaction);
      }
    }
  }

  private async upsertReaction(messageTs: string, reaction: any): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO reactions 
      (message_ts, name, count, users)
      VALUES (?, ?, ?, ?)
    `;
    
    await runQuery(sql, [
      messageTs,
      reaction.name,
      reaction.count,
      JSON.stringify(reaction.users)
    ]);
  }

  private async calculateEngagementMetrics(channelId: string): Promise<void> {
    // Calculate metrics for the last 90 days
    for (let i = 0; i < 90; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      await this.calculateDailyMetrics(channelId, dateStr);
    }
  }

  private async calculateDailyMetrics(channelId: string, date: string): Promise<void> {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    // Get daily stats
    const statsQuery = `
      SELECT 
        COUNT(*) as message_count,
        COUNT(DISTINCT user_id) as user_count,
        SUM(reaction_count) as total_reactions,
        COUNT(CASE WHEN thread_ts IS NOT NULL THEN 1 END) as thread_count,
        AVG(LENGTH(text)) as avg_message_length
      FROM messages
      WHERE channel_id = ? 
        AND DATE(datetime(CAST(ts AS INTEGER), 'unixepoch')) = ?
    `;

    const stats = await getQuery(statsQuery, [channelId, date]);
    
    if (!stats || stats.message_count === 0) return;

    // Calculate engagement score (weighted sum of activities)
    const engagementScore = (
      stats.message_count * 1 +
      stats.total_reactions * 2 +
      stats.thread_count * 1.5 +
      stats.user_count * 0.5
    ) / Math.max(stats.user_count, 1);

    // Upsert engagement metrics
    const upsertSql = `
      INSERT OR REPLACE INTO engagement_metrics
      (channel_id, date, message_count, user_count, reaction_count, thread_count, avg_message_length, engagement_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await runQuery(upsertSql, [
      channelId,
      date,
      stats.message_count,
      stats.user_count,
      stats.total_reactions || 0,
      stats.thread_count,
      stats.avg_message_length || 0,
      engagementScore
    ]);

    // Calculate user activity for this day
    await this.calculateUserActivity(channelId, date);
  }

  private async calculateUserActivity(channelId: string, date: string): Promise<void> {
    const userStatsQuery = `
      SELECT 
        user_id,
        COUNT(*) as message_count,
        SUM(reaction_count) as reaction_count,
        COUNT(CASE WHEN thread_ts IS NOT NULL THEN 1 END) as thread_count,
        AVG(LENGTH(text)) as avg_message_length
      FROM messages
      WHERE channel_id = ? 
        AND DATE(datetime(CAST(ts AS INTEGER), 'unixepoch')) = ?
        AND user_id IS NOT NULL
      GROUP BY user_id
    `;

    const userStats = await allQuery(userStatsQuery, [channelId, date]);

    for (const stats of userStats) {
      const upsertSql = `
        INSERT OR REPLACE INTO user_activity
        (user_id, channel_id, date, message_count, reaction_count, thread_count, avg_message_length)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await runQuery(upsertSql, [
        stats.user_id,
        channelId,
        date,
        stats.message_count,
        stats.reaction_count || 0,
        stats.thread_count,
        stats.avg_message_length || 0
      ]);
    }
  }

  private async calculateTrend(channelId: string, days: number): Promise<'up' | 'down' | 'stable'> {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - days);
    
    const previousDate = new Date();
    previousDate.setDate(previousDate.getDate() - (days * 2));

    const recentSql = `
      SELECT AVG(engagement_score) as avg_score
      FROM engagement_metrics
      WHERE channel_id = ? AND date >= ?
    `;

    const previousSql = `
      SELECT AVG(engagement_score) as avg_score
      FROM engagement_metrics
      WHERE channel_id = ? AND date >= ? AND date < ?
    `;

    const recentAvg = await getQuery(recentSql, [channelId, recentDate.toISOString().split('T')[0]]);
    const previousAvg = await getQuery(previousSql, [
      channelId,
      previousDate.toISOString().split('T')[0],
      recentDate.toISOString().split('T')[0]
    ]);

    if (!recentAvg?.avg_score || !previousAvg?.avg_score) {
      return 'stable';
    }

    const difference = recentAvg.avg_score - previousAvg.avg_score;
    const threshold = previousAvg.avg_score * 0.1; // 10% threshold

    if (difference > threshold) return 'up';
    if (difference < -threshold) return 'down';
    return 'stable';
  }
}