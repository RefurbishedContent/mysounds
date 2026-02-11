import React from 'react';
import { Zap, Heart, TrendingUp, Clock } from 'lucide-react';

const tabs = [
  { id: 'feed', label: 'Your Feed', icon: Zap },
  { id: 'liked', label: 'Most Liked', icon: Heart },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'recent', label: 'Recent', icon: Clock },
];

const defaultActive = 'trending';

const FeedTabBar: React.FC = () => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pointer-events-none select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === defaultActive;

        return (
          <div
            key={tab.id}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-gray-500'
            }`}
          >
            <Icon size={15} />
            <span>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default FeedTabBar;
