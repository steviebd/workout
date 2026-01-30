import { type FC } from 'react';

export const ChartSkeleton: FC = () => {
  return (
    <div className="h-64 w-full animate-pulse">
      <div className="h-full w-full bg-card rounded-lg border border-border flex flex-col">
        <div className="flex-1 p-4">
          <div className="h-full flex items-end justify-between gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-muted/50 rounded-t"
                style={{
                  height: `${20 + Math.random() * 60}%`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="border-t border-border p-4">
          <div className="flex justify-between">
            <div className="h-4 bg-muted/50 rounded w-20" />
            <div className="h-4 bg-muted/50 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
};
