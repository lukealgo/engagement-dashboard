import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Channel, WorkspaceOverview, HiBobDashboardMetrics } from '../services/api';
import { slackApi, engagementApi, hibobApi } from '../services/api';
import {
  MemoizedWorkspaceChart as WorkspaceChart,
  MemoizedUserRankings as UserRankings,
  MemoizedWorkspaceMetrics as WorkspaceMetrics,
  MemoizedChannelBreakdown as ChannelBreakdown,
  MemoizedTopPosts as TopPosts,
  MemoizedUserActivation as UserActivation,
  useRenderTracker
} from './MemoizedComponents';
import { ToastContainer } from './Toast';
import { useToast } from '../hooks/useToast';
import { SkeletonMetrics, SkeletonChart, SkeletonList } from './SkeletonLoader';
import Logo from './Logo';
import HiBobDashboardSection from './HiBobDashboardSection';
import WebinarDashboardSection from './WebinarDashboardSection';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  useRenderTracker('Dashboard');

  const [channels, setChannels] = useState<Channel[]>([]);
  const [workspaceOverview, setWorkspaceOverview] = useState<WorkspaceOverview | null>(null);
  const [_hibobMetrics, setHibobMetrics] = useState<HiBobDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hibobSyncing, setHibobSyncing] = useState(false);
  const [timeRange, setTimeRange] = useState(30);
  const [activeTab, setActiveTab] = useState<'slack' | 'hibob' | 'webinars'>('slack');
  const { toasts, removeToast, success, error, info } = useToast();

  const loadChannels = useCallback(async () => {
    try {
      setLoading(true);
      const channelsData = await slackApi.getChannels();
      const memberChannels = channelsData.filter(c => c.is_member);
      setChannels(memberChannels);
      
      if (memberChannels.length === 0) {
        info(
          'No Channels Found', 
          'The bot needs to be added to channels to track engagement data.'
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load channels';
      console.error('Failed to load channels:', err);
      error(
        'Failed to Load Channels',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  }, [info, error]);

  const loadWorkspaceOverview = useCallback(async () => {
    try {
      setLoading(true);
      const overview = await engagementApi.getWorkspaceOverview(timeRange);
      setWorkspaceOverview(overview);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workspace overview';
      console.error('Failed to load workspace overview:', err);
      error(
        'Failed to Load Data',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  }, [timeRange, error]);

  const loadHibobMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const metrics = await hibobApi.getDashboardMetrics();
      setHibobMetrics(metrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load HiBob metrics';
      console.error('Failed to load HiBob metrics:', err);
      error(
        'Failed to Load HiBob Data',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadChannels();
    loadWorkspaceOverview();
    loadHibobMetrics();
  }, []); // Remove dependencies to prevent re-renders

  // Separate effect for time range changes to avoid unnecessary channel reloads
  useEffect(() => {
    if (channels.length > 0) {
      loadWorkspaceOverview();
    }
  }, [timeRange, channels.length]); // Remove function dependency

  const handleSyncAll = useCallback(async () => {
    try {
      setSyncing(true);
      info('Sync Started', 'Syncing all channels data...');

      await engagementApi.syncAllChannels();
      await loadWorkspaceOverview();

      success(
        'Sync Complete!',
        'All channel data has been successfully synchronized.'
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync channels';
      console.error('Failed to sync all channels:', err);
      error(
        'Sync Failed',
        errorMessage
      );
    } finally {
      setSyncing(false);
    }
  }, [info, success, error]); // Remove function dependency

  const handleHibobSync = useCallback(async () => {
    try {
      setHibobSyncing(true);
      info('HiBob Sync Started', 'Syncing HiBob data...');

      await hibobApi.syncAllData();
      await loadHibobMetrics();

      success(
        'HiBob Sync Complete!',
        'All HiBob data has been successfully synchronized.'
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync HiBob data';
      console.error('Failed to sync HiBob data:', err);
      error(
        'HiBob Sync Failed',
        errorMessage
      );
    } finally {
      setHibobSyncing(false);
    }
  }, [info, success, error]); // Remove function dependency

  // Memoized values for performance
  const hasChannels = useMemo(() => channels.length > 0, [channels.length]);
  const isInitialLoading = useMemo(() => loading && !workspaceOverview, [loading, workspaceOverview]);
  
  // Memoized time range handler to prevent unnecessary re-renders
  const handleTimeRangeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(parseInt(e.target.value));
  }, []);

  return (
    <div className="dashboard">
      <header className="modern-header" role="banner">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-section">
              <Logo
                src="/algomarketing-logo.svg"
                alt="Community Engagement logo"
                size="large"
                className="header-logo"
                showFallback={true}
              />
            </div>
          </div>

          <div className="header-right">
            <nav className="header-nav" role="navigation" aria-label="Dashboard controls">
              {/* Tab Navigation */}
              <div className="tab-navigation">
                <button
                  onClick={() => setActiveTab('slack')}
                  className={`tab-button ${activeTab === 'slack' ? 'active' : ''}`}
                  aria-pressed={activeTab === 'slack'}
                >
                  <span className="tab-icon">💬</span>
                  <span>Slack</span>
                </button>
                <button
                  onClick={() => setActiveTab('hibob')}
                  className={`tab-button ${activeTab === 'hibob' ? 'active' : ''}`}
                  aria-pressed={activeTab === 'hibob'}
                >
                  <span className="tab-icon">👥</span>
                  <span>HiBob</span>
                </button>
                <button
                  onClick={() => setActiveTab('webinars')}
                  className={`tab-button ${activeTab === 'webinars' ? 'active' : ''}`}
                  aria-pressed={activeTab === 'webinars'}
                >
                  <span className="tab-icon">🎥</span>
                  <span>Webinars</span>
                </button>
              </div>

              {activeTab === 'slack' && (
                <div className="time-range-selector">
                  <label htmlFor="time-range" className="time-range-label">
                    Time Range:
                  </label>
                  <select
                    id="time-range"
                    value={timeRange}
                    onChange={handleTimeRangeChange}
                    className="modern-select"
                    aria-describedby="time-range-description"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                    <option value={180}>Last 6 months</option>
                    <option value={365}>Last 12 months</option>
                  </select>
                  <span id="time-range-description" className="visually-hidden">
                    Changes the time range for all dashboard data
                  </span>
                </div>
              )}

              {activeTab !== 'webinars' && (
                <button
                  onClick={activeTab === 'slack' ? handleSyncAll : handleHibobSync}
                  disabled={syncing || hibobSyncing}
                  className="sync-button modern-btn"
                  aria-describedby="sync-button-description"
                  aria-live="polite"
                  aria-busy={syncing || hibobSyncing}
                >
                  {(syncing || hibobSyncing) ? (
                    <>
                      <span aria-hidden="true">⏳</span>
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">🔄</span>
                      <span>Sync {activeTab === 'slack' ? 'Slack' : 'HiBob'}</span>
                    </>
                  )}
                </button>
              )}
              <span id="sync-button-description" className="visually-hidden">
                Synchronizes data from {activeTab === 'slack' ? 'all Slack channels' : activeTab === 'hibob' ? 'HiBob API' : 'webinar data'}
              </span>
            </nav>
          </div>
        </div>
      </header>

      <main className="dashboard-content" role="main" aria-label="Dashboard content">
        {activeTab === 'slack' ? (
          <>
            {isInitialLoading && (
              <div className="loading-content" aria-live="polite" aria-label="Loading Slack dashboard data">
                <SkeletonMetrics />
                <div className="dashboard-grid">
                  <SkeletonChart />
                  <SkeletonList items={8} showRank />
                </div>
                <SkeletonChart />
              </div>
            )}

            {!hasChannels && !loading && (
              <section className="no-channels-message" role="alert" aria-labelledby="no-channels-title">
                <h2 id="no-channels-title">No Slack channels available</h2>
                <p>The bot needs to be added to channels before you can view engagement data.</p>
                <div className="setup-instructions">
                  <h3>To add the bot to a channel:</h3>
                  <ol>
                    <li>Go to any Slack channel</li>
                    <li>Type: <code>/invite @Engagement Dashboard Bot</code></li>
                    <li>Or click the channel name → Settings → Integrations → Add apps</li>
                    <li>Refresh this page and click "Sync Slack Data"</li>
                  </ol>
                </div>
              </section>
            )}

            {workspaceOverview && hasChannels && (
              <>
                <section aria-labelledby="workspace-metrics-title">
                  <h2 id="workspace-metrics-title" className="visually-hidden">Workspace Metrics</h2>
                  <WorkspaceMetrics overview={workspaceOverview} />
                </section>

                <div className="dashboard-grid">
                  <section className="chart-section" aria-labelledby="activity-trends-title">
                    <h2 id="activity-trends-title">Workspace Activity Trends</h2>
                    <WorkspaceChart data={workspaceOverview.daily_activity} />
                  </section>

                  <section className="rankings-section" aria-labelledby="top-contributors-title">
                    <h2 id="top-contributors-title">Top Contributors</h2>
                    <UserRankings channelId="" timeRange={timeRange} />
                  </section>
                </div>

                <section className="channel-breakdown-section" aria-labelledby="channel-breakdown-title">
                  <h2 id="channel-breakdown-title">Channel Breakdown</h2>
                  <ChannelBreakdown channels={workspaceOverview.channel_breakdown} />
                </section>

                <section className="top-posts-section" aria-labelledby="top-posts-title">
                  <h2 id="top-posts-title" className="visually-hidden">Top Posts</h2>
                  <TopPosts timeRange={timeRange} />
                </section>

                <section className="user-activation-section" aria-labelledby="user-activation-title">
                  <h2 id="user-activation-title" className="visually-hidden">User Activation</h2>
                  <UserActivation timeRange={timeRange} />
                </section>
              </>
            )}
          </>
        ) : activeTab === 'hibob' ? (
          /* HiBob Dashboard Section */
          <HiBobDashboardSection />
        ) : (
          /* Webinar Dashboard Section */
          <WebinarDashboardSection />
        )}
      </main>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default Dashboard;