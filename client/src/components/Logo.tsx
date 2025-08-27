import React from 'react';
import './Logo.css';

interface LogoProps {
  src?: string;
  alt?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showFallback?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  src, 
  alt = 'Community Engagement logo', 
  size = 'medium',
  className = '',
  showFallback = true 
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  React.useEffect(() => {
    if (src) {
      setImageError(false);
      setImageLoaded(false);
    }
  }, [src]);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // If no src provided or image failed to load, show fallback
  if (!src || imageError || !imageLoaded) {
    return (
      <div className={`logo logo--${size} logo--fallback ${className}`}>
        {showFallback && (
          <div className="logo__fallback">
            <div className="logo__icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )}
        {/* Still try to load the image in the background */}
        {src && (
          <img
            src={src}
            alt={alt}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{ display: 'none' }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`logo logo--${size} ${className}`}>
      <img
        src={src}
        alt={alt}
        className="logo__image"
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </div>
  );
};

export default Logo;