import { BarChart3 } from 'lucide-react';

interface WaveformModeToggleProps {
  mode: 'standard' | 'rgb';
  onToggle: () => void;
  size?: 'sm' | 'md';
}

export function WaveformModeToggle({ mode, onToggle, size = 'sm' }: WaveformModeToggleProps) {
  const isRGB = mode === 'rgb';
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-1.5 rounded-lg transition-all font-medium select-none
        ${size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'}
        ${isRGB
          ? 'bg-gray-700/80 border border-gray-500/50 text-white shadow-sm'
          : 'bg-gray-800/60 border border-gray-700/40 text-gray-500 hover:text-gray-300 hover:border-gray-600/50'
        }
      `}
      title={isRGB ? 'Switch to standard waveform' : 'Switch to RGB frequency view'}
    >
      {isRGB ? (
        <span className="flex gap-px">
          <span className="w-1 h-2.5 rounded-sm bg-red-500" style={{ opacity: 0.9 }} />
          <span className="w-1 h-3 rounded-sm bg-green-500" style={{ opacity: 0.9 }} />
          <span className="w-1 h-2 rounded-sm bg-blue-500" style={{ opacity: 0.9 }} />
        </span>
      ) : (
        <BarChart3 size={iconSize} />
      )}
      <span>RGB</span>
    </button>
  );
}
