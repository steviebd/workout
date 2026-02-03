'use client'

import { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '~/lib/cn';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      setIsPulling(true);
      setPullDistance(Math.min(diff, threshold * 1.5));
    }
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(() => {
    const startYValue = startY.current;
    if (startYValue === null) return;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      void onRefresh().finally(() => {
        setIsRefreshing(false);
      });
    }

    setIsPulling(false);
    setPullDistance(0);
    startY.current = null;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    void window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden touch-pan-y', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: 'pan-y',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none transition-opacity duration-200"
        style={{
          height: Math.max(0, pullDistance - 20),
          opacity: isPulling ? 1 : 0,
          transform: `translateY(-100%)`,
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-primary/10 p-3',
            isRefreshing && 'animate-spin'
          )}
          style={{
            transform: `scale(${0.8 + progress * 0.2})`,
          }}
        >
          <RefreshCw
            className={cn(
              'h-5 w-5 text-primary',
              isRefreshing && 'animate-spin'
            )}
            style={{
              transform: `rotate(${isRefreshing ? 360 : rotation}deg)`,
            }}
          />
        </div>
      </div>

      <div
        className="transition-transform duration-75"
        style={{
          transform: `translateY(${Math.min(pullDistance * 0.3, threshold * 0.5)}px)`,
        }}
      >
        {children}
      </div>

      {isRefreshing ? <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 bg-primary/5"
          style={{ opacity: isRefreshing ? 1 : 0 }}
      >
          <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          <span className="ml-2 text-sm text-primary font-medium">Refreshing...</span>
                      </div> : null}
    </div>
  );
}
