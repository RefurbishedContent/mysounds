import React, { useState, useEffect, useRef } from 'react';
import { Music, ArrowLeft, ChevronRight, Search, X, SlidersHorizontal, Sparkles, Play, Pause } from 'lucide-react';
import * as Tone from 'tone';
import { useAuth } from '../contexts/AuthContext';
import { storageService, UploadResult } from '../lib/storage';
import { transitionsService } from '../lib/transitionsService';
import { AudioScrubber } from './AudioScrubber';
import { TransitionEditorView } from './TransitionEditorView';

interface TransitionCreatorProps {
  onBack: () => void;
  onSave: () => void;
  initialSongA?: UploadResult;
  initialSongB?: UploadResult;
  editingTransitionId?: string;
}

type CreatorStep = 'select-songs' | 'set-transition-points';

const DEFAULT_TRANSITION_DURATION = 12;
const MIN_CLIP_DURATION = 5;
const MAX_CLIP_DURATION = 30;

const TransitionCreator: React.FC<TransitionCreatorProps> = ({ onBack, onSave, initialSongA, initialSongB, editingTransitionId }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<CreatorStep>(initialSongA && initialSongB ? 'set-transition-points' : 'select-songs');
  const [songs, setSongs] = useState<UploadResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [songA, setSongA] = useState<UploadResult | null>(initialSongA || null);
  const [songB, setSongB] = useState<UploadResult | null>(initialSongB || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [bpmFilter, setBpmFilter] = useState<'all' | 'slow' | 'medium' | 'fast'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'bpm'>('recent');

  const [songAStartMarker, setSongAStartMarker] = useState<number>(0);
  const [songAMarkerPoint, setSongAMarkerPoint] = useState<number>(0);
  const [songBMarkerPoint, setSongBMarkerPoint] = useState<number>(0);
  const [songBEndMarker, setSongBEndMarker] = useState<number>(0);
  const [songACurrentTime, setSongACurrentTime] = useState(0);
  const [songBCurrentTime, setSongBCurrentTime] = useState(0);
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);

  const [transitionId, setTransitionId] = useState<string | null>(editingTransitionId || null);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);

  const [songADuration, setSongADuration] = useState<number>(300);
  const [songBDuration, setSongBDuration] = useState<number>(300);

  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [pendingSong, setPendingSong] = useState<UploadResult | null>(null);
  const selectionPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (songA) {
      const duration = songA.metadata?.duration || 300;
      setSongADuration(duration);
      setSongAStartMarker(0);
      setSongAMarkerPoint(0);

      const loadActualDuration = async () => {
        try {
          const player = new Tone.Player(songA.url, () => {
            const actualDuration = player.buffer.duration;
            player.dispose();
            if (actualDuration > 0) {
              setSongADuration(actualDuration);
              setSongAStartMarker(0);
              setSongAMarkerPoint(0);
            }
          });
        } catch (error) {
          console.error('Failed to load Song A duration:', error);
        }
      };

      loadActualDuration();
    }
  }, [songA]);

  useEffect(() => {
    if (songB) {
      const duration = songB.metadata?.duration || 300;
      setSongBDuration(duration);
      setSongBMarkerPoint(0);
      setSongBEndMarker(0);

      const loadActualDuration = async () => {
        try {
          const player = new Tone.Player(songB.url, () => {
            const actualDuration = player.buffer.duration;
            player.dispose();
            if (actualDuration > 0) {
              setSongBDuration(actualDuration);
              setSongBMarkerPoint(0);
              setSongBEndMarker(0);
            }
          });
        } catch (error) {
          console.error('Failed to load Song B duration:', error);
        }
      };

      loadActualDuration();
    }
  }, [songB]);

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
    if (songA && song.id === songA.id) {
      setSongA(null);
    } else if (songB && song.id === songB.id) {
      setSongB(null);
    } else if (!songA) {
      setSongA(song);
      setTimeout(() => {
        selectionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (!songB && song.id !== songA.id) {
      setSongB(song);
      setTimeout(() => {
        selectionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (songA && songB && song.id !== songA.id && song.id !== songB.id) {
      setPendingSong(song);
      setShowReplaceDialog(true);
    }
  };

  const handleReplaceSong = (slot: 'A' | 'B') => {
    if (!pendingSong) return;

    if (slot === 'A') {
      setSongA(pendingSong);
    } else {
      setSongB(pendingSong);
    }

    setShowReplaceDialog(false);
    setPendingSong(null);

    setTimeout(() => {
      selectionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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
      const transition = await transitionsService.createTransition(user.id, {
        name: `${songA.originalName} → ${songB.originalName}`,
        songAId: songA.id,
        songBId: songB.id,
        templateId: null,
        transitionStartPoint: songAMarkerPoint,
        transitionDuration: DEFAULT_TRANSITION_DURATION,
        songAEndTime: songAMarkerPoint,
        songBStartTime: songBMarkerPoint,
        songAMarkerPoint: songAMarkerPoint,
        songBMarkerPoint: songBMarkerPoint,
        songAClipStart: songAStartMarker,
        songBClipEnd: songBEndMarker,
        metadata: {
          songAName: songA.originalName,
          songBName: songB.originalName
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
        onResetPoints={() => {
          setShowEditor(false);
          setCurrentStep('set-transition-points');
        }}
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

  const songAClipDuration = songAMarkerPoint - songAStartMarker;
  const songBClipDuration = songBEndMarker - songBMarkerPoint;

  const validationWarnings = [];
  if (songA && songAClipDuration < MIN_CLIP_DURATION) {
    validationWarnings.push({
      type: 'error',
      message: `Song A clip is too short (${formatTime(songAClipDuration)}). Minimum is ${MIN_CLIP_DURATION}s.`
    });
  }
  if (songA && songAClipDuration > MAX_CLIP_DURATION) {
    validationWarnings.push({
      type: 'warning',
      message: `Song A clip is quite long (${formatTime(songAClipDuration)}). Consider keeping it under ${MAX_CLIP_DURATION}s for better flow.`
    });
  }
  if (songB && songBClipDuration < MIN_CLIP_DURATION) {
    validationWarnings.push({
      type: 'error',
      message: `Song B clip is too short (${formatTime(songBClipDuration)}). Minimum is ${MIN_CLIP_DURATION}s.`
    });
  }
  if (songB && songBClipDuration > MAX_CLIP_DURATION) {
    validationWarnings.push({
      type: 'warning',
      message: `Song B clip is quite long (${formatTime(songBClipDuration)}). Consider keeping it under ${MAX_CLIP_DURATION}s for better flow.`
    });
  }

  const hasErrors = validationWarnings.some(w => w.type === 'error');

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
              disabled={saving || !songAMarkerPoint || !songBMarkerPoint || hasErrors}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2"
            >
              <Sparkles size={20} />
              <span>{saving ? 'Creating...' : 'Begin Editing'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {currentStep === 'select-songs' && (
          <div data-tutorial="song-selection-interface">
            <div
              ref={selectionPanelRef}
              className="bg-gradient-to-b from-gray-800 via-gray-800 to-gray-800/95 border-b border-gray-700 shadow-2xl"
            >
              <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Song A Card */}
                  <div className={`bg-gray-900/50 rounded-xl p-4 border-2 transition-all backdrop-blur-sm ${
                    songA ? 'border-cyan-500 bg-cyan-500/5 shadow-lg shadow-cyan-500/20' : 'border-dashed border-gray-700'
                  }`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        songA ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/50' : 'bg-gray-700'
                      }`}>
                        <span className="text-white font-bold text-lg">A</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Song A (Ending)</p>
                        {songA ? (
                          <>
                            <p className="text-white font-semibold text-sm truncate mb-2">{songA.originalName}</p>
                            {songA.analysis && (
                              <div className="flex items-center gap-2 flex-wrap">
                                {songA.analysis.bpm && (
                                  <div className="flex items-center gap-1 bg-cyan-500/20 px-2 py-1 rounded">
                                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-bold text-cyan-300">{Math.round(songA.analysis.bpm)} BPM</span>
                                  </div>
                                )}
                                {songA.analysis.key && (
                                  <div className="bg-gray-700/80 px-2 py-1 rounded">
                                    <span className="text-xs font-medium text-gray-300">{songA.analysis.key}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-500 text-sm italic">Select ending song...</p>
                        )}
                      </div>
                      {songA && (
                        <button
                          onClick={() => setSongA(null)}
                          className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors flex-shrink-0"
                        >
                          <X size={16} className="text-gray-400 hover:text-white" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Analytics/Compatibility Panel */}
                  <div className="bg-gradient-to-br from-gray-900/80 to-gray-900/50 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm">
                    {songA && songB ? (
                      <div className="space-y-3">
                        {/* Compatibility Score */}
                        <div className="text-center">
                          <div className="relative inline-flex items-center justify-center">
                            <svg className="w-16 h-16 transform -rotate-90">
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                                className="text-gray-700"
                              />
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray={`${getCompatibilityScore(songA, songB) * 1.76} 176`}
                                className="text-cyan-400 transition-all duration-1000"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xl font-bold text-cyan-400">{getCompatibilityScore(songA, songB)}%</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Match Quality</p>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* BPM Match */}
                          <div className="bg-gray-800/50 rounded-lg px-2 py-1.5 text-center">
                            <div className={`text-sm font-bold ${getBPMCompatibility(songA, songB) > 90 ? 'text-green-400' : getBPMCompatibility(songA, songB) > 70 ? 'text-yellow-400' : 'text-orange-400'}`}>
                              {getBPMCompatibility(songA, songB)}%
                            </div>
                            <div className="text-gray-500 text-[10px] uppercase">Tempo</div>
                          </div>

                          {/* Energy Match */}
                          <div className="bg-gray-800/50 rounded-lg px-2 py-1.5 text-center">
                            <div className={`text-sm font-bold ${getEnergyMatch(songA, songB) > 80 ? 'text-green-400' : 'text-cyan-400'}`}>
                              {getEnergyMatch(songA, songB)}%
                            </div>
                            <div className="text-gray-500 text-[10px] uppercase">Energy</div>
                          </div>
                        </div>

                        {/* Continue Button */}
                        <button
                          onClick={handleContinueToSetPoints}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/40 hover:scale-105"
                        >
                          <span className="text-sm">Continue</span>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center space-y-2 py-2">
                        <div className="text-2xl font-bold text-gray-600">{songA || songB ? '1' : '0'}/2</div>
                        <p className="text-xs text-gray-500 text-center">
                          {!songA && !songB ? 'Select both songs' : songA && !songB ? 'Select Song B' : 'Select Song A'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Song B Card */}
                  <div className={`bg-gray-900/50 rounded-xl p-4 border-2 transition-all backdrop-blur-sm ${
                    songB ? 'border-green-500 bg-green-500/5 shadow-lg shadow-green-500/20' : 'border-dashed border-gray-700'
                  }`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        songB ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/50' : 'bg-gray-700'
                      }`}>
                        <span className="text-white font-bold text-lg">B</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Song B (Beginning)</p>
                        {songB ? (
                          <>
                            <p className="text-white font-semibold text-sm truncate mb-2">{songB.originalName}</p>
                            {songB.analysis && (
                              <div className="flex items-center gap-2 flex-wrap">
                                {songB.analysis.bpm && (
                                  <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-bold text-green-300">{Math.round(songB.analysis.bpm)} BPM</span>
                                  </div>
                                )}
                                {songB.analysis.key && (
                                  <div className="bg-gray-700/80 px-2 py-1 rounded">
                                    <span className="text-xs font-medium text-gray-300">{songB.analysis.key}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-500 text-sm italic">Select starting song...</p>
                        )}
                      </div>
                      {songB && (
                        <button
                          onClick={() => setSongB(null)}
                          className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors flex-shrink-0"
                        >
                          <X size={16} className="text-gray-400 hover:text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white">Your Library ({songs.length} songs)</h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm ${
                    showFilters
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  <span>Filters</span>
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search songs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {showFilters && (
                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">BPM Range</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {['all', 'slow', 'medium', 'fast'].map((filter) => (
                            <button
                              key={filter}
                              onClick={() => setBpmFilter(filter as any)}
                              className={`px-2 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
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
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Sort By</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="recent">Most Recent</option>
                          <option value="name">Name (A-Z)</option>
                          <option value="bpm">BPM (Low to High)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                      <p className="text-xs text-gray-500">
                        {getFilteredAndSortedSongs().length} of {songs.length} songs shown
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setBpmFilter('all');
                          setSortBy('recent');
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {songs.length === 0 ? (
                <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                  <Music size={36} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm mb-1">No songs in your library</p>
                  <p className="text-gray-500 text-xs">Upload some tracks in the Library section first!</p>
                </div>
              ) : getFilteredAndSortedSongs().length === 0 ? (
                <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                  <Search size={36} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm mb-2">No songs match your filters</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setBpmFilter('all');
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                  {getFilteredAndSortedSongs().map((song) => {
                    const isSongA = songA?.id === song.id;
                    const isSongB = songB?.id === song.id;
                    const isSelected = isSongA || isSongB;

                    return (
                      <button
                        key={song.id}
                        onClick={() => handleSongSelect(song)}
                        className={`
                          bg-gray-800 rounded-lg p-2 text-left transition-all duration-200 group
                          ${isSongA
                            ? 'ring-2 ring-cyan-500 bg-cyan-500/5'
                            : isSongB
                            ? 'ring-2 ring-green-500 bg-green-500/5'
                            : 'hover:bg-gray-750 hover:ring-1 hover:ring-gray-600'
                          }
                        `}
                      >
                        <div className="w-full aspect-square bg-gradient-to-br from-cyan-600/20 to-purple-600/20 rounded-md mb-1.5 flex items-center justify-center relative overflow-hidden">
                          <Music className="w-6 h-6 text-cyan-400" />
                          {isSelected && (
                            <div className={`absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center font-bold text-xs text-white ${
                              isSongA ? 'bg-cyan-500' : 'bg-green-500'
                            }`}>
                              {isSongA ? 'A' : 'B'}
                            </div>
                          )}
                        </div>
                        <h3 className="text-white font-medium text-xs truncate mb-0.5" title={song.originalName}>
                          {song.originalName}
                        </h3>
                        <p className="text-gray-400 text-[10px]">
                          {song.analysis?.bpm ? `${Math.round(song.analysis.bpm)} BPM` : 'No BPM'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {showReplaceDialog && pendingSong && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                  <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6 shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-2">Replace Song</h3>
                    <p className="text-gray-400 text-sm mb-6">
                      You already have 2 songs selected. Which one would you like to replace with <span className="text-white font-medium">{pendingSong.originalName}</span>?
                    </p>

                    <div className="space-y-3 mb-6">
                      {songA && (
                        <button
                          onClick={() => handleReplaceSong('A')}
                          className="w-full bg-gray-900 hover:bg-cyan-500/10 border-2 border-cyan-500 rounded-lg p-4 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-lg">A</span>
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-xs text-gray-400 mb-0.5">Replace Song A</p>
                              <p className="text-white font-medium text-sm truncate">{songA.originalName}</p>
                            </div>
                            <ChevronRight className="text-cyan-400 group-hover:translate-x-1 transition-transform" size={20} />
                          </div>
                        </button>
                      )}

                      {songB && (
                        <button
                          onClick={() => handleReplaceSong('B')}
                          className="w-full bg-gray-900 hover:bg-green-500/10 border-2 border-green-500 rounded-lg p-4 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-lg">B</span>
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-xs text-gray-400 mb-0.5">Replace Song B</p>
                              <p className="text-white font-medium text-sm truncate">{songB.originalName}</p>
                            </div>
                            <ChevronRight className="text-green-400 group-hover:translate-x-1 transition-transform" size={20} />
                          </div>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setShowReplaceDialog(false);
                        setPendingSong(null);
                      }}
                      className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
          </div>
        )}

        {currentStep === 'set-transition-points' && songA && songB && (
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6" data-tutorial="transition-points-interface">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Set Transition Points</h2>
              <p className="text-gray-400">Drag markers to control when songs start, fade, and end</p>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{songA.originalName}</h4>
                    <p className="text-sm text-gray-400">Drag markers to set Song A boundaries</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Clip Duration</p>
                    <p className="text-xl font-bold text-cyan-400">{formatTime(songAMarkerPoint - songAStartMarker)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      From {formatTime(songAStartMarker)} to {formatTime(songAMarkerPoint)}
                    </p>
                  </div>
                </div>

                <AudioScrubber
                  audioUrl={songA.url}
                  currentTime={songACurrentTime}
                  duration={songADuration}
                  onSeek={(time) => {
                    setSongACurrentTime(time);
                  }}
                  onSetInMarker={(time) => {
                    const maxStart = songAMarkerPoint - 5;
                    setSongAStartMarker(Math.max(0, Math.min(time, maxStart)));
                  }}
                  onSetEndMarker={(time) => {
                    const minEnd = songAStartMarker + 5;
                    setSongAMarkerPoint(Math.max(minEnd, Math.min(time, songADuration)));
                  }}
                  inMarkerLabel="Set START"
                  endMarkerLabel="Set OUT"
                  isPlaying={isPlayingA}
                  markers={[
                    {
                      id: 'song-a-start',
                      time: songAStartMarker,
                      color: '#10b981',
                      label: 'START',
                      onDrag: (newTime) => {
                        const maxStart = songAMarkerPoint - 5;
                        setSongAStartMarker(Math.max(0, Math.min(newTime, maxStart)));
                      }
                    },
                    {
                      id: 'song-a-end',
                      time: songAMarkerPoint,
                      color: '#ef4444',
                      label: 'OUT',
                      onDrag: (newTime) => {
                        const minEnd = songAStartMarker + 5;
                        setSongAMarkerPoint(Math.max(minEnd, Math.min(newTime, songADuration)));
                      }
                    }
                  ]}
                />

                <div className="mt-4 bg-gray-900 rounded-lg p-4 border border-red-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-300">
                        Extraction Range: <span className="text-green-400 font-mono">{formatTime(songAStartMarker)}</span> (START) to <span className="text-red-400 font-mono">{formatTime(songAMarkerPoint)}</span> (OUT)
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">({formatTime(songAMarkerPoint - songAStartMarker)} clip)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center py-4">
                <div className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-green-500/20 rounded-full border border-purple-500/30">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">
                    {DEFAULT_TRANSITION_DURATION}s Transition Blend
                  </span>
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{songB.originalName}</h4>
                    <p className="text-sm text-gray-400">Drag markers to set Song B boundaries</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Clip Duration</p>
                    <p className="text-xl font-bold text-green-400">{formatTime(songBEndMarker - songBMarkerPoint)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      From {formatTime(songBMarkerPoint)} to {formatTime(songBEndMarker)}
                    </p>
                  </div>
                </div>

                <AudioScrubber
                  audioUrl={songB.url}
                  currentTime={songBCurrentTime}
                  duration={songBDuration}
                  onSeek={(time) => {
                    setSongBCurrentTime(time);
                  }}
                  onSetInMarker={(time) => {
                    const maxStart = songBEndMarker - 5;
                    setSongBMarkerPoint(Math.max(0, Math.min(time, maxStart)));
                  }}
                  onSetEndMarker={(time) => {
                    const minEnd = songBMarkerPoint + 5;
                    setSongBEndMarker(Math.max(minEnd, Math.min(time, songBDuration)));
                  }}
                  inMarkerLabel="Set IN"
                  endMarkerLabel="Set END"
                  isPlaying={isPlayingB}
                  markers={[
                    {
                      id: 'song-b-start',
                      time: songBMarkerPoint,
                      color: '#10b981',
                      label: 'IN',
                      onDrag: (newTime) => {
                        const maxStart = songBEndMarker - 5;
                        setSongBMarkerPoint(Math.max(0, Math.min(newTime, maxStart)));
                      }
                    },
                    {
                      id: 'song-b-end',
                      time: songBEndMarker,
                      color: '#ef4444',
                      label: 'END',
                      onDrag: (newTime) => {
                        const minEnd = songBMarkerPoint + 5;
                        setSongBEndMarker(Math.max(minEnd, Math.min(newTime, songBDuration)));
                      }
                    }
                  ]}
                />

                <div className="mt-4 bg-gray-900 rounded-lg p-4 border border-red-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-300">
                        Extraction Range: <span className="text-green-400 font-mono">{formatTime(songBMarkerPoint)}</span> (IN) to <span className="text-red-400 font-mono">{formatTime(songBEndMarker)}</span> (END)
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">({formatTime(songBEndMarker - songBMarkerPoint)} clip)</span>
                  </div>
                </div>
              </div>
            </div>

            {validationWarnings.length > 0 && (
              <div className="space-y-2">
                {validationWarnings.map((warning, index) => (
                  <div
                    key={index}
                    className={`rounded-lg p-4 border ${
                      warning.type === 'error'
                        ? 'bg-red-900/20 border-red-700/50'
                        : 'bg-yellow-900/20 border-yellow-700/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          warning.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}
                      >
                        <span className="text-white text-xs font-bold">
                          {warning.type === 'error' ? '!' : 'i'}
                        </span>
                      </div>
                      <p
                        className={`text-sm ${
                          warning.type === 'error' ? 'text-red-200' : 'text-yellow-200'
                        }`}
                      >
                        {warning.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

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

function getCompatibilityScore(songA: UploadResult, songB: UploadResult): number {
  let score = 0;
  let factors = 0;

  const bpmA = songA.analysis?.bpm;
  const bpmB = songB.analysis?.bpm;
  const keyA = songA.analysis?.key;
  const keyB = songB.analysis?.key;

  if (bpmA && bpmB) {
    const bpmDiff = Math.abs(bpmA - bpmB);
    const bpmScore = Math.max(0, 100 - (bpmDiff * 2));
    score += bpmScore;
    factors++;
  }

  if (keyA && keyB) {
    const compatibleKeys = areKeysCompatible(keyA, keyB);
    score += compatibleKeys ? 100 : 60;
    factors++;
  }

  if (factors === 0) return 75;
  return Math.round(score / factors);
}

function getBPMCompatibility(songA: UploadResult, songB: UploadResult): number {
  const bpmA = songA.analysis?.bpm;
  const bpmB = songB.analysis?.bpm;

  if (!bpmA || !bpmB) return 75;

  const bpmDiff = Math.abs(bpmA - bpmB);

  if (bpmDiff === 0) return 100;
  if (bpmDiff <= 3) return 95;
  if (bpmDiff <= 5) return 90;
  if (bpmDiff <= 10) return 80;
  if (bpmDiff <= 15) return 70;
  if (bpmDiff <= 20) return 60;
  return Math.max(40, 60 - bpmDiff);
}

function getEnergyMatch(songA: UploadResult, songB: UploadResult): number {
  const bpmA = songA.analysis?.bpm || 120;
  const bpmB = songB.analysis?.bpm || 120;

  const energyA = bpmA > 140 ? 'high' : bpmA > 100 ? 'medium' : 'low';
  const energyB = bpmB > 140 ? 'high' : bpmB > 100 ? 'medium' : 'low';

  if (energyA === energyB) return 95;

  const diff = Math.abs(
    (bpmA > 140 ? 2 : bpmA > 100 ? 1 : 0) -
    (bpmB > 140 ? 2 : bpmB > 100 ? 1 : 0)
  );

  if (diff === 1) return 75;
  return 60;
}

function areKeysCompatible(keyA: string, keyB: string): boolean {
  const compatiblePairs: Record<string, string[]> = {
    'C': ['C', 'G', 'F', 'Am', 'Em', 'Dm'],
    'G': ['G', 'D', 'C', 'Em', 'Bm', 'Am'],
    'D': ['D', 'A', 'G', 'Bm', 'F#m', 'Em'],
    'A': ['A', 'E', 'D', 'F#m', 'C#m', 'Bm'],
    'E': ['E', 'B', 'A', 'C#m', 'G#m', 'F#m'],
    'F': ['F', 'C', 'Bb', 'Dm', 'Am', 'Gm'],
  };

  for (const [key, compatible] of Object.entries(compatiblePairs)) {
    if (keyA.includes(key) && compatible.some(k => keyB.includes(k))) {
      return true;
    }
  }

  return keyA === keyB;
}

export default TransitionCreator;
