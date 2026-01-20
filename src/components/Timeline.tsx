import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Settings,
  MoreVertical
} from 'lucide-react';
import { TemplatePlacement } from '../types';
import { TemplateData } from '../lib/database';
import { UploadResult } from '../lib/storage';

interface TimelineProps {
  trackA: UploadResult | null;
  trackB: UploadResult | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  currentTime: number;
  onSeek: (time: number) => void;
  templatePlacements?: TemplatePlacement[];
  onAddTemplatePlacement?: (placement: TemplatePlacement) => void;
  onSelectPlacement?: (placement: TemplatePlacement) => void;
  selectedPlacement?: TemplatePlacement | null;
  templates?: Map<string, TemplateData>;
}

interface Track {
  id: string;
  name: string;
  type: 'audio' | 'transition' | 'master';
  color: string;
  height: number;
  muted: boolean;
  solo: boolean;
  locked: boolean;
  visible: boolean;
  volume: number;
}

const Timeline: React.FC<TimelineProps> = ({
  trackA,
  trackB,
  isPlaying,
  onPlayPause,
  onStop,
  currentTime,
  onSeek,
  templatePlacements = [],
  onAddTemplatePlacement,
  onSelectPlacement,
  selectedPlacement,
  templates = new Map()
}) => {
  const [zoomLevel, setZoomLevel] = useState(60);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverTrack, setDragOverTrack] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize tracks
  const [tracks, setTracks] = useState<Track[]>([
    {
      id: 'track-a',
      name: trackA?.metadata.filename || 'Audio Track 1',
      type: 'audio',
      color: '#3B82F6',
      height: 80,
      muted: false,
      solo: false,
      locked: false,
      visible: true,
      volume: 100
    },
    {
      id: 'transition',
      name: 'Transitions & Effects',
      type: 'transition',
      color: '#A855F7',
      height: 60,
      muted: false,
      solo: false,
      locked: false,
      visible: true,
      volume: 100
    },
    {
      id: 'track-b',
      name: trackB?.metadata.filename || 'Audio Track 2',
      type: 'audio',
      color: '#F97316',
      height: 80,
      muted: false,
      solo: false,
      locked: false,
      visible: true,
      volume: 100
    }
  ]);

  // Update track names when files change
  useEffect(() => {
    setTracks(prev => prev.map(track => {
      if (track.id === 'track-a' && trackA) {
        return { ...track, name: trackA.metadata.filename };
      }
      if (track.id === 'track-b' && trackB) {
        return { ...track, name: trackB.metadata.filename };
      }
      return track;
    }));
  }, [trackA, trackB]);

  // Calculate durations
  const trackADuration = trackA?.metadata.duration || 120;
  const trackBDuration = trackB?.metadata.duration || 120;
  const maxDuration = Math.max(trackADuration, trackBDuration, 180);

  // Timeline dimensions
  const pixelsPerSecond = zoomLevel;
  const timelineWidth = maxDuration * pixelsPerSecond;
  const trackHeaderWidth = 200;

  // Format time display
  const formatTime = (seconds: number, showFrames: boolean = false) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);

    if (showFrames) {
      return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate waveform data
  const generateWaveform = useCallback((duration: number, samples: number = 200): number[] => {
    const waveform: number[] = [];
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      const bass = Math.sin(progress * Math.PI * 4) * 0.4;
      const mid = Math.sin(progress * Math.PI * 16) * 0.3;
      const high = Math.sin(progress * Math.PI * 64) * 0.2;
      const noise = (Math.random() - 0.5) * 0.15;
      const amplitude = Math.abs(bass + mid + high + noise);
      waveform.push(amplitude);
    }
    return waveform;
  }, []);

  // Track control handlers
  const toggleTrackMute = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, muted: !t.muted } : t
    ));
  }, []);

  const toggleTrackSolo = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, solo: !t.solo } : t
    ));
  }, []);

  const toggleTrackLock = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, locked: !t.locked } : t
    ));
  }, []);

  const toggleTrackVisibility = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, visible: !t.visible } : t
    ));
  }, []);

  const updateTrackVolume = useCallback((trackId: string, volume: number) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, volume } : t
    ));
  }, []);

  // Handle timeline click for seeking
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!timelineContainerRef.current || target.closest('.clip-block') || target.closest('.track-header')) return;

    const rect = timelineContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - trackHeaderWidth + (scrollContainerRef.current?.scrollLeft || 0);
    const clickTime = (x / pixelsPerSecond);

    onSeek(Math.max(0, Math.min(maxDuration, clickTime)));
  }, [maxDuration, onSeek, pixelsPerSecond]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
    setDragOverTrack(trackId);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
    const time = x / pixelsPerSecond;
    setDragOverPosition(time);
  }, [pixelsPerSecond]);

  const handleDrop = useCallback((e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragOverTrack(null);
    setDragOverPosition(null);

    try {
      const templateData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (!templateData || !onAddTemplatePlacement) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
      const startTime = x / pixelsPerSecond;

      if (trackId === 'transition' && trackA && trackB) {
        const placement: TemplatePlacement = {
          id: `placement-${Date.now()}`,
          templateId: templateData.id,
          startTime: Math.max(0, startTime),
          parameters: {}
        };
        onAddTemplatePlacement(placement);
      }
    } catch (error) {
      console.error('Failed to drop template:', error);
    }
  }, [onAddTemplatePlacement, trackA, trackB, pixelsPerSecond]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
      setDragOverTrack(null);
      setDragOverPosition(null);
    }
  }, []);

  // Calculate playhead position
  const playheadPosition = currentTime * pixelsPerSecond;

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Top Toolbar - Transport Controls */}
      <div className="bg-[#232323] border-b border-[#2a2a2a] px-4 py-2 flex items-center justify-between flex-shrink-0">
        {/* Left: Transport Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onStop}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
            title="Go to Start"
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={onPlayPause}
            className="p-2 bg-[#0d7ce6] hover:bg-[#0e6bbf] text-white rounded transition-colors"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
            title="Step Forward"
          >
            <SkipForward size={16} />
          </button>

          {/* Time Display */}
          <div className="ml-4 px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded font-mono text-sm text-white">
            {formatTime(currentTime, true)}
          </div>
        </div>

        {/* Right: View Controls */}
        <div className="flex items-center space-x-4">
          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
            title="Settings"
          >
            <Settings size={16} />
          </button>

          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
            title="Maximize Timeline"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Timeline Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers (Fixed Left Column) */}
        <div
          className="flex-shrink-0 bg-[#232323] border-r border-[#2a2a2a] overflow-y-auto"
          style={{ width: `${trackHeaderWidth}px` }}
        >
          {/* Timeline header spacer */}
          <div className="h-10 bg-[#2a2a2a] border-b border-[#1a1a1a] flex items-center px-3">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Tracks</span>
          </div>

          {/* Track headers */}
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`border-b ${
                track.id === 'transition'
                  ? 'border-purple-500/30 bg-purple-950/20'
                  : 'border-[#2a2a2a]'
              }`}
              style={{
                height: `${track.height}px`,
                ...(track.id === 'transition' ? {
                  boxShadow: '0 0 20px rgba(168, 85, 247, 0.15), inset 0 0 30px rgba(168, 85, 247, 0.05)'
                } : {})
              }}
            >
              <div className="h-full px-3 py-2 flex flex-col justify-between">
                {/* Track name and controls */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <div
                        className={`w-3 h-3 rounded-sm flex-shrink-0 ${
                          track.id === 'transition' ? 'animate-pulse shadow-lg shadow-purple-500/50' : ''
                        }`}
                        style={{ backgroundColor: track.color }}
                      />
                      <span className="text-white text-sm font-medium truncate">
                        {track.name}
                      </span>
                    </div>
                  </div>

                  <button className="text-gray-500 hover:text-gray-300 transition-colors p-1">
                    <MoreVertical size={14} />
                  </button>
                </div>

                {/* Track controls */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => toggleTrackMute(track.id)}
                    className={`p-1.5 rounded transition-colors ${
                      track.muted
                        ? 'bg-red-500/20 text-red-400'
                        : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                    }`}
                    title="Mute (M)"
                  >
                    {track.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>

                  <button
                    onClick={() => toggleTrackSolo(track.id)}
                    className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                      track.solo
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                    }`}
                    title="Solo (S)"
                  >
                    S
                  </button>

                  <button
                    onClick={() => toggleTrackLock(track.id)}
                    className={`p-1.5 rounded transition-colors ${
                      track.locked
                        ? 'text-gray-500'
                        : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                    }`}
                    title="Lock Track"
                  >
                    {track.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>

                  <button
                    onClick={() => toggleTrackVisibility(track.id)}
                    className={`p-1.5 rounded transition-colors ${
                      !track.visible
                        ? 'text-gray-600'
                        : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                    }`}
                    title="Toggle Visibility"
                  >
                    {track.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Timeline Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Time Ruler */}
          <div className="h-10 bg-[#2a2a2a] border-b border-[#1a1a1a] relative overflow-hidden">
            <div
              ref={scrollContainerRef}
              className="h-full overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
              onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
            >
              <div className="h-full relative" style={{ width: `${timelineWidth}px` }}>
                {/* Time markers */}
                {Array.from({ length: Math.ceil(maxDuration / 5) + 1 }, (_, i) => {
                  const time = i * 5;
                  const position = time * pixelsPerSecond;

                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l border-[#3a3a3a]"
                      style={{ left: `${position}px` }}
                    >
                      <span className="absolute top-1 left-1 text-[10px] text-gray-400 font-mono">
                        {formatTime(time)}
                      </span>
                    </div>
                  );
                })}

                {/* Playhead in ruler */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#0d7ce6] pointer-events-none"
                  style={{ left: `${playheadPosition}px` }}
                >
                  <div className="absolute -top-0.5 -left-1.5 w-3 h-3 bg-[#0d7ce6] rotate-45" />
                </div>
              </div>
            </div>
          </div>

          {/* Track Lanes */}
          <div
            ref={timelineContainerRef}
            className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
            onClick={handleTimelineClick}
          >
            <div style={{ width: `${timelineWidth}px` }}>
              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  className={`border-b relative transition-all duration-300 ${
                    track.id === 'transition'
                      ? 'border-purple-500/30'
                      : 'border-[#2a2a2a]'
                  } ${
                    isDragOver && dragOverTrack === track.id && track.id === 'transition'
                      ? 'bg-purple-900/30'
                      : track.id === 'transition'
                      ? 'bg-purple-950/10'
                      : ''
                  }`}
                  style={{
                    height: `${track.height}px`,
                    ...(track.id === 'transition' ? {
                      boxShadow: isDragOver && dragOverTrack === track.id
                        ? '0 0 40px rgba(168, 85, 247, 0.6), inset 0 0 60px rgba(168, 85, 247, 0.3), 0 0 80px rgba(168, 85, 247, 0.4)'
                        : '0 0 20px rgba(168, 85, 247, 0.15), inset 0 0 30px rgba(168, 85, 247, 0.05)'
                    } : {})
                  }}
                  onDragOver={(e) => handleDragOver(e, track.id)}
                  onDrop={(e) => handleDrop(e, track.id)}
                  onDragLeave={handleDragLeave}
                >
                  {/* Track background grid */}
                  <div className={`absolute inset-0 ${
                    track.id === 'transition' ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a]'
                  }`}>
                    {Array.from({ length: Math.ceil(maxDuration / 5) }, (_, i) => (
                      <div
                        key={i}
                        className={`absolute top-0 bottom-0 border-l ${
                          track.id === 'transition' ? 'border-purple-900/30' : 'border-[#222]'
                        }`}
                        style={{ left: `${i * 5 * pixelsPerSecond}px` }}
                      />
                    ))}

                    {/* Transition track hint */}
                    {track.id === 'transition' && templatePlacements.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-gray-500 text-sm font-medium flex items-center space-x-2 bg-[#1a1a1a]/80 px-4 py-2 rounded-lg border border-purple-500/30 shadow-lg shadow-purple-500/20">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-lg shadow-purple-500/50" />
                          <span>Drag transition templates here</span>
                        </div>
                      </div>
                    )}

                    {/* Animated glow overlay when dragging over transition track */}
                    {isDragOver && dragOverTrack === track.id && track.id === 'transition' && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent animate-pulse" />
                        <div className="absolute inset-0 bg-purple-500/5 animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Clips */}
                  {track.id === 'track-a' && trackA && (
                    <div
                      className="absolute top-2 bottom-2 rounded clip-block bg-gradient-to-r from-blue-500/30 to-blue-600/30 border border-blue-500/50 hover:border-blue-400 cursor-move overflow-hidden group transition-all"
                      style={{
                        left: '0px',
                        width: `${trackADuration * pixelsPerSecond}px`
                      }}
                    >
                      {/* Waveform */}
                      <div className="absolute inset-0 flex items-center px-1">
                        <svg className="w-full h-full" preserveAspectRatio="none">
                          {generateWaveform(trackADuration, 100).map((amp, i, arr) => {
                            const x = (i / arr.length) * 100;
                            const height = amp * 80;
                            return (
                              <rect
                                key={i}
                                x={`${x}%`}
                                y={`${50 - height / 2}%`}
                                width={`${100 / arr.length}%`}
                                height={`${height}%`}
                                fill="rgba(59, 130, 246, 0.5)"
                              />
                            );
                          })}
                        </svg>
                      </div>

                      {/* Clip name */}
                      <div className="absolute top-1 left-2 text-white text-xs font-medium drop-shadow-lg">
                        {trackA.metadata.filename}
                      </div>

                      {/* Resize handles */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400 opacity-0 group-hover:opacity-100 cursor-ew-resize" />
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-400 opacity-0 group-hover:opacity-100 cursor-ew-resize" />
                    </div>
                  )}

                  {track.id === 'track-b' && trackB && (
                    <div
                      className="absolute top-2 bottom-2 rounded clip-block bg-gradient-to-r from-orange-500/30 to-orange-600/30 border border-orange-500/50 hover:border-orange-400 cursor-move overflow-hidden group transition-all"
                      style={{
                        left: '0px',
                        width: `${trackBDuration * pixelsPerSecond}px`
                      }}
                    >
                      {/* Waveform */}
                      <div className="absolute inset-0 flex items-center px-1">
                        <svg className="w-full h-full" preserveAspectRatio="none">
                          {generateWaveform(trackBDuration, 100).map((amp, i, arr) => {
                            const x = (i / arr.length) * 100;
                            const height = amp * 80;
                            return (
                              <rect
                                key={i}
                                x={`${x}%`}
                                y={`${50 - height / 2}%`}
                                width={`${100 / arr.length}%`}
                                height={`${height}%`}
                                fill="rgba(249, 115, 22, 0.5)"
                              />
                            );
                          })}
                        </svg>
                      </div>

                      {/* Clip name */}
                      <div className="absolute top-1 left-2 text-white text-xs font-medium drop-shadow-lg">
                        {trackB.metadata.filename}
                      </div>

                      {/* Resize handles */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400 opacity-0 group-hover:opacity-100 cursor-ew-resize" />
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-orange-400 opacity-0 group-hover:opacity-100 cursor-ew-resize" />
                    </div>
                  )}

                  {/* Transition blocks */}
                  {track.id === 'transition' && templatePlacements.map((placement) => {
                    const template = templates.get(placement.templateId);
                    if (!template) return null;

                    const startPos = placement.startTime * pixelsPerSecond;
                    const width = (template.duration || 16) * pixelsPerSecond;
                    const isSelected = selectedPlacement?.id === placement.id;

                    return (
                      <div
                        key={placement.id}
                        className={`absolute top-2 bottom-2 rounded clip-block bg-gradient-to-r from-purple-500/40 to-purple-600/40 border cursor-move overflow-hidden group transition-all duration-300 ${
                          isSelected
                            ? 'border-purple-300 shadow-2xl shadow-purple-400/60 scale-105'
                            : 'border-purple-500/60 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-500/40'
                        }`}
                        style={{
                          left: `${startPos}px`,
                          width: `${width}px`,
                          boxShadow: isSelected
                            ? '0 0 30px rgba(168, 85, 247, 0.6), 0 0 60px rgba(168, 85, 247, 0.3), inset 0 0 20px rgba(168, 85, 247, 0.2)'
                            : '0 0 15px rgba(168, 85, 247, 0.3)'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPlacement?.(placement);
                        }}
                      >
                        {/* Template icon/pattern */}
                        <div className="absolute inset-0 opacity-30">
                          <div className="w-full h-full" style={{
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(168, 85, 247, 0.4) 10px, rgba(168, 85, 247, 0.4) 20px)'
                          }} />
                        </div>

                        {/* Glow effect overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Template name */}
                        <div className="absolute top-1 left-2 text-white text-xs font-medium drop-shadow-lg z-10">
                          {template.name}
                        </div>

                        {/* Resize handles */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-300 shadow-lg shadow-purple-400/50 opacity-0 group-hover:opacity-100 cursor-ew-resize z-10" />
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-purple-300 shadow-lg shadow-purple-400/50 opacity-0 group-hover:opacity-100 cursor-ew-resize z-10" />
                      </div>
                    );
                  })}

                  {/* Drag over indicator */}
                  {isDragOver && dragOverTrack === track.id && dragOverPosition !== null && (
                    <div
                      className={`absolute top-0 bottom-0 pointer-events-none animate-pulse ${
                        track.id === 'transition' ? 'w-1' : 'w-0.5'
                      }`}
                      style={{
                        left: `${dragOverPosition * pixelsPerSecond}px`,
                        ...(track.id === 'transition' ? {
                          background: 'linear-gradient(to bottom, rgba(168, 85, 247, 0), rgba(168, 85, 247, 1), rgba(168, 85, 247, 0))',
                          boxShadow: '0 0 20px rgba(168, 85, 247, 0.8), 0 0 40px rgba(168, 85, 247, 0.6)'
                        } : {
                          backgroundColor: '#06b6d4'
                        })
                      }}
                    >
                      {track.id === 'transition' && (
                        <>
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-purple-400 rounded-full shadow-lg shadow-purple-500/50 animate-ping" />
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-purple-300 rounded-full shadow-lg shadow-purple-500/50" />
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Playhead (spans all tracks) */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#0d7ce6] pointer-events-none z-20"
              style={{
                left: `${playheadPosition}px`,
                height: `${tracks.reduce((sum, t) => sum + t.height, 0)}px`
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Controls - Zoom and Timeline Navigation */}
      <div className="bg-[#232323] border-t border-[#2a2a2a] px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <span className="text-xs text-gray-500">Duration: {formatTime(maxDuration)}</span>
        </div>

        {/* Zoom slider */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setZoomLevel(prev => Math.max(prev - 20, 20))}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>

          <input
            type="range"
            min="20"
            max="200"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="w-32 h-1 bg-[#3a3a3a] rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #0d7ce6 0%, #0d7ce6 ${((zoomLevel - 20) / 180) * 100}%, #3a3a3a ${((zoomLevel - 20) / 180) * 100}%, #3a3a3a 100%)`
            }}
          />

          <button
            onClick={() => setZoomLevel(prev => Math.min(prev + 20, 200))}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>

          <span className="text-xs text-gray-500 w-12 text-center">{zoomLevel}px/s</span>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
