import React, { useState, useEffect } from 'react';
import { Music, ArrowLeft, Check, ChevronRight, Search, X, SlidersHorizontal, Zap, Clock, Timer, Sparkles, Play, Pause } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { storageService, UploadResult } from '../lib/storage';
import { transitionsService } from '../lib/transitionsService';
import { AudioScrubber } from './AudioScrubber';
import { TransitionEditorView } from './TransitionEditorView';

interface TransitionCreatorProps {
  onBack: () => void;
  onSave: () => void;
  initialSongA?: UploadResult;
}

type CreatorStep = 'select-songs' | 'set-transition-points';
type DurationSize = 'short' | 'medium' | 'long';

const DURATION_RANGES = {
  short: { min: 4, max: 8, default: 6 },
  medium: { min: 8, max: 15, default: 12 },
  long: { min: 16, max: 25, default: 20 }
};

const getDurationForSize = (size: DurationSize): number => {
  return DURATION_RANGES[size].default;
};

const TransitionCreator: React.FC<TransitionCreatorProps> = ({ onBack, onSave, initialSongA }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<CreatorStep>('select-songs');
  const [songs, setSongs] = useState<UploadResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [songA, setSongA] = useState<UploadResult | null>(initialSongA || null);
  const [songB, setSongB] = useState<UploadResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [bpmFilter, setBpmFilter] = useState<'all' | 'slow' | 'medium' | 'fast'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'bpm'>('recent');
  const [durationSize, setDurationSize] = useState<DurationSize>('medium');
  const [transitionDuration, setTransitionDuration] = useState(12);

  const [songAMarkerPoint, setSongAMarkerPoint] = useState<number>(0);
  const [songBMarkerPoint, setSongBMarkerPoint] = useState<number>(0);
  const [songACurrentTime, setSongACurrentTime] = useState(0);
  const [songBCurrentTime, setSongBCurrentTime] = useState(0);
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);

  const [transitionId, setTransitionId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (songA) {
      const duration = songA.metadata?.duration || 180;
      setSongAMarkerPoint(Math.max(30, duration - 30));
    }
  }, [songA]);

  const handleDurationSizeChange = (size: DurationSize) => {
    setDurationSize(size);
    setTransitionDuration(getDurationForSize(size));
  };

  const loadData = async () => {
    if (!user) {
      console.log('[TransitionCreator] No user, skipping load');
      return;
    }

    console.log('[TransitionCreator] Loading data for user:', user.id, user.email);
    setLoading(true);
    try {
      const songsData = await storageService.getUserUploads(user.id);
      const readySongs = songsData.filter(s => s.status === 'ready');
      console.log('[TransitionCreator] Loaded data:', {
        totalSongs: songsData.length,
        readySongs: readySongs.length,
        songs: readySongs
      });
      setSongs(readySongs);
    } catch (error) {
      console.error('[TransitionCreator] Failed to load data:', error);
      alert(`Failed to load library: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAndSortedSongs = () => {
    let filtered = [...songs];

    if (searchQuery) {
      filtered = filtered.filter(song =>
        song.originalName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (bpmFilter !== 'all') {
      filtered = filtered.filter(song => {
        const bpm = song.analysis?.bpm;
        if (!bpm) return false;
        if (bpmFilter === 'slow') return bpm < 100;
        if (bpmFilter === 'medium') return bpm >= 100 && bpm < 140;
        if (bpmFilter === 'fast') return bpm >= 140;
        return true;
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.originalName.localeCompare(b.originalName);
      } else if (sortBy === 'bpm') {
        const bpmA = a.analysis?.bpm || 0;
        const bpmB = b.analysis?.bpm || 0;
        return bpmA - bpmB;
      }
      return 0;
    });

    return filtered;
  };

  const handleSongSelect = (song: UploadResult) => {
    if (!songA) {
      setSongA(song);
    } else if (!songB && song.id !== songA.id) {
      setSongB(song);
    } else if (songA && song.id === songA.id) {
      setSongA(null);
    } else if (songB && song.id === songB.id) {
      setSongB(null);
    }
  };

  const handleContinueToSetPoints = () => {
    if (songA && songB) {
      setCurrentStep('set-transition-points');
    }
  };

  const handleBeginEditing = async () => {
    if (!user || !songA || !songB) return;

    setSaving(true);
    try {
      const songAClipStart = Math.max(0, songAMarkerPoint - transitionDuration);
      const songBClipEnd = songBMarkerPoint + transitionDuration;

      const transition = await transitionsService.createTransition(user.id, {
        name: `${songA.originalName} → ${songB.originalName}`,
        songAId: songA.id,
        songBId: songB.id,
        templateId: null,
        transitionStartPoint: songAMarkerPoint,
        transitionDuration: transitionDuration,
        songAEndTime: songAMarkerPoint,
        songBStartTime: songBMarkerPoint,
        songAMarkerPoint: songAMarkerPoint,
        songBMarkerPoint: songBMarkerPoint,
        songAClipStart: songAClipStart,
        songBClipEnd: songBClipEnd,
        metadata: {
          songAName: songA.originalName,
          songBName: songB.originalName,
          durationSize: durationSize
        }
      });

      setTransitionId(transition.id);
      setShowEditor(true);
    } catch (error) {
      console.error('Failed to create transition:', error);
      alert('Failed to create transition');
    } finally {
      setSaving(false);
    }
  };

  if (showEditor && transitionId && songA && songB) {
    return (
      <TransitionEditorView
        songA={songA}
        songB={songB}
        transitionId={transitionId}
        onBack={onBack}
        onSave={onSave}
      />
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const songADuration = songA?.metadata?.duration || 180;
  const songBDuration = songB?.metadata?.duration || 180;
  const songAClipStart = Math.max(0, songAMarkerPoint - transitionDuration);
  const songBClipEnd = songBMarkerPoint + transitionDuration;

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Create New Transition</h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs ${currentStep === 'select-songs' ? 'text-cyan-400' : 'text-gray-500'}`}>
                  Select Songs
                </span>
                <ChevronRight size={12} className="text-gray-600" />
                <span className={`text-xs ${currentStep === 'set-transition-points' ? 'text-cyan-400' : 'text-gray-500'}`}>
                  Set Transition Points
                </span>
              </div>
            </div>
          </div>

          {currentStep === 'set-transition-points' && (
            <button
              onClick={handleBeginEditing}
              disabled={saving || !songAMarkerPoint || !songBMarkerPoint}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2"
            >
              <Sparkles size={20} />
              <span>{saving ? 'Creating...' : 'Begin Editing'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {currentStep === 'select-songs' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Select Two Songs to Blend</h2>
              <p className="text-gray-400">Choose the ending song and the beginning song for your transition</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Music className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Song A (Ending)</p>
                  {songA ? (
                    <div className="space-y-1">
                      <p className="text-white font-medium">{songA.originalName}</p>
                      <div className="flex items-center justify-center space-x-1">
                        <Check size={14} className="text-green-400" />
                        <span className="text-xs text-green-400">Selected</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Click a song below</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Music className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Song B (Beginning)</p>
                  {songB ? (
                    <div className="space-y-1">
                      <p className="text-white font-medium">{songB.originalName}</p>
                      <div className="flex items-center justify-center space-x-1">
                        <Check size={14} className="text-green-400" />
                        <span className="text-xs text-green-400">Selected</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Click a song below</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Your Library ({songs.length} songs)</h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    showFilters
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
                  }`}
                >
                  <SlidersHorizontal size={16} />
                  <span className="text-sm font-medium">Filters</span>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search songs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {showFilters && (
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">BPM Range</label>
                        <div className="grid grid-cols-4 gap-2">
                          {['all', 'slow', 'medium', 'fast'].map((filter) => (
                            <button
                              key={filter}
                              onClick={() => setBpmFilter(filter as any)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                bpmFilter === filter
                                  ? 'bg-cyan-600 text-white'
                                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                              }`}
                            >
                              {filter === 'all' ? 'All' : filter === 'slow' ? '<100' : filter === 'medium' ? '100-140' : '140+'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Sort By</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="recent">Most Recent</option>
                          <option value="name">Name (A-Z)</option>
                          <option value="bpm">BPM (Low to High)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                      <p className="text-sm text-gray-500">
                        {getFilteredAndSortedSongs().length} of {songs.length} songs shown
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setBpmFilter('all');
                          setSortBy('recent');
                        }}
                        className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {songs.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                  <Music size={48} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No songs in your library</p>
                  <p className="text-gray-500 text-sm">Upload some tracks in the Library section first!</p>
                </div>
              ) : getFilteredAndSortedSongs().length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                  <Search size={48} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No songs match your filters</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setBpmFilter('all');
                    }}
                    className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {getFilteredAndSortedSongs().map((song) => {
                    const isSelected = songA?.id === song.id || songB?.id === song.id;
                    const isDisabled = songA && songB && !isSelected;

                    return (
                      <button
                        key={song.id}
                        onClick={() => !isDisabled && handleSongSelect(song)}
                        disabled={isDisabled}
                        className={`
                          bg-gray-800 rounded-lg p-4 text-left transition-all duration-200
                          ${isSelected
                            ? 'ring-2 ring-cyan-500 bg-gray-750'
                            : isDisabled
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-gray-750 hover:shadow-lg'
                          }
                        `}
                      >
                        <div className="w-full aspect-square bg-gradient-to-br from-cyan-600/20 to-purple-600/20 rounded-lg mb-3 flex items-center justify-center relative">
                          <Music className="w-12 h-12 text-cyan-400" />
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                              <Check size={14} className="text-white" />
                            </div>
                          )}
                        </div>
                        <h3 className="text-white font-medium text-sm truncate mb-1">
                          {song.originalName}
                        </h3>
                        <p className="text-gray-400 text-xs">
                          {song.analysis?.bpm ? `${Math.round(song.analysis.bpm)} BPM` : 'Not analyzed'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {songA && songB && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={handleContinueToSetPoints}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60"
                >
                  <span>Continue</span>
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === 'set-transition-points' && songA && songB && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Set Transition Points</h2>
              <p className="text-gray-400">Choose where Song A ends and Song B begins</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Transition Duration</h3>
              <p className="text-sm text-gray-400 mb-4">Choose how long the blend between songs should take</p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <button
                  onClick={() => handleDurationSizeChange('short')}
                  className={`
                    relative p-6 rounded-xl border-2 transition-all duration-200
                    ${durationSize === 'short'
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600 hover:bg-gray-800'
                    }
                  `}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${durationSize === 'short' ? 'bg-cyan-500' : 'bg-gray-700'}
                    `}>
                      <Zap className={`w-6 h-6 ${durationSize === 'short' ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${durationSize === 'short' ? 'text-cyan-400' : 'text-white'}`}>
                        Short
                      </p>
                      <p className="text-sm text-gray-400 mt-1">{DURATION_RANGES.short.default} seconds</p>
                      <p className="text-xs text-gray-500 mt-2">Quick, energetic blend</p>
                    </div>
                  </div>
                  {durationSize === 'short' && (
                    <div className="absolute top-3 right-3">
                      <Check className="w-5 h-5 text-cyan-400" />
                    </div>
                  )}
                </button>

                <button
                  onClick={() => handleDurationSizeChange('medium')}
                  className={`
                    relative p-6 rounded-xl border-2 transition-all duration-200
                    ${durationSize === 'medium'
                      ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600 hover:bg-gray-800'
                    }
                  `}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${durationSize === 'medium' ? 'bg-blue-500' : 'bg-gray-700'}
                    `}>
                      <Clock className={`w-6 h-6 ${durationSize === 'medium' ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${durationSize === 'medium' ? 'text-blue-400' : 'text-white'}`}>
                        Medium
                      </p>
                      <p className="text-sm text-gray-400 mt-1">{DURATION_RANGES.medium.default} seconds</p>
                      <p className="text-xs text-gray-500 mt-2">Balanced transition</p>
                    </div>
                  </div>
                  {durationSize === 'medium' && (
                    <div className="absolute top-3 right-3">
                      <Check className="w-5 h-5 text-blue-400" />
                    </div>
                  )}
                </button>

                <button
                  onClick={() => handleDurationSizeChange('long')}
                  className={`
                    relative p-6 rounded-xl border-2 transition-all duration-200
                    ${durationSize === 'long'
                      ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600 hover:bg-gray-800'
                    }
                  `}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${durationSize === 'long' ? 'bg-purple-500' : 'bg-gray-700'}
                    `}>
                      <Timer className={`w-6 h-6 ${durationSize === 'long' ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${durationSize === 'long' ? 'text-purple-400' : 'text-white'}`}>
                        Long
                      </p>
                      <p className="text-sm text-gray-400 mt-1">{DURATION_RANGES.long.default} seconds</p>
                      <p className="text-xs text-gray-500 mt-2">Smooth, gradual blend</p>
                    </div>
                  </div>
                  {durationSize === 'long' && (
                    <div className="absolute top-3 right-3">
                      <Check className="w-5 h-5 text-purple-400" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{songA.originalName}</h4>
                    <p className="text-sm text-gray-400">Select where Song A should END</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Marker at</p>
                    <p className="text-xl font-bold text-blue-400">{formatTime(songAMarkerPoint)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Will use {transitionDuration}s before this point
                    </p>
                  </div>
                </div>

                <AudioScrubber
                  audioUrl={songA.url}
                  currentTime={songACurrentTime}
                  duration={songADuration}
                  onSeek={(time) => {
                    setSongACurrentTime(time);
                    setSongAMarkerPoint(time);
                  }}
                  isPlaying={isPlayingA}
                />

                <div className="mt-4 bg-gray-900 rounded-lg p-4 border border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-300">
                        Extraction Range: <span className="text-blue-400 font-mono">{formatTime(songAClipStart)}</span> to <span className="text-blue-400 font-mono">{formatTime(songAMarkerPoint)}</span>
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">({transitionDuration}s clip)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center py-4">
                <div className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-green-500/20 rounded-full border border-purple-500/30">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">
                    {transitionDuration}s Transition Blend
                  </span>
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{songB.originalName}</h4>
                    <p className="text-sm text-gray-400">Select where Song B should START</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Marker at</p>
                    <p className="text-xl font-bold text-green-400">{formatTime(songBMarkerPoint)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Will use {transitionDuration}s after this point
                    </p>
                  </div>
                </div>

                <AudioScrubber
                  audioUrl={songB.url}
                  currentTime={songBCurrentTime}
                  duration={songBDuration}
                  onSeek={(time) => {
                    setSongBCurrentTime(time);
                    setSongBMarkerPoint(time);
                  }}
                  isPlaying={isPlayingB}
                />

                <div className="mt-4 bg-gray-900 rounded-lg p-4 border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-300">
                        Extraction Range: <span className="text-green-400 font-mono">{formatTime(songBMarkerPoint)}</span> to <span className="text-green-400 font-mono">{formatTime(songBClipEnd)}</span>
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">({transitionDuration}s clip)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-cyan-300 font-semibold mb-2">Ready to Begin Editing</h4>
                  <p className="text-cyan-100/80 text-sm mb-4">
                    Your transition points are set. Click "Begin Editing" to enter the full editor where you can:
                  </p>
                  <ul className="text-cyan-100/70 text-sm space-y-1 list-disc list-inside">
                    <li>Browse and apply transition templates</li>
                    <li>Fine-tune timing and crossfades</li>
                    <li>Use AI Fusion for automatic blending</li>
                    <li>Preview your transition in real-time</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default TransitionCreator;
