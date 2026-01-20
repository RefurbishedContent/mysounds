import React, { useState, useRef, useCallback } from 'react';
import { Upload, Music, X, AlertCircle, CheckCircle, Clock, Zap, Plus } from 'lucide-react';
import { storageService, UploadResult } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import { analyticsService, activityLogger, trackUploadSuccess } from '../lib/analytics';

interface AudioUploaderProps {
  onTracksReady: (trackA: UploadResult, trackB: UploadResult) => void;
}

interface UploadStatus {
  status: 'uploading' | 'processing' | 'ready' | 'error';
  analysis?: any;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({ onTracksReady }) => {
  const { user } = useAuth();
  const [trackA, setTrackA] = useState<UploadResult | null>(null);
  const [trackB, setTrackB] = useState<UploadResult | null>(null);
  const [trackAStatus, setTrackAStatus] = useState<UploadStatus>({ status: 'ready' });
  const [trackBStatus, setTrackBStatus] = useState<UploadStatus>({ status: 'ready' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<{ trackA: boolean; trackB: boolean }>({
    trackA: false,
    trackB: false
  });

  const trackAInputRef = useRef<HTMLInputElement>(null);
  const trackBInputRef = useRef<HTMLInputElement>(null);

  // Supported audio formats
  const SUPPORTED_FORMATS = ['.mp3', '.wav', '.flac', '.m4a', '.aac'];
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  const validateFile = (file: File): string | null => {
    // Check file type
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_FORMATS.includes(extension)) {
      return `Unsupported format. Please use: ${SUPPORTED_FORMATS.join(', ')}`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 100MB.';
    }

    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Subscribe to analysis updates
  const subscribeToAnalysis = useCallback((uploadId: string, track: 'A' | 'B') => {
    const subscription = storageService.subscribeToAnalysisUpdates(
      uploadId,
      (status, analysis) => {
        const updateStatus = { status, analysis };
        if (track === 'A') {
          setTrackAStatus(updateStatus);
        } else {
          setTrackBStatus(updateStatus);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const processFile = async (file: File, track: 'A' | 'B') => {
    if (!user) {
      setError('You must be signed in to upload files');
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(prev => ({ ...prev, [`track${track}`]: true }));

    try {
      const uploadResult = await storageService.uploadAudioFile(
        file,
        user.id,
        (progress) => {
          console.log(`Upload progress: ${progress}%`);
        }
      );

      if (track === 'A') {
        setTrackA(uploadResult);
        setTrackAStatus({ status: 'processing' });
        subscribeToAnalysis(uploadResult.id, 'A');
      } else {
        setTrackB(uploadResult);
        setTrackBStatus({ status: 'processing' });
        subscribeToAnalysis(uploadResult.id, 'B');
      }

      // Check if both tracks are ready
      const otherTrack = track === 'A' ? trackB : trackA;
      if (otherTrack) {
        // Validate track compatibility
        const currentDuration = uploadResult.metadata.duration || 0;
        const otherDuration = otherTrack.metadata.duration || 0;
        
        if (Math.abs(currentDuration - otherDuration) > 300) {
          setError(`Warning: Track duration difference is ${Math.abs(currentDuration - otherDuration)}s. Consider using tracks with similar lengths for better mixing.`);
        }
        
        // Mark upload complete for onboarding
        const uploadCompleteMarker = document.createElement('div');
        uploadCompleteMarker.setAttribute('data-onboarding', 'upload-complete');
        uploadCompleteMarker.style.display = 'none';
        document.body.appendChild(uploadCompleteMarker);
        
        onTracksReady(
          track === 'A' ? uploadResult : otherTrack,
          track === 'B' ? uploadResult : otherTrack
        );
      
        // Track upload success
        trackUploadSuccess(
          user.id, 
          uploadResult.metadata.filename, 
          uploadResult.metadata.duration || 0
        );
        
        // Log upload completion
        await activityLogger.logUpload('completed', uploadResult.id, user.id, {
          filename: uploadResult.metadata.filename,
          size: uploadResult.metadata.size,
          duration: uploadResult.metadata.duration,
          track: track,
          mimeType: uploadResult.metadata.mimeType
        });
      }
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to upload audio file';
      
      // Show more helpful error message for missing bucket
      if (err instanceof Error && err.message.includes('Storage bucket')) {
        errorMessage = `Storage setup required. Please ensure the 'audio-uploads' bucket exists in your Supabase project.`;
      }
      
      setError(errorMessage);
      
      // Track upload failure
      if (user) {
        analyticsService.trackError(
          err instanceof Error ? err : new Error('Upload failed'),
          'file_upload',
          {
            filename: file.name,
            size: file.size,
            track: track
          },
          user.id
        );
      }
    } finally {
      setLoading(prev => ({ ...prev, [`track${track}`]: false }));
    }
  };

  const handleFileInput = (track: 'A' | 'B') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    processFile(files[0], track);
    e.target.value = '';
  };

  const removeTrack = (track: 'A' | 'B') => {
    const currentTrack = track === 'A' ? trackA : trackB;
    
    // Clean up upload if it exists
    if (currentTrack && user) {
      storageService.deleteUpload(currentTrack.id, user.id).catch(console.error);
    }
    
    if (track === 'A') {
      setTrackA(null);
      setTrackAStatus({ status: 'ready' });
    } else {
      setTrackB(null);
      setTrackBStatus({ status: 'ready' });
    }
    setError(null);
  };

  const getTrackUploadState = (track: UploadResult | null, status: UploadStatus, isLoading: boolean) => {
    if (isLoading) {
      return {
        bgColor: 'bg-blue-900/30',
        borderColor: 'border-blue-500',
        icon: <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />,
        title: 'Uploading...',
        subtitle: 'Please wait',
        showRemove: false
      };
    }

    if (track && status.status === 'ready') {
      return {
        bgColor: 'bg-green-900/30',
        borderColor: 'border-green-500',
        icon: <CheckCircle size={24} className="text-green-500" />,
        title: track.metadata.filename,
        subtitle: `${formatFileSize(track.metadata.size)} • ${track.metadata.duration ? formatDuration(track.metadata.duration) : 'Ready'}`,
        showRemove: true
      };
    }

    if (track && status.status === 'processing') {
      return {
        bgColor: 'bg-yellow-900/30',
        borderColor: 'border-yellow-500',
        icon: <Clock size={24} className="text-yellow-500 animate-pulse" />,
        title: track.metadata.filename,
        subtitle: 'Analyzing audio...',
        showRemove: true
      };
    }

    if (track && status.status === 'error') {
      return {
        bgColor: 'bg-red-900/30',
        borderColor: 'border-red-500',
        icon: <AlertCircle size={24} className="text-red-500" />,
        title: 'Upload failed',
        subtitle: 'Click to retry',
        showRemove: true
      };
    }

    return {
      bgColor: 'bg-gray-800/50',
      borderColor: 'border-gray-600 hover:border-purple-500',
      icon: <Plus size={24} className="text-gray-400" />,
      title: 'Upload Track',
      subtitle: 'Click to select audio file',
      showRemove: false
    };
  };

  const bothTracksReady = trackA && trackB && trackAStatus.status === 'ready' && trackBStatus.status === 'ready';

  return (
    <div className="space-y-6 py-4" data-onboarding="upload">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-white">Upload Your Tracks</h2>
        <p className="text-gray-400">
          Upload two songs to create your professional DJ mix
        </p>
        <p className="text-sm text-gray-500">
          Supports: {SUPPORTED_FORMATS.join(', ')} • Max 100MB each
        </p>
      </div>

      {/* Upload Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Track A Upload Box */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Track A</h3>
            {trackA && (
              <span className="text-xs text-gray-400">({formatDuration(trackA.metadata.duration || 0)})</span>
            )}
          </div>
          
          <div className="relative">
            <input
              ref={trackAInputRef}
              type="file"
              accept={SUPPORTED_FORMATS.join(',')}
              onChange={handleFileInput('A')}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={loading.trackA}
            />
            
            {(() => {
              const state = getTrackUploadState(trackA, trackAStatus, loading.trackA);
              return (
                <div 
                  className={`
                    relative w-full h-32 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer
                    flex flex-col items-center justify-center space-y-3 p-6
                    ${state.bgColor} ${state.borderColor}
                    ${!trackA && !loading.trackA ? 'hover:border-purple-400 hover:bg-purple-900/20' : ''}
                  `}
                  onClick={() => !trackA && !loading.trackA && trackAInputRef.current?.click()}
                >
                  {state.icon}
                  <div className="text-center">
                    <p className="text-white font-medium text-xs truncate max-w-full">
                      {state.title}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {state.subtitle}
                    </p>
                  </div>
                  
                  {state.showRemove && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTrack('A');
                      }}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all duration-200"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Track B Upload Box */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Track B</h3>
            {trackB && (
              <span className="text-xs text-gray-400">({formatDuration(trackB.metadata.duration || 0)})</span>
            )}
          </div>
          
          <div className="relative">
            <input
              ref={trackBInputRef}
              type="file"
              accept={SUPPORTED_FORMATS.join(',')}
              onChange={handleFileInput('B')}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={loading.trackB}
            />
            
            {(() => {
              const state = getTrackUploadState(trackB, trackBStatus, loading.trackB);
              return (
                <div 
                  className={`
                    relative w-full h-32 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer
                    flex flex-col items-center justify-center space-y-3 p-6
                    ${state.bgColor} ${state.borderColor}
                    ${!trackB && !loading.trackB ? 'hover:border-purple-400 hover:bg-purple-900/20' : ''}
                  `}
                  onClick={() => !trackB && !loading.trackB && trackBInputRef.current?.click()}
                >
                  {state.icon}
                  <div className="text-center">
                    <p className="text-white font-medium text-xs truncate max-w-full">
                      {state.title}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {state.subtitle}
                    </p>
                  </div>
                  
                  {state.showRemove && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTrack('B');
                      }}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all duration-200"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-3">
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
          trackA && trackAStatus.status === 'ready' ? 'bg-green-900/30 text-green-300' : 'bg-gray-800/50 text-gray-400'
        }`}>
          {trackA && trackAStatus.status === 'ready' ? (
            <CheckCircle size={16} />
          ) : (
            <div className="w-4 h-4 border-2 border-gray-500 rounded-full" />
          )}
          <span className="text-sm font-medium">Track A</span>
        </div>
        
        <div className={`w-6 h-0.5 rounded-full ${
          trackA && trackB && trackAStatus.status === 'ready' && trackBStatus.status === 'ready'
            ? 'bg-green-500'
            : 'bg-gray-600'
        }`} />
        
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
          trackB && trackBStatus.status === 'ready' ? 'bg-green-900/30 text-green-300' : 'bg-gray-800/50 text-gray-400'
        }`}>
          {trackB && trackBStatus.status === 'ready' ? (
            <CheckCircle size={16} />
          ) : (
            <div className="w-4 h-4 border-2 border-gray-500 rounded-full" />
          )}
          <span className="text-sm font-medium">Track B</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start space-x-3 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-1">Upload Error</p>
            <p className="text-sm whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message & Next Step */}
      {bothTracksReady && (
        <div className="space-y-4">
          <div className="flex items-center justify-center p-4 bg-green-900/30 border border-green-500 rounded-lg">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-300 mb-1">
                  Both tracks uploaded successfully!
                </h3>
                <p className="text-green-200 text-sm">
                  Ready to start mixing • Duration: A={formatDuration(trackA?.metadata.duration || 0)}, B={formatDuration(trackB?.metadata.duration || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Instructions for next step */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center space-x-2 text-purple-400">
              <Zap size={16} />
              <span className="font-medium">Ready to mix!</span>
            </div>
            <p className="text-gray-300 text-sm">
              Your tracks are now loaded. Browse templates and drag them onto the timeline to create professional transitions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioUploader;