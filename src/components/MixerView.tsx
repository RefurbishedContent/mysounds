import React, { useState, useEffect } from 'react';
import { Sliders, Volume2, VolumeX, RotateCcw, Equal as Equalizer, Headphones, Settings, Play, Upload, Music, Zap, Disc3, Plus, Clock, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { mixerService, MixSession } from '../lib/mixerService';

interface MixerViewProps {
  onCreateNew?: () => void;
  onOpenSession?: (sessionId: string) => void;
}

const MixerView: React.FC<MixerViewProps> = ({ onCreateNew, onOpenSession }) => {
  const { user } = useAuth();
  const [mixSessions, setMixSessions] = useState<MixSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMixSessions = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const sessions = await mixerService.listUserMixes(user.id);
        setMixSessions(sessions);
      } catch (error) {
        console.error('Failed to load mix sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMixSessions();
  }, [user]);

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this mix session?')) {
      return;
    }

    try {
      await mixerService.deleteMixSession(sessionId);
      setMixSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete mix session:', error);
      alert('Failed to delete mix session. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading mixer sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6 bg-gray-900">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">DJ Mixer</h1>
          <p className="text-sm text-gray-400">Create seamless mix playlists from your mash ups</p>
        </div>

        <button
          onClick={onCreateNew}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50"
        >
          <Plus size={20} />
          <span>New Mix</span>
        </button>
      </div>

      {mixSessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
              <Sliders size={32} className="text-cyan-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">No Mix Sessions Yet</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Create your first DJ mix by combining your mash ups into a seamless playlist.
                Control crossfades, volumes, and create professional continuous mixes.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={onCreateNew}
                className="w-full px-4 py-2.5 text-sm bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105"
              >
                <Disc3 size={16} />
                <span>Create New Mix</span>
              </button>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-sm text-white font-medium mb-3">Mixer Features</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="space-y-1.5">
                  <Volume2 size={20} className="text-gray-500 mx-auto" />
                  <h4 className="text-white font-medium text-xs">Auto Crossfade</h4>
                  <p className="text-gray-500 text-xs">Smooth transitions between mash ups</p>
                </div>
                <div className="space-y-1.5">
                  <Equalizer size={20} className="text-gray-500 mx-auto" />
                  <h4 className="text-white font-medium text-xs">Beat Matching</h4>
                  <p className="text-gray-500 text-xs">Intelligent BPM synchronization</p>
                </div>
                <div className="space-y-1.5">
                  <Headphones size={20} className="text-gray-500 mx-auto" />
                  <h4 className="text-white font-medium text-xs">Preview Queue</h4>
                  <p className="text-gray-500 text-xs">Listen before finalizing</p>
                </div>
                <div className="space-y-1.5">
                  <Zap size={20} className="text-gray-500 mx-auto" />
                  <h4 className="text-white font-medium text-xs">Export Mix</h4>
                  <p className="text-gray-500 text-xs">Render seamless mashup</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mixSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onOpenSession?.(session.id)}
                className="group relative bg-gray-800 border-2 border-gray-700 rounded-xl p-6 text-left transition-all duration-200 hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sliders size={24} className="text-white" />
                  </div>
                  <div className="flex items-center space-x-1">
                    {session.status === 'completed' && session.renderedUrl && (
                      <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                        Rendered
                      </div>
                    )}
                    {session.status === 'rendering' && (
                      <div className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                        Rendering
                      </div>
                    )}
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 line-clamp-1" title={session.name}>
                  {session.name}
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Mash Ups:</span>
                    <span className="text-white font-medium">{session.totalBlendsCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white font-medium">
                      {Math.floor(session.totalDuration / 60)}:{String(session.totalDuration % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Crossfade:</span>
                    <span className="text-white font-medium">{session.autoCrossfadeDuration}s</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock size={12} />
                    <span>{formatDate(session.updatedAt)}</span>
                  </div>
                  <span className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MixerView;