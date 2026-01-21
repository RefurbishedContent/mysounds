import React, { useState, useEffect } from 'react';
import { X, Download, CheckCircle, AlertCircle, Loader, Music, Sparkles, ArrowRight, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { blendExportService, ExportProgress } from '../lib/blendExportService';
import { UploadResult } from '../lib/storage';
import { TransitionData } from '../lib/transitionsService';

interface BlendExportDialogProps {
  transition: TransitionData;
  songA: UploadResult;
  songB: UploadResult;
  onClose: () => void;
  onExportComplete?: () => void;
}

export const BlendExportDialog: React.FC<BlendExportDialogProps> = ({
  transition,
  songA,
  songB,
  onClose,
  onExportComplete
}) => {
  const { user } = useAuth();
  const [format, setFormat] = useState<'wav' | 'mp3' | 'flac'>('wav');
  const [quality, setQuality] = useState<'draft' | 'standard' | 'high' | 'lossless'>('standard');
  const [normalize, setNormalize] = useState(true);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  const songADuration = songA.analysis?.duration || 0;
  const songBDuration = songB.analysis?.duration || 0;
  const songAMarker = transition.songAMarkerPoint || 0;
  const songBMarker = transition.songBMarkerPoint || 0;
  const transitionDuration = transition.transitionDuration || 12;

  const songAContribution = songAMarker;
  const songBContribution = songBDuration - songBMarker;
  const totalDuration = songAContribution + transitionDuration + songBContribution;

  const qualityPresets = {
    draft: { sampleRate: 44100, bitDepth: 16 as 16 | 24, label: 'Draft (44.1kHz, 16-bit)' },
    standard: { sampleRate: 44100, bitDepth: 16 as 16 | 24, label: 'Standard (44.1kHz, 16-bit)' },
    high: { sampleRate: 48000, bitDepth: 24 as 16 | 24, label: 'High (48kHz, 24-bit)' },
    lossless: { sampleRate: 48000, bitDepth: 24 as 16 | 24, label: 'Lossless (48kHz, 24-bit)' }
  };

  const estimateFileSize = (): string => {
    const preset = qualityPresets[quality];
    const bytesPerSecond = preset.sampleRate * (preset.bitDepth / 8) * 2;
    const bytes = bytesPerSecond * totalDuration;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = async () => {
    if (!user) return;

    setIsExporting(true);
    setExportError(null);

    try {
      const preset = qualityPresets[quality];

      await blendExportService.createBlend(
        user.id,
        {
          transitionId: transition.id,
          name: `${songA.originalName} → ${songB.originalName}`,
          format,
          quality,
          sampleRate: preset.sampleRate,
          bitDepth: preset.bitDepth,
          normalize,
          fadeIn,
          fadeOut
        },
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      setExportComplete(true);
      onExportComplete?.();
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Export Full Song Blend</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!isExporting && !exportComplete && (
            <>
              <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-cyan-300 font-semibold mb-2">About Your Export</h3>
                    <p className="text-cyan-100/80 text-sm mb-3">
                      While you worked with 12-second clips for precision blending, your export will include the <strong>complete songs</strong> seamlessly joined with your transition.
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-cyan-100/70">
                      <div className="flex items-center space-x-1">
                        <Music className="w-4 h-4" />
                        <span>Full Song A</span>
                      </div>
                      <ArrowRight className="w-4 h-4" />
                      <div className="flex items-center space-x-1">
                        <Sparkles className="w-4 h-4" />
                        <span>Blend Zone</span>
                      </div>
                      <ArrowRight className="w-4 h-4" />
                      <div className="flex items-center space-x-1">
                        <Music className="w-4 h-4" />
                        <span>Full Song B</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Blend Composition</h3>
                <div className="bg-gray-900 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-white">{songA.originalName}</p>
                        <p className="text-xs text-gray-400">From start to marker point</p>
                      </div>
                    </div>
                    <span className="text-blue-400 font-mono text-sm">{formatTime(songAContribution)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-white">Transition Blend</p>
                        <p className="text-xs text-gray-400">AI-enhanced crossfade</p>
                      </div>
                    </div>
                    <span className="text-purple-400 font-mono text-sm">{formatTime(transitionDuration)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-white">{songB.originalName}</p>
                        <p className="text-xs text-gray-400">From marker point to end</p>
                      </div>
                    </div>
                    <span className="text-green-400 font-mono text-sm">{formatTime(songBContribution)}</span>
                  </div>

                  <div className="pt-3 border-t border-gray-700 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Total Duration</span>
                    <span className="text-cyan-400 font-mono text-lg font-bold">{formatTime(totalDuration)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quality</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as typeof quality)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {Object.entries(qualityPresets).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
                <div className="grid grid-cols-3 gap-3">
                  {['wav', 'mp3', 'flac'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt as typeof format)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        format === fmt
                          ? 'border-cyan-500 bg-cyan-500 bg-opacity-10'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <span className="text-sm font-medium text-white uppercase">{fmt}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Fade In (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={fadeIn}
                    onChange={(e) => setFadeIn(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Fade Out (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={fadeOut}
                    onChange={(e) => setFadeOut(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalize}
                    onChange={(e) => setNormalize(e.target.checked)}
                    className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-300">Normalize audio to -0.5dB</span>
                </label>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Estimated file size:</span>
                  <span className="font-medium text-white">{estimateFileSize()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Full duration:</span>
                  <span className="font-medium text-white">{formatTime(totalDuration)}</span>
                </div>
              </div>
            </>
          )}

          {isExporting && progress && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader className="w-6 h-6 animate-spin text-cyan-500" />
                <div>
                  <div className="font-medium text-white">{progress.message}</div>
                  <div className="text-sm text-gray-400">{progress.stage}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Progress</span>
                  <span className="text-white">{Math.round(progress.progress)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {exportComplete && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <div>
                <div className="text-lg font-semibold text-white">Export Started!</div>
                <div className="text-sm text-gray-400 mt-1">
                  Your full song blend is being processed. You can find it in the Blends section of your Library.
                </div>
              </div>
            </div>
          )}

          {exportError && (
            <div className="flex items-start gap-3 p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-red-500">Export Failed</div>
                <div className="text-sm text-gray-300 mt-1">{exportError}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
          >
            {exportComplete ? 'Close' : 'Cancel'}
          </button>

          {!isExporting && !exportComplete && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg transition-colors text-white font-semibold"
            >
              <Download className="w-5 h-5" />
              <span>Export Blend</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlendExportDialog;
