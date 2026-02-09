import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import * as Tone from 'tone';
import { useAuth } from '../contexts/AuthContext';
import { storageService, UploadResult } from '../lib/storage';
import { transitionsService } from '../lib/transitionsService';
import { BlendData } from '../lib/blendExportService';
import { AudioScrubber } from './AudioScrubber';
import MashUpSongSelector from './mashup/MashUpSongSelector';
import TransitionTemplatesStep from './mashup/TransitionTemplatesStep';
import MashUpConfirmationStep from './mashup/MashUpConfirmationStep';
import MashUpProcessingStep from './mashup/MashUpProcessingStep';
import MashUpCompletionStep from './mashup/MashUpCompletionStep';
import { TransitionPairConfig } from './mashup/types';
import {
  SONG_LETTERS,
  SONG_COLORS,
  MIN_CLIP_DURATION,
  MAX_CLIP_DURATION,
  DEFAULT_TRANSITION_DURATION,
  formatTime,
  generateMashUpName,
} from './mashup/constants';

interface TransitionCreatorProps {
  onBack: () => void;
  onSave: () => void;
  initialSongA?: UploadResult;
  initialSongB?: UploadResult;
  editingTransitionId?: string;
}

interface ClipMarker {
  start: number;
  end: number;
}

type CreatorStep =
  | 'select-songs'
  | 'set-transition-points'
  | 'set-templates'
  | 'confirm'
  | 'processing'
  | 'complete';

const STEP_LABELS: { step: CreatorStep; label: string }[] = [
  { step: 'select-songs', label: 'Songs' },
  { step: 'set-transition-points', label: 'Clip Points' },
  { step: 'set-templates', label: 'Templates' },
  { step: 'confirm', label: 'Confirm' },
];

