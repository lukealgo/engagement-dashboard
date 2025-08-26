import React, { useState, useEffect } from 'react';
import type { TopPost } from '../services/api';
import { engagementApi } from '../services/api';
import Tooltip from './Tooltip';

interface TopPostsProps {
  timeRange: number;
}

const TopPosts: React.FC<TopPostsProps> = ({ timeRange }) => {
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTopPosts();
  }, [timeRange]);

  const loadTopPosts = async () => {
    try {
      setLoading(true);
      const posts = await engagementApi.getTopPosts(timeRange, 10);
      setTopPosts(posts);
    } catch (error) {
      console.error('Failed to load top posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getEngagementIcon = (score: number) => {
    if (score >= 10) return '🔥';
    if (score >= 5) return '⭐';
    if (score >= 3) return '👍';
    return '📌';
  };

  const EngagementTooltip = ({ post }: { post: TopPost }) => (
    <div className="engagement-tooltip">
      <h4>🎯 Post Engagement Details</h4>
      <div className="formula">
        Score = (Reactions × 2) + (Replies × 1.5)
      </div>
      <div className="weights">
        <ul>
          <li><strong>Reactions:</strong> {post.reaction_count} × 2 = {post.reaction_count * 2}</li>
          <li><strong>Replies:</strong> {post.reply_count} × 1.5 = {post.reply_count * 1.5}</li>
        </ul>
      </div>
      <div className="example">
        <strong>Total Score:</strong> {post.engagement_score.toFixed(1)}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="top-posts-loading">
        <div className="loading-spinner"></div>
        <p>Loading top posts...</p>
      </div>
    );
  }

  return (
    <div className="top-posts">
      <div className="top-posts-header">
        <h2>🔥 Most Engaging Posts</h2>
        <span className="post-count">{topPosts.length} posts</span>
      </div>

      <div className="posts-list">
        {topPosts.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">📝</div>
            <h3>No engaging posts found</h3>
            <p>Posts with reactions and replies will appear here</p>
          </div>
        ) : (
          topPosts.map((post, index) => (
            <div key={post.ts} className={`post-item ${index < 3 ? 'post-item--top' : ''}`}>
              <div className="post-rank">
                {index + 1}
              </div>
              
              <div className="post-content">
                <div className="post-header">
                  <div className="post-meta">
                    <span className="post-author">{post.user_name}</span>
                    <span className="post-channel">#{post.channel_name}</span>
                    <span className="post-date">{formatDate(post.date)}</span>
                  </div>
                  
                  <Tooltip content={<EngagementTooltip post={post} />} position="left" maxWidth="300px">
                    <div className="engagement-badge">
                      <span className="engagement-icon">{getEngagementIcon(post.engagement_score)}</span>
                      <span className="engagement-value">{post.engagement_score.toFixed(1)}</span>
                    </div>
                  </Tooltip>
                </div>
                
                <div className="post-text">
                  {truncateText(post.text)}
                </div>
                
                <div className="post-stats">
                  <div className="stat">
                    <span className="stat-icon">⚡</span>
                    <span className="stat-value">{post.reaction_count}</span>
                    <span className="stat-label">reactions</span>
                  </div>
                  <div className="stat">
                    <span className="stat-icon">💬</span>
                    <span className="stat-value">{post.reply_count || 0}</span>
                    <span className="stat-label">replies</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TopPosts;