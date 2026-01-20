import { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, Edit3, Target } from 'lucide-react';
import { MultiTrackEngine, CuePoint } from '../lib/audio/MultiTrackEngine';

interface CueSystemProps {
  engine: MultiTrackEngine;
  currentTime: number;
}

const HOT_CUE_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#14b8a6' },
  { name: 'Orange', value: '#f97316' }
];

export function CueSystem({ engine, currentTime }: CueSystemProps) {
  const [cues, setCues] = useState<CuePoint[]>([]);
  const [editingCue, setEditingCue] = useState<CuePoint | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCueLabel, setNewCueLabel] = useState('');
  const [newCueTime, setNewCueTime] = useState(0);

  useEffect(() => {
    const updateCues = () => {
      setCues(engine.getCuePoints());
    };

    updateCues();
    const interval = setInterval(updateCues, 1000);

    return () => clearInterval(interval);
  }, [engine]);

  const addCueAtCurrentTime = useCallback(() => {
    setNewCueTime(currentTime);
    setNewCueLabel(`Cue ${cues.length + 1}`);
    setShowAddDialog(true);
  }, [currentTime, cues.length]);

  const handleAddCue = useCallback(() => {
    if (newCueLabel.trim()) {
      engine.addCuePoint(newCueTime, newCueLabel, 'standard');
      setShowAddDialog(false);
      setNewCueLabel('');
      setCues(engine.getCuePoints());
    }
  }, [engine, newCueTime, newCueLabel]);

  const handleRemoveCue = useCallback((id: string) => {
    engine.removeCuePoint(id);
    setCues(engine.getCuePoints());
  }, [engine]);

  const handleJumpToCue = useCallback((id: string) => {
    engine.jumpToCue(id);
  }, [engine]);

  const addHotCue = useCallback((index: number) => {
    const label = `Hot Cue ${index + 1}`;
    const cue = engine.addCuePoint(currentTime, label, 'hot');
    setCues(engine.getCuePoints());
  }, [engine, currentTime]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (event.key >= '1' && event.key <= '8') {
        const index = parseInt(event.key) - 1;
        const hotCues = cues.filter(c => c.type === 'hot');

        if (event.shiftKey) {
          addHotCue(index);
        } else if (hotCues[index]) {
          handleJumpToCue(hotCues[index].id);
        }

        event.preventDefault();
      }

      if (event.key === 'c') {
        addCueAtCurrentTime();
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cues, addHotCue, handleJumpToCue, addCueAtCurrentTime]);

  const hotCues = cues.filter(c => c.type === 'hot').slice(0, 8);
  const standardCues = cues.filter(c => c.type === 'standard');

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Cue Points</h3>
        <button
          onClick={addCueAtCurrentTime}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
          title="Add cue at current time (C)"
        >
          <Plus className="w-4 h-4" />
          <span>Add Cue</span>
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Hot Cues (1-8)</h4>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, index) => {
              const cue = hotCues[index];
              const color = HOT_CUE_COLORS[index];

              return (
                <div
                  key={index}
                  className={`relative p-3 rounded-lg border-2 transition-all ${
                    cue
                      ? 'border-opacity-50 cursor-pointer hover:border-opacity-100'
                      : 'border-gray-700 border-dashed'
                  }`}
                  style={{
                    borderColor: cue ? color.value : undefined,
                    backgroundColor: cue ? `${color.value}20` : undefined
                  }}
                  onClick={() => cue && handleJumpToCue(cue.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{index + 1}</span>
                    {cue && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCue(cue.id);
                        }}
                        className="opacity-50 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {cue ? (
                    <div>
                      <div className="text-xs font-medium truncate">{cue.label}</div>
                      <div className="text-xs text-gray-400 font-mono">
                        {formatTime(cue.time)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      Shift+{index + 1} to set
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {standardCues.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Standard Cues</h4>
            <div className="space-y-2">
              {standardCues.map((cue) => (
                <div
                  key={cue.id}
                  className="flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors"
                  onClick={() => handleJumpToCue(cue.id)}
                >
                  <div className="flex items-center gap-3">
                    <Target className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-sm font-medium">{cue.label}</div>
                      <div className="text-xs text-gray-400 font-mono">
                        {formatTime(cue.time)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCue(cue);
                      }}
                      className="p-1.5 hover:bg-gray-500 rounded transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCue(cue.id);
                      }}
                      className="p-1.5 hover:bg-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Add Cue Point</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Label</label>
                <input
                  type="text"
                  value={newCueLabel}
                  onChange={(e) => setNewCueLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter cue label"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <input
                  type="number"
                  value={newCueTime}
                  onChange={(e) => setNewCueTime(parseFloat(e.target.value))}
                  step="0.1"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCue}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Add Cue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
        <div className="grid grid-cols-2 gap-2">
          <div>C: Add cue at playhead</div>
          <div>1-8: Jump to hot cue</div>
          <div>Shift+1-8: Set hot cue</div>
          <div>Click cue to jump</div>
        </div>
      </div>
    </div>
  );
}
