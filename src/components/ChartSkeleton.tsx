import { type FC } from 'react';

export const ChartSkeleton: FC = () => {
  return (
    <div className="h-64 w-full animate-pulse">
      <div className="h-full w-full bg-gray-100 rounded-lg border border-gray-200 flex flex-col">
        <div className="flex-1 p-4">
          <div className="h-full flex items-end justify-between gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-gray-200 rounded-t"
                style={{
                  height: `${20 + Math.random() * 60}%`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
};
