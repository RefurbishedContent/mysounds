import React, { useState, useEffect } from 'react';
import { Music, X, Play, Pause, Zap, Clock, FileAudio, TrendingUp } from 'lucide-react';
import { UploadResult } from '../lib/storage';
import { audioPlayer } from '../lib/audioPlayer';

interface SongDetailModalProps {
  song: UploadResult;
  onClose: () => void;
  onCreateTransition: (song: UploadResult) => void;
}

const SongDetailModal: React.FC<SongDetailModalProps> = ({ song, onClose, onCreateTransition }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const checkPlayingState = () => {
      setIsPlaying(audioPlayer.isPlaying() && audioPlayer.getCurrentUrl() === song.url);
    };

    const interval = setInterval(checkPlayingState, 100);
    return () => {
      clearInterval(interval);
    };
  }, [song.url]);

  useEffect(() => {
    return () => {
      audioPlayer.stop();
    };
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioPlayer.pause();
      setIsPlaying(false);
    } else {
      audioPlayer.play(song.url);
      setIsPlaying(true);
    }
  };
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

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative max-w-lg w-full">
        {/* Futuristic background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-600/20 rounded-2xl blur-2xl"></div>

        {/* Main modal container */}
        <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden">
          {/* Animated border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 opacity-20 blur-sm"></div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 border border-gray-600 hover:border-cyan-500 transition-all duration-200 group"
          >
            <X size={18} className="text-gray-400 group-hover:text-cyan-400 transition-colors" />
          </button>

          {/* Content */}
          <div className="relative p-6 space-y-4">
            {/* Album art / Visual */}
            <div className="flex items-start space-x-4">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-cyan-600/30 via-blue-600/30 to-purple-600/30 flex items-center justify-center border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
                  <Music size={40} className="text-cyan-400" />
                </div>
                {/* Pulsing effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 opacity-20 animate-pulse"></div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white mb-2 truncate bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {song.originalName}
                </h2>
                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    song.status === 'ready'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : song.status === 'processing'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  }`}>
                    {song.status === 'ready' ? 'Ready' : song.status === 'processing' ? 'Processing' : 'Uploaded'}
                  </span>
                </div>
              </div>
            </div>

            {/* Technical specs grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-lg p-3 border border-cyan-500/20 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <TrendingUp size={16} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">BPM</p>
                    <p className="text-base font-bold text-white">
                      {song.analysis?.bpm ? Math.round(song.analysis.bpm) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-lg p-3 border border-blue-500/20 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Clock size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Duration</p>
                    <p className="text-base font-bold text-white">
                      {formatDuration(song.analysis?.duration || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-lg p-3 border border-purple-500/20 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <FileAudio size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Format</p>
                    <p className="text-base font-bold text-white">
                      {song.mimeType?.split('/')[1]?.toUpperCase() || 'AUDIO'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-lg p-3 border border-cyan-500/20 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <FileAudio size={16} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Size</p>
                    <p className="text-base font-bold text-white">
                      {formatFileSize(song.size)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key and Energy if available */}
            {(song.analysis?.key || song.analysis?.energy !== undefined) && (
              <div className="flex space-x-3">
                {song.analysis?.key && (
                  <div className="flex-1 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg p-2.5 border border-cyan-500/20">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Musical Key</p>
                    <p className="text-lg font-bold text-cyan-400">{song.analysis.key}</p>
                  </div>
                )}
                {song.analysis?.energy !== undefined && (
                  <div className="flex-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-2.5 border border-purple-500/20">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Energy</p>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{ width: `${(song.analysis.energy || 0) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-purple-400">
                        {Math.round((song.analysis.energy || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
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
              <button
                onClick={() => onCreateTransition(song)}
                className="flex-1 group relative px-4 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all duration-300 shadow-2xl shadow-cyan-500/40 hover:shadow-cyan-400/60 hover:scale-[1.02] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <div className="relative flex items-center justify-center space-x-2">
                  <Zap size={20} className="animate-pulse" />
                  <span>Create Transition</span>
                </div>
              </button>
            </div>

            <p className="text-center text-xs text-gray-500">
              Use this track to create a seamless AI-powered transition
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongDetailModal;
