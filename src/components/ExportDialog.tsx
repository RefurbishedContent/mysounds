import { useState } from 'react';
import { Download, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { inAppRenderer, RenderOptions, RenderProgress } from '../lib/audio/InAppRenderer';
import { jobQueue } from '../lib/jobQueue';
import { security } from '../lib/security';
import * as Tone from 'tone';

interface ExportDialogProps {
  projectId: string;
  projectName: string;
  duration: number;
  players: Tone.Player[];
  onClose: () => void;
}

export function ExportDialog({
  projectId,
  projectName,
  duration,
  players,
  onClose
}: ExportDialogProps) {
  const [exportType, setExportType] = useState<'local' | 'server'>('local');
  const [format, setFormat] = useState<'wav' | 'mp3'>('wav');
  const [quality, setQuality] = useState<'draft' | 'standard' | 'high' | 'lossless'>('standard');
  const [sampleRate, setSampleRate] = useState(44100);
  const [bitDepth, setBitDepth] = useState<16 | 24>(16);
  const [normalize, setNormalize] = useState(true);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const qualityPresets = {
    draft: { sampleRate: 44100, bitDepth: 16 as 16 | 24, label: 'Draft (44.1kHz, 16-bit)' },
    standard: { sampleRate: 44100, bitDepth: 16 as 16 | 24, label: 'Standard (44.1kHz, 16-bit)' },
    high: { sampleRate: 48000, bitDepth: 24 as 16 | 24, label: 'High (48kHz, 24-bit)' },
    lossless: { sampleRate: 48000, bitDepth: 24 as 16 | 24, label: 'Lossless (48kHz, 24-bit)' }
  };

  const estimateFileSize = (): string => {
    const preset = qualityPresets[quality];
    const bytesPerSecond = preset.sampleRate * (preset.bitDepth / 8) * 2;
    const bytes = bytesPerSecond * duration;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const estimateRenderTime = (): string => {
    const timeMultiplier = exportType === 'local' ? 1.2 : 0.3;
    const seconds = Math.ceil(duration * timeMultiplier);
    return `${seconds}s`;
  };

  const handleLocalExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const options: RenderOptions = {
        format,
        quality,
        sampleRate,
        bitDepth,
        normalize,
        fadeIn,
        fadeOut
      };

      const blob = await inAppRenderer.renderMix(
        players,
        duration,
        options,
        (progress) => setProgress(progress)
      );

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setExportComplete(true);

      const filename = `${projectName}-${Date.now()}.${format}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleServerExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const userId = 'current-user-id';

      const limitCheck = await security.checkRenderLimit(userId);
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.reason);
      }

      const jobId = await jobQueue.createJob(projectId, userId, format, quality);

      const unsubscribe = jobQueue.subscribeToJob(jobId, (job) => {
        setProgress({
          stage: job.status === 'completed' ? 'complete' : 'processing',
          progress: job.progress,
          message: job.status
        });

        if (job.status === 'completed') {
          setExportComplete(true);
          setIsExporting(false);
          unsubscribe();
        } else if (job.status === 'failed') {
          setExportError(job.errorMessage || 'Export failed');
          setIsExporting(false);
          unsubscribe();
        }
      });

      await jobQueue.startJob(jobId);
    } catch (error) {
      console.error('Server export error:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    if (exportType === 'local') {
      handleLocalExport();
    } else {
      handleServerExport();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Export Audio</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!isExporting && !exportComplete && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Export Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setExportType('local')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      exportType === 'local'
                        ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium">In-App Export</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Fast, render in browser
                    </div>
                  </button>

                  <button
                    onClick={() => setExportType('server')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      exportType === 'server'
                        ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium">Server Export</div>
                    <div className="text-xs text-gray-400 mt-1">
                      High quality, uses credits
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Quality</label>
                <select
                  value={quality}
                  onChange={(e) => {
                    const newQuality = e.target.value as typeof quality;
                    setQuality(newQuality);
                    const preset = qualityPresets[newQuality];
                    setSampleRate(preset.sampleRate);
                    setBitDepth(preset.bitDepth);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(qualityPresets).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormat('wav')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      format === 'wav'
                        ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    WAV (Uncompressed)
                  </button>

                  <button
                    onClick={() => setFormat('mp3')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      format === 'mp3'
                        ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    MP3 (Compressed)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Fade In (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={fadeIn}
                    onChange={(e) => setFadeIn(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Fade Out (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={fadeOut}
                    onChange={(e) => setFadeOut(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalize}
                    onChange={(e) => setNormalize(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">Normalize audio to -0.5dB</span>
                </label>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Estimated file size:</span>
                  <span className="font-medium">{estimateFileSize()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Estimated render time:</span>
                  <span className="font-medium">{estimateRenderTime()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Duration:</span>
                  <span className="font-medium">{Math.round(duration)}s</span>
                </div>
              </div>
            </>
          )}

          {isExporting && progress && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader className="w-6 h-6 animate-spin text-blue-500" />
                <div>
                  <div className="font-medium">{progress.message}</div>
                  <div className="text-sm text-gray-400">{progress.stage}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(progress.progress)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
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
                <div className="text-lg font-semibold">Export Complete!</div>
                <div className="text-sm text-gray-400 mt-1">
                  Your audio has been exported successfully
                </div>
              </div>

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={`${projectName}.${format}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Again</span>
                </a>
              )}
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
            className="px-4 py-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {exportComplete ? 'Close' : 'Cancel'}
          </button>

          {!isExporting && !exportComplete && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
