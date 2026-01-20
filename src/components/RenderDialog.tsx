import React, { useState, useEffect } from 'react';
import { X, Download, Settings, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { databaseService, RenderJobData } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';

interface RenderDialogProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

const RenderDialog: React.FC<RenderDialogProps> = ({ projectId, projectName, onClose }) => {
  const { user } = useAuth();
  const [format, setFormat] = useState<'mp3' | 'wav' | 'flac'>('mp3');
  const [quality, setQuality] = useState<'draft' | 'standard' | 'high' | 'lossless'>('standard');
  const [isRendering, setIsRendering] = useState(false);
  const [currentJob, setCurrentJob] = useState<RenderJobData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to job updates
  useEffect(() => {
    if (!currentJob) return;

    const subscription = databaseService.subscribeToRenderJob(
      currentJob.id,
      (updatedJob) => {
        setCurrentJob(updatedJob);
        
        if (updatedJob.status === 'completed') {
          setIsRendering(false);
          
          // Track successful completion
          if (user) {
            const renderDuration = updatedJob.completedAt && updatedJob.startedAt 
              ? new Date(updatedJob.completedAt).getTime() - new Date(updatedJob.startedAt).getTime()
              : 0;
            
            trackExportCompleted(user.id, updatedJob.format, updatedJob.quality, renderDuration / 1000);
            activityLogger.logRender('completed', updatedJob.id, user.id, {
              projectName,
              format: updatedJob.format,
              quality: updatedJob.quality,
              renderDuration: renderDuration / 1000,
              outputUrl: updatedJob.outputUrl,
              losslessUrl: updatedJob.losslessUrl
            });
          }
        } else if (updatedJob.status === 'failed') {
          setIsRendering(false);
          setError(updatedJob.errorMessage || 'Render failed');
          
          // Track failed render
          if (user) {
            analyticsService.trackError(
              new Error(updatedJob.errorMessage || 'Render failed'),
              'render_job',
              {
                jobId: updatedJob.id,
                format: updatedJob.format,
                quality: updatedJob.quality
              },
              user.id
            );
            
            activityLogger.logRender('failed', updatedJob.id, user.id, {
              projectName,
              errorMessage: updatedJob.errorMessage,
              format: updatedJob.format,
              quality: updatedJob.quality
            });
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [currentJob?.id]);

  const formatOptions = [
    { value: 'mp3', label: 'MP3', description: 'Compressed, widely compatible' },
    { value: 'wav', label: 'WAV', description: 'Uncompressed, high quality' },
    { value: 'flac', label: 'FLAC', description: 'Lossless compression' }
  ];

  const qualityOptions = [
    { value: 'draft', label: 'Draft', description: '128 kbps, fast render' },
    { value: 'standard', label: 'Standard', description: '320 kbps, good quality' },
    { value: 'high', label: 'High', description: '24-bit, professional quality' },
    { value: 'lossless', label: 'Lossless', description: '24-bit WAV, maximum quality' }
  ];

  const getEstimatedTime = () => {
    const baseTime = 30; // seconds
    const qualityMultiplier = {
      draft: 0.5,
      standard: 1,
      high: 2,
      lossless: 3
    };
    
    return Math.round(baseTime * qualityMultiplier[quality]);
  };

  const getFileSize = () => {
    const baseSizeMB = 50; // MB for 3-minute track
    const formatMultiplier = {
      mp3: quality === 'draft' ? 0.1 : 0.3,
      wav: 1,
      flac: 0.6
    };
    
    return Math.round(baseSizeMB * formatMultiplier[format]);
  };

  const handleStartRender = async () => {
    if (!user) return;
    
    try {
      setIsRendering(true);
      setError(null);
      
      // Create render job
      const job = await databaseService.createRenderJob(
        user.id,
        projectId,
        format,
        quality
      );
      
      setCurrentJob(job);
      
      // Start processing
      await databaseService.startRenderJob(job.id, user.id);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start render');
      setIsRendering(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    // Track download analytics
    if (user && currentJob) {
      analyticsService.trackFeature('export', 'downloaded', {
        filename,
        format: currentJob.format,
        quality: currentJob.quality,
        jobId: currentJob.id
      }, user.id);
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = () => {
    if (!currentJob) return null;
    
    switch (currentJob.status) {
      case 'queued':
        return <Clock size={20} className="text-yellow-500" />;
      case 'processing':
        return <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'failed':
        return <AlertCircle size={20} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    if (!currentJob) return '';
    
    switch (currentJob.status) {
      case 'queued':
        return 'Queued for processing...';
      case 'processing':
        return `Processing... ${currentJob.progress}%`;
      case 'completed':
        return 'Render completed successfully!';
      case 'failed':
        return `Render failed: ${currentJob.errorMessage}`;
      default:
        return '';
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="glass-surface rounded-2xl max-w-2xl w-full p-8 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Export Project</h2>
              <p className="text-gray-400">{projectName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>

          {!isRendering && !currentJob ? (
            /* Render Configuration */
            <div className="space-y-6">
              {/* Format Selection */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Output Format</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {formatOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFormat(option.value as any)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        format === option.value
                          ? 'border-purple-500 bg-purple-900/30'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium text-white">{option.label}</div>
                      <div className="text-sm text-gray-400 mt-1">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Selection */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Quality</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {qualityOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setQuality(option.value as any)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        quality === option.value
                          ? 'border-purple-500 bg-purple-900/30'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium text-white">{option.label}</div>
                      <div className="text-sm text-gray-400 mt-1">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Render Info */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Estimated time:</span>
                    <span className="text-white ml-2">{getEstimatedTime()}s</span>
                  </div>
                  <div>
                    <span className="text-gray-400">File size:</span>
                    <span className="text-white ml-2">~{getFileSize()}MB</span>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-center space-x-2 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                  <AlertCircle size={20} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartRender}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Zap size={20} />
                  <span>Start Render</span>
                </button>
              </div>
            </div>
          ) : (
            /* Render Progress */
            <div className="space-y-6">
              {/* Status */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  {getStatusIcon()}
                  <span className="text-lg font-medium text-white">{getStatusText()}</span>
                </div>
                
                {currentJob && currentJob.status === 'processing' && (
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${currentJob.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Processing Logs */}
              {currentJob && currentJob.processingLogs.length > 0 && (
                <div className="bg-gray-900/50 rounded-lg p-4 max-h-32 overflow-y-auto">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Processing Log</h4>
                  <div className="space-y-1">
                    {currentJob.processingLogs.slice(-5).map((log, index) => (
                      <div key={index} className="text-xs text-gray-400">
                        <span className="text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="ml-2">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Links */}
              {currentJob && currentJob.status === 'completed' && (
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-white">Download Files</h4>
                  
                  {currentJob.outputUrl && (
                    <button
                      onClick={() => handleDownload(
                        currentJob.outputUrl!, 
                        `${projectName}.${currentJob.format}`
                      )}
                      className="w-full p-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Download size={20} />
                      <span>Download {currentJob.format.toUpperCase()} ({currentJob.quality})</span>
                    </button>
                  )}
                  
                  {currentJob.losslessUrl && (
                    <button
                      onClick={() => handleDownload(
                        currentJob.losslessUrl!, 
                        `${projectName}-lossless.wav`
                      )}
                      className="w-full p-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Download size={20} />
                      <span>Download Lossless WAV</span>
                    </button>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-center">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
                >
                  {currentJob?.status === 'completed' ? 'Close' : 'Close'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RenderDialog;