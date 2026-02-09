import React, { useState, useEffect } from 'react';
import { X, Loader, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mixerService, MixSession } from '../../lib/mixerService';
import { MixerTheme, parseThemeFromMetadata, getDefaultTheme } from '../../lib/themeUtils';

interface PreviousMixerThemeModalProps {
  onClose: () => void;
  onSelectTheme: (theme: MixerTheme) => void;
}

const PreviousMixerThemeModal: React.FC<PreviousMixerThemeModalProps> = ({ onClose, onSelectTheme }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<MixSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const userSessions = await mixerService.listUserMixes(user.id);
        const sessionsWithThemes = userSessions.filter(
          session => session.metadata?.theme
        );
        setSessions(sessionsWithThemes);
      } catch (error) {
        console.error('Failed to load mixer sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [user]);

  const handleSelectSession = (session: MixSession) => {
    const theme = parseThemeFromMetadata(session.metadata);
    if (theme) {
      setSelectedSessionId(session.id);
      onSelectTheme(theme);
      setTimeout(() => onClose(), 300);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Copy Theme from Previous Project</h2>
            <p className="text-sm text-gray-400 mt-1">Select a mixer project to copy its color theme</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={32} className="text-cyan-400 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-gray-500"
                >
                  <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Previous Projects Found</h3>
              <p className="text-sm text-gray-400">
                You don't have any mixer projects with saved themes yet.<br />
                Create your first project to build a theme library!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const theme = parseThemeFromMetadata(session.metadata) || getDefaultTheme();
                const isSelected = selectedSessionId === session.id;

                return (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session)}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-cyan-500 bg-gray-700'
                        : 'border-gray-600 bg-gray-750 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white mb-1 truncate">{session.name}</h4>
                        <p className="text-xs text-gray-400 mb-3">
                          Created {formatDate(session.createdAt)} • {session.totalBlendsCount} mash ups
                        </p>
                        <div className="flex space-x-2">
                          <div
                            className="flex-1 h-10 rounded-lg border border-gray-600"
                            style={{
                              background: `linear-gradient(to right, ${theme.deckAColors.from}, ${theme.deckAColors.to})`
                            }}
                          />
                          <div
                            className="flex-1 h-10 rounded-lg border border-gray-600"
                            style={{
                              background: `linear-gradient(to right, ${theme.deckBColors.from}, ${theme.deckBColors.to})`
                            }}
                          />
                        </div>
                        {theme.presetName && (
                          <p className="text-xs text-cyan-400 mt-2 capitalize">
                            {theme.presetName.replace('-', ' ')} theme
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="ml-4 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Check size={16} className="text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviousMixerThemeModal;
