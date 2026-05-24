import { useState } from 'react';
import { cn } from '../../utils/helpers';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fallback?: string;
  placeholder?: string;
}

export function LazyImage({ 
  src, 
  alt, 
  className = '', 
  width, 
  height, 
  fallback = '/placeholder.png',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%23f3f4f6"/%3E%3C/svg%3E'
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imgSrc, setImgSrc] = useState(placeholder);

  const handleLoad = () => {
    setIsLoading(false);
    setImgSrc(src);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    setImgSrc(fallback);
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      )}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs">
          Error
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={handleLoad}
        onError={handleError}
        style={{
          filter: isLoading ? 'blur(5px)' : 'none'
        }}
      />
      
      {/* Preload the actual image */}
      <img
        src={src}
        alt=""
        style={{ display: 'none' }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}