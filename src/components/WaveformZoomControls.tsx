import { ZoomIn, ZoomOut } from 'lucide-react';

const ZOOM_STEPS = [1, 2, 3, 4, 6, 8];

interface WaveformZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  size?: 'sm' | 'md';
}

export function WaveformZoomControls({ zoom, onZoomChange, size = 'sm' }: WaveformZoomControlsProps) {
  const currentIndex = ZOOM_STEPS.indexOf(zoom);
  const effectiveIndex = currentIndex === -1
    ? Math.max(0, ZOOM_STEPS.findIndex(z => z > zoom) - 1)
    : currentIndex;

  const canZoomIn = effectiveIndex < ZOOM_STEPS.length - 1;
  const canZoomOut = zoom > 1;

  const handleZoomIn = () => {
    if (!canZoomIn) return;
    onZoomChange(ZOOM_STEPS[effectiveIndex + 1]);
  };

  const handleZoomOut = () => {
    if (!canZoomOut) return;
    onZoomChange(ZOOM_STEPS[Math.max(0, effectiveIndex - 1)]);
  };

  const handleReset = () => onZoomChange(1);

  const iconSize = size === 'sm' ? 12 : 14;
  const isZoomed = zoom > 1;

  return (
    <div className={`flex items-center rounded-lg border transition-colors ${
      isZoomed ? 'border-blue-500/40 bg-blue-500/10' : 'border-gray-700/40 bg-gray-800/60'
    }`}>
      <button
        onClick={handleZoomOut}
        disabled={!canZoomOut}
        className={`p-1 rounded-l-lg transition-colors ${
          canZoomOut ? 'text-gray-400 hover:text-white hover:bg-gray-700/80' : 'text-gray-700 cursor-not-allowed'
        }`}
        title="Zoom out"
      >
        <ZoomOut size={iconSize} />
      </button>
      <button
        onClick={handleReset}
        className={`px-1 min-w-[26px] text-center transition-colors ${
          size === 'sm' ? 'text-[10px]' : 'text-xs'
        } ${isZoomed ? 'text-blue-400 font-semibold' : 'text-gray-500'} hover:text-gray-300`}
        title={isZoomed ? 'Reset to 1x' : 'Current zoom'}
      >
        {zoom}x
      </button>
      <button
        onClick={handleZoomIn}
        disabled={!canZoomIn}
        className={`p-1 rounded-r-lg transition-colors ${
          canZoomIn ? 'text-gray-400 hover:text-white hover:bg-gray-700/80' : 'text-gray-700 cursor-not-allowed'
        }`}
        title="Zoom in"
      >
        <ZoomIn size={iconSize} />
      </button>
    </div>
  );
}
