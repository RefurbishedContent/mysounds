import React from 'react';
import { Sparkles } from 'lucide-react';

const ComingSoonBanner: React.FC = () => {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="max-w-sm w-full mx-4 backdrop-blur-md bg-gray-900/75 border border-gray-600/30 rounded-2xl p-8 text-center shadow-2xl shadow-black/40">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-cyan-500/15 flex items-center justify-center">
          <Sparkles size={24} className="text-cyan-400" />
        </div>

        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
          Coming Soon
        </h3>

        <p className="text-sm text-gray-400 leading-relaxed mb-5">
          Share your mash ups with the community and discover what other creators are building.
        </p>

        <span className="inline-block border border-cyan-500/30 text-cyan-400 rounded-full px-5 py-1.5 text-sm font-medium">
          Stay Tuned
        </span>
      </div>
    </div>
  );
};

export default ComingSoonBanner;