const TransitionCreator: React.FC<TransitionCreatorProps> = ({
  onBack,
  onSave,
  initialSongA,
  initialSongB,
}) => {
  const { user } = useAuth();

  const initialSongs = [initialSongA, initialSongB].filter(Boolean) as UploadResult[];
  const [currentStep, setCurrentStep] = useState<CreatorStep>(
    initialSongs.length >= 2 ? 'set-transition-points' : 'select-songs'
  );

  const [songs, setSongs] = useState<UploadResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSongs, setSelectedSongs] = useState<UploadResult[]>(initialSongs);

  const [clipMarkers, setClipMarkers] = useState<ClipMarker[]>([]);
  const [songDurations, setSongDurations] = useState<number[]>([]);

  const [saving, setSaving] = useState(false);
  const [customName, setCustomName] = useState('');

  const [pairConfigs, setPairConfigs] = useState<TransitionPairConfig[]>([]);
  const [completedBlends, setCompletedBlends] = useState<BlendData[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const mashUpName = customName.trim() || (selectedSongs.length > 0 ? generateMashUpName(selectedSongs) : '');

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentStep]);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (currentStep !== 'set-transition-points' || selectedSongs.length === 0) return;

    const players: Tone.Player[] = [];

    selectedSongs.forEach((song, index) => {
      const fallbackDuration = song.metadata?.duration || 300;

      setSongDurations(prev => {
        const next = [...prev];
        next[index] = fallbackDuration;
        return next;
      });
      setClipMarkers(prev => {
        const next = [...prev];
        next[index] = { start: 0, end: fallbackDuration };
        return next;
      });

      try {
        const player = new Tone.Player(song.url, () => {
          const actualDuration = player.buffer.duration;
          if (actualDuration > 0) {
            setSongDurations(prev => {
              const next = [...prev];
              next[index] = actualDuration;
              return next;
            });
            setClipMarkers(prev => {
              const next = [...prev];
              next[index] = { start: 0, end: actualDuration };
              return next;
            });
          }
        });
        players.push(player);
      } catch (error) {
        console.error(`Failed to load duration for song ${index}:`, error);
      }
    });

    return () => {
      players.forEach(p => {
        try { p.dispose(); } catch {}
      });
    };
  }, [currentStep, selectedSongs.length]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const songsData = await storageService.getUserUploads(user.id);
      const readySongs = songsData.filter(s => s.status === 'ready');
      setSongs(readySongs);
    } catch (error) {
      console.error('[TransitionCreator] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToSetPoints = () => {
    if (selectedSongs.length < 2) return;

    const initialMarkers = selectedSongs.map(song => {
      const duration = song.metadata?.duration || 300;
      return { start: 0, end: duration };
    });
    const initialDurations = selectedSongs.map(song => song.metadata?.duration || 300);

    setClipMarkers(initialMarkers);
    setSongDurations(initialDurations);
    setCurrentStep('set-transition-points');
  };

  const updateClipMarker = (songIndex: number, field: 'start' | 'end', value: number) => {
    setClipMarkers(prev => {
      const next = [...prev];
      next[songIndex] = { ...next[songIndex], [field]: value };
      return next;
    });
  };

  const handleBeginEditing = async () => {
    if (!user || selectedSongs.length < 2) return;

    setSaving(true);
    try {
      const name = mashUpName;
      const newPairConfigs: TransitionPairConfig[] = [];

      for (let i = 0; i < selectedSongs.length - 1; i++) {
        const songA = selectedSongs[i];
        const songB = selectedSongs[i + 1];
        const markersA = clipMarkers[i] || { start: 0, end: 300 };
        const markersB = clipMarkers[i + 1] || { start: 0, end: 300 };

        const pairName = selectedSongs.length === 2
          ? name
          : `${name} (${SONG_LETTERS[i]}→${SONG_LETTERS[i + 1]})`;

        const transition = await transitionsService.createTransition(user.id, {
          name: pairName,
          songAId: songA.id,
          songBId: songB.id,
          templateId: null,
          transitionStartPoint: markersA.end,
          transitionDuration: DEFAULT_TRANSITION_DURATION,
          songAEndTime: markersA.end,
          songBStartTime: markersB.start,
          songAMarkerPoint: markersA.end,
          songBMarkerPoint: markersB.start,
          songAClipStart: markersA.start,
          songBClipEnd: markersB.end,
          metadata: {
            songAName: songA.originalName,
            songBName: songB.originalName,
            mashUpGroup: name,
            pairIndex: i,
          },
        });

        newPairConfigs.push({
          transitionId: transition.id,
          songA,
          songB,
          songAIndex: i,
          songBIndex: i + 1,
          selectedTemplate: null,
          directCut: false,
          transitionDuration: DEFAULT_TRANSITION_DURATION,
        });
      }

      setPairConfigs(newPairConfigs);
      setCurrentStep('set-templates');
    } catch (error) {
      console.error('Failed to create transitions:', error);
      alert('Failed to create mash up');
    } finally {
      setSaving(false);
    }
  };

  const handleBackForStep = () => {
    switch (currentStep) {
      case 'set-transition-points':
        setCurrentStep('select-songs');
        break;
      case 'set-templates':
        setCurrentStep('set-transition-points');
        break;
      case 'confirm':
        setCurrentStep('set-templates');
        break;
      default:
        onBack();
    }
  };

  if (currentStep === 'processing') {
    return (
      <MashUpProcessingStep
        pairs={pairConfigs}
        mashUpName={mashUpName}
        onComplete={(blends) => {
          setCompletedBlends(blends);
          setCurrentStep('complete');
        }}
        onBack={() => setCurrentStep('confirm')}
      />
    );
  }

  if (currentStep === 'complete') {
    return (
      <MashUpCompletionStep
        blends={completedBlends}
        pairs={pairConfigs}
        onGoToLibrary={onSave}
        onStartAnother={() => {
          setPairConfigs([]);
          setCompletedBlends([]);
          setSelectedSongs([]);
          setCustomName('');
          setCurrentStep('select-songs');
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const validationWarnings = buildValidationWarnings(selectedSongs, clipMarkers);
  const hasErrors = validationWarnings.some(w => w.type === 'error');

  const currentStepIndex = STEP_LABELS.findIndex(s => s.step === currentStep);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackForStep}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Create New Mash Up</h1>
              <div className="flex items-center space-x-1.5 mt-1">
                {STEP_LABELS.map((s, i) => (
                  <React.Fragment key={s.step}>
                    {i > 0 && <ChevronRight size={10} className="text-gray-600" />}
                    <span className={`text-[11px] ${
                      i === currentStepIndex
                        ? 'text-cyan-400 font-medium'
                        : i < currentStepIndex
                        ? 'text-teal-500/70'
                        : 'text-gray-600'
                    }`}>
                      {s.label}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          {selectedSongs.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5">
              {selectedSongs.slice(0, 5).map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${SONG_COLORS[i % SONG_COLORS.length].bg}`}
                >
                  {SONG_LETTERS[i]}
                </div>
              ))}
              {selectedSongs.length > 5 && (
                <span className="text-xs text-gray-400 ml-1">+{selectedSongs.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {currentStep === 'select-songs' && (
          <MashUpSongSelector
            allSongs={songs}
            selectedSongs={selectedSongs}
            onSongsChange={setSelectedSongs}
            onContinue={handleContinueToSetPoints}
          />
        )}

        {currentStep === 'set-transition-points' && (
          <TransitionPointsStep
            selectedSongs={selectedSongs}
            clipMarkers={clipMarkers}
            songDurations={songDurations}
            customName={customName}
            onCustomNameChange={setCustomName}
            onUpdateClipMarker={updateClipMarker}
            validationWarnings={validationWarnings}
            hasErrors={hasErrors}
            saving={saving}
            onSave={handleBeginEditing}
          />
        )}

        {currentStep === 'set-templates' && (
          <TransitionTemplatesStep
            pairs={pairConfigs}
            onPairsChange={setPairConfigs}
            onContinue={() => setCurrentStep('confirm')}
            onBack={() => setCurrentStep('set-transition-points')}
          />
        )}

        {currentStep === 'confirm' && (
          <MashUpConfirmationStep
            pairs={pairConfigs}
            mashUpName={mashUpName}
            onConfirm={() => setCurrentStep('processing')}
            onBack={() => setCurrentStep('set-templates')}
          />
        )}
      </div>
    </div>
  );
};

interface ValidationWarning {
  type: 'error' | 'warning';
  message: string;
}

function buildValidationWarnings(
  selectedSongs: UploadResult[],
  clipMarkers: ClipMarker[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  selectedSongs.forEach((_, index) => {
    const markers = clipMarkers[index];
    if (!markers) return;

    const clipDuration = markers.end - markers.start;
    const letter = SONG_LETTERS[index];

    if (clipDuration < MIN_CLIP_DURATION) {
      warnings.push({
        type: 'error',
        message: `Song ${letter} clip is too short (${formatTime(clipDuration)}). Minimum is ${MIN_CLIP_DURATION}s.`,
      });
    }
    if (clipDuration > MAX_CLIP_DURATION) {
      warnings.push({
        type: 'warning',
        message: `Song ${letter} clip is long (${formatTime(clipDuration)}). Consider keeping it under ${MAX_CLIP_DURATION}s.`,
      });
    }
  });

  return warnings;
}

interface TransitionPointsStepProps {
  selectedSongs: UploadResult[];
  clipMarkers: ClipMarker[];
  songDurations: number[];
  customName: string;
  onCustomNameChange: (name: string) => void;
  onUpdateClipMarker: (index: number, field: 'start' | 'end', value: number) => void;
  validationWarnings: ValidationWarning[];
  hasErrors: boolean;
  saving: boolean;
  onSave: () => void;
}

const TransitionPointsStep: React.FC<TransitionPointsStepProps> = ({
  selectedSongs,
  clipMarkers,
  songDurations,
  customName,
  onCustomNameChange,
  onUpdateClipMarker,
  validationWarnings,
  hasErrors,
  saving,
  onSave,
}) => {
  const defaultName = generateMashUpName(selectedSongs);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6" data-tutorial="transition-points-interface">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">Set Clip Points</h2>
        <p className="text-gray-400 mb-4">Drag markers to control each song's start and end</p>

        <div className="max-w-md mx-auto">
          <label className="block text-sm font-medium text-gray-300 mb-2 text-left">
            Mash Up Name (Optional)
          </label>
          <input
            type="text"
            placeholder={defaultName}
            value={customName}
            onChange={(e) => onCustomNameChange(e.target.value)}
            maxLength={60}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
          />
          <p className="text-xs text-gray-500 mt-1.5 text-left">
            {customName.length > 0 ? (
              <>Custom: <span className="text-cyan-400 font-medium">{customName}</span> ({customName.length}/60)</>
            ) : (
              <>Default: <span className="text-gray-400 font-medium">{defaultName}</span></>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {selectedSongs.map((song, index) => {
          const markers = clipMarkers[index];
          const duration = songDurations[index];
          if (!markers || !duration) return null;

          const colors = SONG_COLORS[index % SONG_COLORS.length];
          const letter = SONG_LETTERS[index];
          const clipDuration = markers.end - markers.start;

          return (
            <React.Fragment key={song.id}>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 md:p-6 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                      <span className="text-white font-bold text-sm">{letter}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate" title={song.originalName}>
                        {song.originalName}
                      </h4>
                      <p className="text-xs text-gray-500">Drag markers to set boundaries</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">Clip</p>
                    <p className={`text-lg font-bold ${colors.bpmText}`}>{formatTime(clipDuration)}</p>
                  </div>
                </div>

                <AudioScrubber
                  audioUrl={song.url}
                  currentTime={0}
                  duration={duration}
                  onSeek={() => {}}
                  onSetInMarker={(time) => {
                    const maxStart = markers.end - MIN_CLIP_DURATION;
                    onUpdateClipMarker(index, 'start', Math.max(0, Math.min(time, maxStart)));
                  }}
                  onSetEndMarker={(time) => {
                    const minEnd = markers.start + MIN_CLIP_DURATION;
                    onUpdateClipMarker(index, 'end', Math.max(minEnd, Math.min(time, duration)));
                  }}
                  inMarkerLabel="Set START"
                  endMarkerLabel="Set END"
                  isPlaying={false}
                  showGradient={true}
                  markers={[
                    {
                      id: `song-${index}-start`,
                      time: markers.start,
                      color: '#10b981',
                      label: 'START',
                      onDrag: (newTime: number) => {
                        const maxStart = markers.end - MIN_CLIP_DURATION;
                        onUpdateClipMarker(index, 'start', Math.max(0, Math.min(newTime, maxStart)));
                      },
                    },
                    {
                      id: `song-${index}-end`,
                      time: markers.end,
                      color: '#ef4444',
                      label: 'END',
                      onDrag: (newTime: number) => {
                        const minEnd = markers.start + MIN_CLIP_DURATION;
                        onUpdateClipMarker(index, 'end', Math.max(minEnd, Math.min(newTime, duration)));
                      },
                    },
                  ]}
                />

                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">
                      <span className="text-cyan-400 font-mono">{formatTime(markers.start)}</span>
                      {' to '}
                      <span className="text-pink-400 font-mono">{formatTime(markers.end)}</span>
                    </span>
                    <span className="text-gray-500">({formatTime(clipDuration)} clip)</span>
                  </div>
                </div>
              </div>

              {index < selectedSongs.length - 1 && (
                <div className="flex items-center justify-center py-1">
                  <div className="flex-1 h-px bg-gray-700/30" />
                  <div className="mx-4 flex items-center gap-2 px-4 py-1.5 bg-gray-800/50 rounded-full border border-gray-700/50">
                    <div className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white ${SONG_COLORS[index % SONG_COLORS.length].bg}`}>
                      {SONG_LETTERS[index]}
                    </div>
                    <span className="text-[11px] text-gray-500">→</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white ${SONG_COLORS[(index + 1) % SONG_COLORS.length].bg}`}>
                      {SONG_LETTERS[index + 1]}
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-gray-700/30" />
                </div>
              )}
            </React.Fragment>
          );
        })}
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
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    warning.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                >
                  <span className="text-white text-xs font-bold">
                    {warning.type === 'error' ? '!' : 'i'}
                  </span>
                </div>
                <p className={`text-sm ${warning.type === 'error' ? 'text-red-200' : 'text-yellow-200'}`}>
                  {warning.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center pb-8">
        <button
          onClick={onSave}
          disabled={saving || hasErrors}
          className="w-full max-w-md px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
        >
          <span className="text-lg">
            {saving ? 'Creating...' : 'Set Templates'}
          </span>
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default TransitionCreator;
