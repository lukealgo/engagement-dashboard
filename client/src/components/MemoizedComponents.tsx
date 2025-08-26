import React from 'react';
import WorkspaceMetrics from './WorkspaceMetrics';
import WorkspaceChart from './WorkspaceChart';
import UserRankings from './UserRankings';
import ChannelBreakdown from './ChannelBreakdown';
import TopPosts from './TopPosts';
import UserActivation from './UserActivation';

// Memoized components to prevent unnecessary re-renders
export const MemoizedWorkspaceMetrics = React.memo(WorkspaceMetrics);

export const MemoizedWorkspaceChart = React.memo(WorkspaceChart, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
});

export const MemoizedUserRankings = React.memo(UserRankings);

export const MemoizedChannelBreakdown = React.memo(ChannelBreakdown, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.channels) === JSON.stringify(nextProps.channels);
});

export const MemoizedTopPosts = React.memo(TopPosts);

export const MemoizedUserActivation = React.memo(UserActivation);

// Performance monitoring hook for development
export const useRenderTracker = (componentName: string) => {
  if (import.meta.env.DEV) {
    const renderCount = React.useRef(0);
    renderCount.current += 1;
    
    React.useEffect(() => {
      console.log(`${componentName} rendered ${renderCount.current} times`);
    });
  }
};