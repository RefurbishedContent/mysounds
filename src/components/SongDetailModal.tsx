import React, { useState, useEffect } from 'react';
import { Music, X, Play, Pause, Zap, Clock, FileAudio, TrendingUp, BarChart3, Gauge, Sparkles, Activity, ChevronDown, ChevronUp, Hash, Headphones, Mic, Waves, RefreshCw, CheckCircle, AlertCircle, Loader, Radio, Key, Disc, Volume2, Edit3, Save } from 'lucide-react';
import { UploadResult } from '../lib/storage';
import { audioPlayer } from '../lib/audioPlayer';
import { songAnalyzer } from '../lib/songAnalyzer';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface SongDetailModalProps {
  song: UploadResult;
  onClose: () => void;
  onCreateTransition: (song: UploadResult) => void;
}

const SongDetailModal: React.FC<SongDetailModalProps> = ({ song, onClose, onCreateTransition }) => {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentSong, setCurrentSong] = useState(song);
  const [isEditingGenre, setIsEditingGenre] = useState(false);
  const [manualGenre, setManualGenre] = useState('');
  const [savingGenre, setSavingGenre] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  useEffect(() => {
    setCurrentSong(song);
  }, [song]);

  useEffect(() => {
    const checkPlayingState = () => {
      setIsPlaying(audioPlayer.isPlaying() && audioPlayer.getCurrentUrl() === currentSong.url);
    };

    const interval = setInterval(checkPlayingState, 100);
    return () => {
      clearInterval(interval);
    };
  }, [currentSong.url]);

  useEffect(() => {
    const subscription = songAnalyzer.subscribeToAnalysisUpdates(
      currentSong.id,
      (analysis, status) => {
        setCurrentSong(prev => ({
          ...prev,
          analysis: analysis || prev.analysis,
          status: status as any
        }));
        if (status === 'ready') {
          setAnalyzing(false);
        }
      }
    );

    return () => {
      audioPlayer.stop();
      subscription.unsubscribe();
    };
  }, [currentSong.id]);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioPlayer.pause();
      setIsPlaying(false);
    } else {
      audioPlayer.play(currentSong.url);
      setIsPlaying(true);
    }
  };

  const handleAnalyze = async () => {
    if (!user) return;

    setAnalyzing(true);
    try {
      await songAnalyzer.analyzeSong(currentSong.id, user.id);
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 2000);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert(error instanceof Error ? error.message : 'Analysis failed');
      setAnalyzing(false);
    }
  };

  const handleSaveGenre = async () => {
    if (!manualGenre.trim()) return;

    setSavingGenre(true);
    try {
      const { error } = await supabase
        .from('uploads')
        .update({ manual_genre: manualGenre.trim() })
        .eq('id', currentSong.id);

      if (error) throw error;

      setCurrentSong(prev => ({ ...prev, manualGenre: manualGenre.trim() }));
      setIsEditingGenre(false);
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 2000);
    } catch (error) {
      console.error('Failed to save genre:', error);
      alert('Failed to save genre');
    } finally {
      setSavingGenre(false);
    }
  };

  const displayGenre = (currentSong as any).manualGenre || currentSong.analysis?.genre;

  const genreOptions = [
    'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Dance', 'House', 'Techno', 'Dubstep',
    'Drum & Bass', 'Trance', 'Ambient', 'Jazz', 'Classical', 'Country', 'Blues',
    'R&B', 'Soul', 'Funk', 'Reggae', 'Metal', 'Punk', 'Indie', 'Alternative'
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasFullAnalysis = currentSong.analysis?.bpm && currentSong.analysis?.key;
  const analysisProgress = currentSong.status === 'processing' ? 50 : 0;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="relative max-w-4xl w-full my-8">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-600/20 rounded-2xl blur-2xl"></div>

        <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 opacity-10 blur-sm"></div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 border border-gray-600 hover:border-cyan-500 transition-all duration-200 group"
          >
            <X size={18} className="text-gray-400 group-hover:text-cyan-400 transition-colors" />
          </button>

          <div className="relative p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start space-x-4">
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-cyan-600/30 via-blue-600/30 to-purple-600/30 flex items-center justify-center border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
                  <Music size={48} className="text-cyan-400" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 opacity-20 animate-pulse"></div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-white mb-2 truncate bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {currentSong.originalName}
                </h2>
                <div className="flex items-center space-x-3 mb-4 flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    currentSong.status === 'ready'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : currentSong.status === 'processing'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  }`}>
                    {currentSong.status === 'ready' ? 'Ready' : currentSong.status === 'processing' ? 'Processing' : 'Uploaded'}
                  </span>
                  {hasFullAnalysis && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center space-x-1">
                      <CheckCircle size={12} />
                      <span>Analyzed</span>
                    </span>
                  )}
                  {displayGenre && !isEditingGenre && (
                    <div className="flex items-center space-x-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        (currentSong as any).manualGenre
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {displayGenre}
                        {(currentSong as any).manualGenre && ' ✓'}
                      </span>
                      <button
                        onClick={() => {
                          setIsEditingGenre(true);
                          setManualGenre(displayGenre);
                        }}
                        className="p-1 rounded-full hover:bg-gray-700 transition-colors"
                        title="Edit genre"
                      >
                        <Edit3 size={12} className="text-gray-400 hover:text-cyan-400" />
                      </button>
                    </div>
                  )}
                  {isEditingGenre && (
                    <div className="flex items-center space-x-1">
                      <select
                        value={manualGenre}
                        onChange={(e) => setManualGenre(e.target.value)}
                        className="px-2 py-1 text-xs bg-gray-800 border border-cyan-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="">Select genre...</option>
                        {genreOptions.map(genre => (
                          <option key={genre} value={genre}>{genre}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleSaveGenre}
                        disabled={savingGenre || !manualGenre.trim()}
                        className="p-1 rounded-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 transition-colors"
                        title="Save genre"
                      >
                        {savingGenre ? (
                          <Loader size={12} className="text-white animate-spin" />
                        ) : (
                          <Save size={12} className="text-white" />
                        )}
                      </button>
                      <button
                        onClick={() => setIsEditingGenre(false)}
                        className="p-1 rounded-full hover:bg-gray-700 transition-colors"
                        title="Cancel"
                      >
                        <X size={12} className="text-gray-400 hover:text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 rounded-lg p-3 border border-cyan-500/20 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <TrendingUp size={16} className="text-cyan-400" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">BPM</p>
                </div>
                <p className="text-xl font-bold text-white">
                  {currentSong.analysis?.bpm ? Math.round(currentSong.analysis.bpm) : '—'}
                </p>
                {currentSong.analysis?.beatConfidence !== undefined && (
                  <p className="text-xs text-cyan-400 mt-1">
                    {Math.round(currentSong.analysis.beatConfidence * 100)}% confidence
                  </p>
                )}
              </div>

              <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg p-3 border border-blue-500/20 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Key size={16} className="text-blue-400" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Key</p>
                </div>
                <p className="text-xl font-bold text-white">
                  {currentSong.analysis?.key || '—'}
                </p>
                {currentSong.analysis?.keyConfidence !== undefined && (
                  <p className="text-xs text-blue-400 mt-1">
                    {Math.round(currentSong.analysis.keyConfidence * 100)}% confidence
                  </p>
                )}
              </div>

              <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-3 border border-purple-500/20 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Clock size={16} className="text-purple-400" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Duration</p>
                </div>
                <p className="text-xl font-bold text-white">
                  {formatDuration(currentSong.analysis?.duration || 0)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-pink-900/30 to-pink-800/20 rounded-lg p-3 border border-pink-500/20 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Zap size={16} className="text-pink-400" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Energy</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-red-500"
                      style={{ width: `${(currentSong.analysis?.energy || 0) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-pink-400">
                    {Math.round((currentSong.analysis?.energy || 0) * 100)}%
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-3 border border-green-500/20 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Activity size={16} className="text-green-400" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Danceability</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                      style={{ width: `${(currentSong.analysis?.danceability || 0) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-green-400">
                    {Math.round((currentSong.analysis?.danceability || 0) * 100)}%
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-lg p-3 border border-orange-500/20 backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <FileAudio size={16} className="text-orange-400" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Format</p>
                </div>
                <p className="text-xl font-bold text-white">
                  {currentSong.mimeType?.split('/')[1]?.toUpperCase() || 'AUDIO'}
                </p>
                <p className="text-xs text-orange-400 mt-1">
                  {formatFileSize(currentSong.size)}
                </p>
              </div>
            </div>

            {currentSong.analysis?.moodTags && currentSong.analysis.moodTags.length > 0 && (
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center space-x-2">
                  <Sparkles size={16} className="text-purple-400" />
                  <span>Mood & Vibe</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentSong.analysis.moodTags.map((mood, index) => (
                    <span key={index} className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {mood}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {currentSong.analysis?.hasVocals !== undefined && (
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center space-x-2">
                  <Mic size={16} className="text-cyan-400" />
                  <span>Audio Characteristics</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Vocals</span>
                    <span className={`text-sm font-semibold ${currentSong.analysis.hasVocals ? 'text-green-400' : 'text-gray-500'}`}>
                      {currentSong.analysis.hasVocals ? 'Yes' : 'No'}
                      {currentSong.analysis.vocalPercentage !== undefined && ` (${Math.round(currentSong.analysis.vocalPercentage)}%)`}
                    </span>
                  </div>
                  {currentSong.analysis.brightness !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Brightness</span>
                      <span className="text-sm font-semibold text-yellow-400">
                        {Math.round(currentSong.analysis.brightness * 100)}%
                      </span>
                    </div>
                  )}
                  {currentSong.analysis.warmth !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Warmth</span>
                      <span className="text-sm font-semibold text-orange-400">
                        {Math.round(currentSong.analysis.warmth * 100)}%
                      </span>
                    </div>
                  )}
                  {currentSong.analysis.loudness !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Loudness</span>
                      <span className="text-sm font-semibold text-red-400">
                        {Math.round(currentSong.analysis.loudness)} dB
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <button
                onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
                className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-gray-800/50 to-gray-700/50 hover:from-gray-800/70 hover:to-gray-700/70 rounded-lg border border-gray-600 transition-all duration-200"
              >
                <span className="text-sm font-semibold text-gray-300 flex items-center space-x-2">
                  <BarChart3 size={16} />
                  <span>Advanced Metrics</span>
                </span>
                {showAdvancedMetrics ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {showAdvancedMetrics && (
                <div className="mt-3 bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-lg p-4 border border-gray-700 space-y-2">
                  {currentSong.analysis?.valence !== undefined && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                      <span className="text-sm text-gray-400">Valence (Mood)</span>
                      <span className="text-sm font-semibold text-purple-400">
                        {Math.round(currentSong.analysis.valence * 100)}%
                      </span>
                    </div>
                  )}
                  {currentSong.analysis?.dynamicRangeDb !== undefined && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                      <span className="text-sm text-gray-400">Dynamic Range</span>
                      <span className="text-sm font-semibold text-cyan-400">
                        {currentSong.analysis.dynamicRangeDb.toFixed(1)} dB
                      </span>
                    </div>
                  )}
                  {currentSong.analysis?.harmonicComplexity !== undefined && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                      <span className="text-sm text-gray-400">Harmonic Complexity</span>
                      <span className="text-sm font-semibold text-blue-400">
                        {Math.round(currentSong.analysis.harmonicComplexity * 100)}%
                      </span>
                    </div>
                  )}
                  {currentSong.analysis?.rhythmicComplexity !== undefined && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                      <span className="text-sm text-gray-400">Rhythmic Complexity</span>
                      <span className="text-sm font-semibold text-green-400">
                        {Math.round(currentSong.analysis.rhythmicComplexity * 100)}%
                      </span>
                    </div>
                  )}
                  {currentSong.analysis?.tempoStability !== undefined && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-400">Tempo Stability</span>
                      <span className="text-sm font-semibold text-yellow-400">
                        {Math.round(currentSong.analysis.tempoStability * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!hasFullAnalysis && currentSong.status !== 'processing' && (
              <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg p-4 border border-yellow-500/30 animate-pulse">
                <div className="flex items-start space-x-3">
                  <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-yellow-300 mb-1">Analysis Not Complete</h4>
                    <p className="text-xs text-yellow-200/80">
                      Run a comprehensive analysis to unlock BPM, key detection, genre classification, mood analysis, and more.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {showSuccessAnimation && (
              <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-lg p-4 border border-green-500/30 animate-fadeIn">
                <div className="flex items-center space-x-3">
                  <CheckCircle size={20} className="text-green-400" />
                  <span className="text-sm font-semibold text-green-300">Success!</span>
                </div>
              </div>
            )}

            {currentSong.status === 'processing' && (
              <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-lg p-4 border border-blue-500/30">
                <div className="flex items-center space-x-3 mb-3">
                  <Loader size={20} className="text-blue-400 animate-spin" />
                  <span className="text-sm font-semibold text-blue-300">Analyzing Audio...</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                onClick={handlePlayPause}
                className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center space-x-2"
              >
                {isPlaying ? (
                  <>
                    <Pause size={20} />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    <span>Play</span>
                  </>
                )}
              </button>

              {currentSong.status !== 'processing' && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="flex-1 group relative px-4 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-500 hover:via-pink-500 hover:to-red-500 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-bold transition-all duration-300 shadow-2xl shadow-purple-500/40 hover:shadow-purple-400/60 hover:scale-[1.02] overflow-hidden disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <div className="relative flex items-center justify-center space-x-2">
                    {analyzing ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : hasFullAnalysis ? (
                      <>
                        <RefreshCw size={20} />
                        <span>Re-Analyze</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        <span>Analyze Song</span>
                      </>
                    )}
                  </div>
                </button>
              )}

              <button
                onClick={() => onCreateTransition(currentSong)}
                className="flex-1 group relative px-4 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all duration-300 shadow-2xl shadow-cyan-500/40 hover:shadow-cyan-400/60 hover:scale-[1.02] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <div className="relative flex items-center justify-center space-x-2">
                  <Zap size={20} />
                  <span>Create Mash Up</span>
                </div>
              </button>
            </div>

            <p className="text-center text-xs text-gray-500">
              {hasFullAnalysis
                ? 'Click Re-Analyze to update the analysis with the latest algorithms'
                : 'Analyze this track to unlock advanced AI-powered features'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongDetailModal;
