import React from 'react';

interface SkeletonFeedCardProps {
  index: number;
}

const SkeletonFeedCard: React.FC<SkeletonFeedCardProps> = ({ index }) => {
  const delay = `${index * 200}ms`;

  return (
    <div className="bg-gray-800 border border-gray-700/50 rounded-xl overflow-hidden pointer-events-none select-none">
      <div
        className="aspect-square bg-gray-700/60 animate-pulse"
        style={{ animationDelay: delay }}
      />

      <div className="p-3.5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full bg-gray-700/80 animate-pulse flex-shrink-0"
            style={{ animationDelay: `${index * 200 + 100}ms` }}
          />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div
              className="h-3 w-20 bg-gray-700/70 rounded animate-pulse"
              style={{ animationDelay: `${index * 200 + 150}ms` }}
            />
            <div
              className="h-2 w-14 bg-gray-700/40 rounded animate-pulse"
              style={{ animationDelay: `${index * 200 + 200}ms` }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div
            className="h-3.5 w-3/4 bg-gray-700/60 rounded animate-pulse"
            style={{ animationDelay: `${index * 200 + 250}ms` }}
          />
          <div
            className="h-2.5 w-full bg-gray-700/30 rounded animate-pulse"
            style={{ animationDelay: `${index * 200 + 300}ms` }}
          />
          <div
            className="h-2.5 w-2/3 bg-gray-700/30 rounded animate-pulse"
            style={{ animationDelay: `${index * 200 + 350}ms` }}
          />
        </div>

        <div className="flex items-center gap-2">
          {[1, 2, 3].map((tag) => (
            <div
              key={tag}
              className="h-5 rounded-full bg-gray-700/30 animate-pulse"
              style={{
                width: `${36 + tag * 8}px`,
                animationDelay: `${index * 200 + 350 + tag * 50}ms`,
              }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-gray-700/30">
          <div className="flex items-center gap-3">
            {[1, 2, 3].map((action) => (
              <div
                key={action}
                className="w-6 h-6 rounded bg-gray-700/40 animate-pulse"
                style={{ animationDelay: `${index * 200 + 500 + action * 60}ms` }}
              />
            ))}
          </div>
          <div
            className="w-6 h-6 rounded bg-gray-700/30 animate-pulse"
            style={{ animationDelay: `${index * 200 + 700}ms` }}
          />
        </div>
      </div>
    </div>
  );
};

export default SkeletonFeedCard;
