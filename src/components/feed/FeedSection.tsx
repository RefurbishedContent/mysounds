import React from 'react';
import { Globe } from 'lucide-react';
import FeedTabBar from './FeedTabBar';
import SkeletonFeedCard from './SkeletonFeedCard';
import ComingSoonBanner from './ComingSoonBanner';

const SKELETON_COUNT = 6;

const FeedSection: React.FC = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Globe size={20} className="text-cyan-400" />
          Community
        </h2>
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
          Preview
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        See what creators are sharing
      </p>

      <FeedTabBar />

      <div className="relative mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pointer-events-none select-none">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonFeedCard key={i} index={i} />
          ))}
        </div>

        <ComingSoonBanner />
      </div>
    </div>
  );
};

export default FeedSection;
