import { useEffect, useRef, useState, useCallback } from 'react';
import { Scissors, Copy, Trash2, ZoomIn, ZoomOut, Grid, MapPin, Layers } from 'lucide-react';
import { TimelineEngine, TimelineClip, TimelineState } from '../lib/timeline/TimelineEngine';

interface TimelineEditorProps {
  engine: TimelineEngine;
  currentTime: number;
  onSeek: (time: number) => void;
}

export function TimelineEditor({ engine, currentTime, onSeek }: TimelineEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<TimelineState>(engine.getState());
  const [dragState, setDragState] = useState<{
    type: 'clip' | 'fade' | 'trim' | 'playhead' | null;
    clipId?: string;
    startX: number;
    startTime: number;
  }>({ type: null, startX: 0, startTime: 0 });

  const pixelsPerSecond = 50 * state.zoom;
  const trackHeight = 80;
  const headerHeight = 40;

  useEffect(() => {
    return engine.subscribe(setState);
  }, [engine]);

  useEffect(() => {
    engine.setPlayheadTime(currentTime);
  }, [currentTime, engine]);

  const drawTimeline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    const viewStart = state.scrollOffset / pixelsPerSecond;
    const viewEnd = (state.scrollOffset + width) / pixelsPerSecond;

    const gridLines = engine.getGridLines(viewStart, viewEnd);
    gridLines.forEach((time, index) => {
      const x = (time * pixelsPerSecond) - state.scrollOffset;
      const isMajor = index % 4 === 0;

      ctx.strokeStyle = isMajor ? '#374151' : '#1f2937';
      ctx.lineWidth = isMajor ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, headerHeight);
      ctx.lineTo(x, height);
      ctx.stroke();

      if (isMajor) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px monospace';
        ctx.fillText(formatTime(time), x + 4, headerHeight - 8);
      }
    });

    const tracks = Array.from(new Set(state.clips.map(c => c.trackId)));
    tracks.forEach((trackId, trackIndex) => {
      const y = headerHeight + (trackIndex * trackHeight);

      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      const trackClips = state.clips.filter(c => c.trackId === trackId);
      trackClips.forEach(clip => {
        drawClip(ctx, clip, y, trackIndex);
      });
    });

    state.markers.forEach(marker => {
      drawMarker(ctx, marker, height);
    });

    state.regions.forEach(region => {
      drawRegion(ctx, region, height);
    });

    const playheadX = (state.playheadTime * pixelsPerSecond) - state.scrollOffset;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(playheadX, headerHeight);
    ctx.lineTo(playheadX - 6, headerHeight - 10);
    ctx.lineTo(playheadX + 6, headerHeight - 10);
    ctx.closePath();
    ctx.fill();
  }, [state, engine, pixelsPerSecond]);

  const drawClip = (
    ctx: CanvasRenderingContext2D,
    clip: TimelineClip,
    trackY: number,
    trackIndex: number
  ) => {
    const x = (clip.startTime * pixelsPerSecond) - state.scrollOffset;
    const width = clip.duration * pixelsPerSecond;
    const y = trackY + 4;
    const height = trackHeight - 8;

    const isSelected = state.selectedClips.includes(clip.id);

    ctx.fillStyle = clip.color + (isSelected ? 'CC' : '88');
    ctx.strokeStyle = isSelected ? '#3b82f6' : clip.color;
    ctx.lineWidth = isSelected ? 2 : 1;

    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    if (clip.fadeIn > 0) {
      const fadeWidth = clip.fadeIn * pixelsPerSecond;
      ctx.fillStyle = '#00000044';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + fadeWidth, y);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      ctx.fill();
    }

    if (clip.fadeOut > 0) {
      const fadeWidth = clip.fadeOut * pixelsPerSecond;
      ctx.fillStyle = '#00000044';
      ctx.beginPath();
      ctx.moveTo(x + width, y);
      ctx.lineTo(x + width - fadeWidth, y);
      ctx.lineTo(x + width, y + height);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText(clip.label, x + 8, y + 20);
  };

  const drawMarker = (ctx: CanvasRenderingContext2D, marker: any, height: number) => {
    const x = (marker.time * pixelsPerSecond) - state.scrollOffset;

    ctx.strokeStyle = marker.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, headerHeight);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = marker.color;
    ctx.beginPath();
    ctx.arc(x, headerHeight - 10, 5, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawRegion = (ctx: CanvasRenderingContext2D, region: any, height: number) => {
    const x1 = (region.startTime * pixelsPerSecond) - state.scrollOffset;
    const x2 = (region.endTime * pixelsPerSecond) - state.scrollOffset;

    ctx.fillStyle = region.color + '22';
    ctx.fillRect(x1, headerHeight, x2 - x1, height - headerHeight);

    ctx.strokeStyle = region.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, headerHeight, x2 - x1, height - headerHeight);
  };

  useEffect(() => {
    drawTimeline();
  }, [drawTimeline]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = (x + state.scrollOffset) / pixelsPerSecond;

    if (y < headerHeight) {
      setDragState({ type: 'playhead', startX: x, startTime: time });
      onSeek(time);
      return;
    }

    const trackIndex = Math.floor((y - headerHeight) / trackHeight);
    const tracks = Array.from(new Set(state.clips.map(c => c.trackId)));
    const trackId = tracks[trackIndex];

    if (trackId) {
      const clickedClip = state.clips.find(clip => {
        if (clip.trackId !== trackId) return false;
        const clipStart = (clip.startTime * pixelsPerSecond) - state.scrollOffset;
        const clipEnd = clipStart + (clip.duration * pixelsPerSecond);
        return x >= clipStart && x <= clipEnd;
      });

      if (clickedClip) {
        engine.selectClip(clickedClip.id, e.shiftKey);
        setDragState({
          type: 'clip',
          clipId: clickedClip.id,
          startX: x,
          startTime: clickedClip.startTime
        });
      } else {
        engine.deselectAll();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragState.type) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const deltaX = x - dragState.startX;
    const deltaTime = deltaX / pixelsPerSecond;

    if (dragState.type === 'playhead') {
      const time = Math.max(0, (x + state.scrollOffset) / pixelsPerSecond);
      onSeek(time);
    } else if (dragState.type === 'clip' && dragState.clipId) {
      const newTime = dragState.startTime + deltaTime;
      engine.moveClip(dragState.clipId, newTime, !e.shiftKey);
    }
  };

  const handleMouseUp = () => {
    setDragState({ type: null, startX: 0, startTime: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      engine.setZoom(state.zoom * zoomDelta);
    } else {
      const scrollDelta = e.deltaY;
      engine.setScrollOffset(state.scrollOffset + scrollDelta);
    }
  };

  const handleSplitSelected = () => {
    state.selectedClips.forEach(clipId => {
      engine.splitClip(clipId, currentTime);
    });
  };

  const handleDuplicateSelected = () => {
    engine.duplicateClips(state.selectedClips);
  };

  const handleDeleteSelected = () => {
    state.selectedClips.forEach(clipId => {
      engine.removeClip(clipId);
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          engine.redo();
        } else {
          engine.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === 's') {
        e.preventDefault();
        handleSplitSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedClips, currentTime]);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => engine.setGridConfig({ enabled: !state.gridConfig.enabled })}
            className={`p-2 rounded transition-colors ${
              state.gridConfig.enabled ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-700'
            }`}
            title="Toggle grid snap"
          >
            <Grid className="w-4 h-4" />
          </button>

          <select
            value={state.gridConfig.division}
            onChange={(e) => engine.setGridConfig({ division: e.target.value as any })}
            className="bg-gray-700 text-sm rounded px-2 py-1 border border-gray-600"
          >
            <option value="bar">Bar</option>
            <option value="beat">Beat</option>
            <option value="half-beat">Half Beat</option>
            <option value="quarter-beat">Quarter Beat</option>
          </select>

          <div className="h-6 w-px bg-gray-600" />

          <button
            onClick={handleSplitSelected}
            disabled={state.selectedClips.length === 0}
            className="flex items-center gap-1 px-3 py-1 hover:bg-gray-700 rounded text-sm disabled:opacity-50"
            title="Split clip at playhead (S)"
          >
            <Scissors className="w-4 h-4" />
            <span>Split</span>
          </button>

          <button
            onClick={handleDuplicateSelected}
            disabled={state.selectedClips.length === 0}
            className="flex items-center gap-1 px-3 py-1 hover:bg-gray-700 rounded text-sm disabled:opacity-50"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-4 h-4" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={state.selectedClips.length === 0}
            className="flex items-center gap-1 px-3 py-1 hover:bg-gray-700 rounded text-sm disabled:opacity-50"
            title="Delete (Del)"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>

          <div className="h-6 w-px bg-gray-600" />

          <button
            onClick={() => engine.addMarker(currentTime, `Marker ${state.markers.length + 1}`)}
            className="flex items-center gap-1 px-3 py-1 hover:bg-gray-700 rounded text-sm"
            title="Add marker"
          >
            <MapPin className="w-4 h-4" />
            <span>Marker</span>
          </button>

          <button
            onClick={() => engine.addRegion(currentTime, currentTime + 10, 'New Region')}
            className="flex items-center gap-1 px-3 py-1 hover:bg-gray-700 rounded text-sm"
            title="Add region"
          >
            <Layers className="w-4 h-4" />
            <span>Region</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => engine.setZoom(state.zoom * 0.8)}
            className="p-1 hover:bg-gray-700 rounded"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="text-sm text-gray-400 min-w-[60px] text-center">
            {Math.round(state.zoom * 100)}%
          </div>

          <button
            onClick={() => engine.setZoom(state.zoom * 1.2)}
            className="p-1 hover:bg-gray-700 rounded"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={containerRef.current?.clientWidth || 1000}
          height={containerRef.current?.clientHeight || 400}
          className="cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
      </div>

      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <span>Drag: Move clip</span>
            <span>S: Split</span>
            <span>Ctrl+D: Duplicate</span>
            <span>Del: Delete</span>
          </div>
          <div className="flex gap-4">
            <span>Ctrl+Scroll: Zoom</span>
            <span>Shift+Drag: No snap</span>
            <span>Ctrl+Z: Undo/Redo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
