import React from 'react';
import './SkeletonLoader.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width, height, className = '' }) => (
  <div 
    className={`skeleton ${className}`}
    style={{ 
      width: width || '100%', 
      height: height || '1rem' 
    }}
    aria-hidden="true"
  />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3, 
  className = '' 
}) => (
  <div className={`skeleton-text ${className}`}>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton 
        key={i} 
        height="1rem"
        width={i === lines - 1 ? '60%' : '100%'}
        className="skeleton-text__line"
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-card ${className}`}>
    <div className="skeleton-card__header">
      <Skeleton width="120px" height="1.5rem" />
      <Skeleton width="60px" height="1rem" />
    </div>
    <div className="skeleton-card__content">
      <Skeleton width="100%" height="2.5rem" className="skeleton-card__value" />
      <SkeletonText lines={2} />
    </div>
  </div>
);

export const SkeletonChart: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-chart ${className}`}>
    <div className="skeleton-chart__header">
      <Skeleton width="200px" height="1.5rem" />
      <Skeleton width="100px" height="1rem" />
    </div>
    <div className="skeleton-chart__content">
      <div className="skeleton-chart__bars">
        {Array.from({ length: 8 }, (_, i) => (
          <div 
            key={i} 
            className="skeleton-chart__bar"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonList: React.FC<{ 
  items?: number; 
  showRank?: boolean;
  className?: string;
}> = ({ items = 5, showRank = false, className = '' }) => (
  <div className={`skeleton-list ${className}`}>
    {Array.from({ length: items }, (_, i) => (
      <div key={i} className="skeleton-list__item">
        {showRank && (
          <Skeleton width="40px" height="40px" className="skeleton-list__rank" />
        )}
        <div className="skeleton-list__avatar">
          <Skeleton width="48px" height="48px" className="skeleton-list__avatar-circle" />
        </div>
        <div className="skeleton-list__content">
          <Skeleton width="160px" height="1.25rem" className="skeleton-list__name" />
          <div className="skeleton-list__stats">
            <Skeleton width="80px" height="0.875rem" />
            <Skeleton width="60px" height="0.875rem" />
            <Skeleton width="90px" height="0.875rem" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonMetrics: React.FC = () => (
  <div className="skeleton-metrics">
    {Array.from({ length: 3 }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default Skeleton;