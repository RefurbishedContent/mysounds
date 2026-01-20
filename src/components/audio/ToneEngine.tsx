import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Volume2, 
  Download, 
  Zap, 
  Settings, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Music,
  Database,
  RefreshCw,
  Eye,
  EyeOff,
  BarChart3,
  Upload,
  FileAudio
} from 'lucide-react';
import { TimelineQueries } from '../../lib/data/timelineQueries';
import { toneScheduler } from '../../lib/audio/toneScheduler';
import { TimelineAdapter } from '../../lib/adapters/timelineAdapter';
import { TimelineData } from '../../types/timeline';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

declare global {
  interface Window {
    Tone: any;
  }
}
import { Pause, Square as SquareIcon, SkipForward, ZoomIn, ZoomOut } from 'lucide-react';

interface ToneEngineProps {
  projectId?: string;
  cursorSec?: number;
  className?: string;
}

const ToneEngine: React.FC<ToneEngineProps> = ({ projectId, cursorSec = 0, className = '' }) => {
  const { user } = useAuth();
  const [Tone, setTone] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [crossfadeValue, setCrossfadeValue] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Not initialized');
  const [transportTime, setTransportTime] = useState('0:0:0');
  const [audioLoadingStatus, setAudioLoadingStatus] = useState({ a: false, b: false });
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [projectPlayable, setProjectPlayable] = useState({ isPlayable: false, missingElements: [] as string[] });
  const [visualizationEnabled, setVisualizationEnabled] = useState(true);
  const [showVisualization, setShowVisualization] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [exportDuration, setExportDuration] = useState(30); // Default 30 seconds

  // Tone.js objects
  const crossFadeRef = useRef<any>(null);
  const playerARef = useRef<any>(null);
  const playerBRef = useRef<any>(null);
  const recorderRef = useRef<any>(null);
  const transportInterval = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Export refs
  const exportRecorderRef = useRef<any>(null);
  const exportStartTimeRef = useRef<number>(0);
  // Fallback test URLs for projects without data
  // Using working test audio files with CORS support
  const songAUrl = 'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrr.m4a';
  const songBUrl = 'https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/soundtrack.mp3';

  // Show toast message
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Clear toast message
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Calculate export duration from timeline data
  useEffect(() => {
    if (timelineData) {
      const bounds = TimelineAdapter.getTimelineBounds(timelineData);
      setExportDuration(Math.ceil(bounds.totalDuration));
    }
  }, [timelineData]);

  // Dynamic import Tone.js
  useEffect(() => {
    const loadTone = async () => {
      try {
        setStatus('Loading Tone.js...');
        const ToneModule = await import('tone');
        setTone(ToneModule.default || ToneModule);
        window.Tone = ToneModule.default || ToneModule;
        setStatus('Tone.js loaded - Click Initialize');
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load Tone.js';
        setError(message);
        setStatus('Failed to load Tone.js');
        console.error('Failed to load Tone.js:', err);
      }
    };

    loadTone();
  }, []);

  // Load project data if projectId provided
  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId) {
        setTimelineData(null);
        setProjectPlayable({ isPlayable: false, missingElements: ['No project specified'] });
        return;
      }

      try {
        setIsLoadingProject(true);
        setStatus('Loading project data...');
        
        // Check if project is playable
        const playabilityCheck = await TimelineQueries.isProjectPlayable(projectId, 'demo-user');
        setProjectPlayable(playabilityCheck);
        
        if (playabilityCheck.isPlayable) {
          // Fetch complete timeline data
          const data = await TimelineQueries.fetchTimelineData(projectId, 'demo-user');
          setTimelineData(data);
          setStatus(data ? 'Project data loaded' : 'Failed to load project data');
        } else {
          setStatus(`Project not ready: ${playabilityCheck.missingElements.join(', ')}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load project';
        setError(message);
        setStatus('Project loading failed');
        console.error('Failed to load project data:', err);
      } finally {
        setIsLoadingProject(false);
      }
    };

    loadProjectData();
  }, [projectId]);

  // Transport time display
  useEffect(() => {
    if (!Tone || !isInitialized) return;

    const updateTransportTime = () => {
      if (Tone.Transport) {
        setTransportTime(Tone.Transport.position);
      }
    };

    if (isPlaying) {
      transportInterval.current = setInterval(updateTransportTime, 100);
    } else if (transportInterval.current) {
      clearInterval(transportInterval.current);
      transportInterval.current = null;
    }

    return () => {
      if (transportInterval.current) {
        clearInterval(transportInterval.current);
      }
    };
  }, [Tone, isInitialized, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Visualization effect
  useEffect(() => {
    if (visualizationEnabled && showVisualization && analyserRef.current && canvasRef.current) {
      startVisualization();
    } else {
      stopVisualization();
    }
    
    return () => stopVisualization();
  }, [visualizationEnabled, showVisualization, isInitialized]);
  const cleanup = () => {
    try {
      stopVisualization();
      
      if (transportInterval.current) {
        clearInterval(transportInterval.current);
        transportInterval.current = null;
      }

      if (Tone) {
        // Stop transport
        if (Tone.Transport) {
          Tone.Transport.stop();
          Tone.Transport.cancel();
        }

        // Stop and dispose players
        if (playerARef.current) {
          playerARef.current.stop();
          playerARef.current.dispose();
          playerARef.current = null;
        }

        if (playerBRef.current) {
          playerBRef.current.stop();
          playerBRef.current.dispose();
          playerBRef.current = null;
        }

        // Stop and dispose recorder
        if (recorderRef.current) {
          recorderRef.current.stop();
          recorderRef.current.dispose();
          recorderRef.current = null;
        }

        // Dispose crossfade
        if (crossFadeRef.current) {
          crossFadeRef.current.dispose();
          crossFadeRef.current = null;
        }

        // Dispose analyser
        if (analyserRef.current) {
          analyserRef.current.dispose();
          analyserRef.current = null;
        }
      }
    } catch (err) {
      console.warn('Cleanup error:', err);
    }
  };

  const handleInitialize = async () => {
    if (!Tone) {
      setError('Tone.js not loaded');
      return;
    }

    try {
      setStatus('Initializing audio context...');
      setError(null);

      // User gesture requirement - start Tone.js
      console.log('Starting Tone.js audio context...');
      await Tone.start();
      console.log('Audio context started, state:', Tone.context.state);
      
      // Initialize scheduler
      await toneScheduler.initialize(Tone);
      console.log('ToneScheduler initialized');

      // Create analyser for visualization
      analyserRef.current = new Tone.Analyser('waveform', 256);
      Tone.getDestination().connect(analyserRef.current);
      
      // Create export recorder
      exportRecorderRef.current = new Tone.Recorder();
      Tone.getDestination().connect(exportRecorderRef.current);
      console.log('Audio analyser created for visualization');

      if (timelineData && projectPlayable.isPlayable) {
        setStatus('Building players for project tracks...');
        
        // Build players from timeline data
        const players = await toneScheduler.buildPlayers(timelineData.tracks);
        console.log('Players built for tracks:', Object.keys(players));
        
        // Schedule clips and transitions
        toneScheduler.scheduleClips(timelineData.clips);
        toneScheduler.scheduleTransitions(timelineData.transitions);
        console.log('Timeline events scheduled');
        
        setStatus('Project ready for playback');
      } else {
        setStatus('Using fallback test audio...');
        
        // Fallback to test players
        await setupTestPlayers(Tone);
      }

      setIsInitialized(true);
      setShowVisualization(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Initialization failed';
      console.error('Initialization error:', err);
      setError(message);
      setStatus('Initialization failed');
    }
  };

  // Setup test players for fallback mode
  const setupTestPlayers = async (ToneInstance: any) => {
    setStatus('Setting up test audio players...');

    // Create CrossFade node
    crossFadeRef.current = new ToneInstance.CrossFade(0).toDestination();
    console.log('CrossFade node created');

    // Create Players with test URLs
    playerARef.current = new ToneInstance.Player({
        url: songAUrl,
        autostart: false,
        onload: () => {
          console.log('Player A loaded successfully');
          setAudioLoadingStatus(prev => ({ ...prev, a: true }));
        },
        onerror: (err: any) => {
          console.error('Player A error:', err);
          setError(`Player A failed to load: ${err.message || 'Network error'}`);
        }
      }).connect(crossFadeRef.current.a);

    playerBRef.current = new ToneInstance.Player({
        url: songBUrl,
        autostart: false,
        onload: () => {
          console.log('Player B loaded successfully');
          setAudioLoadingStatus(prev => ({ ...prev, b: true }));
        },
        onerror: (err: any) => {
          console.error('Player B error:', err);
          setError(`Player B failed to load: ${err.message || 'Network error'}`);
        }
      }).connect(crossFadeRef.current.b);

    console.log('Test players created and connected');

    // Create Recorder
    recorderRef.current = new ToneInstance.Recorder();
    ToneInstance.getDestination().connect(recorderRef.current);
    console.log('Recorder created and connected');

    // Set initial crossfade value
    crossFadeRef.current.fade.value = crossfadeValue;
  };

  const startVisualization = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawWaveform = () => {
      if (!analyserRef.current || !ctx || !visualizationEnabled || !showVisualization) {
        return;
      }

      const dataArray = analyserRef.current.getValue();
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.fillStyle = 'rgba(17, 17, 19, 0.3)';
      ctx.fillRect(0, 0, width, height);

      // Draw waveform
      ctx.strokeStyle = '#8B5CF6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const sliceWidth = width / dataArray.length;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        // Convert from dB to normalized value
        const dbValue = dataArray[i];
        const normalizedValue = Math.max(0, Math.min(1, (dbValue + 100) / 100));
        const y = (1 - normalizedValue) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();

      // Draw frequency bars
      ctx.fillStyle = 'rgba(139, 92, 246, 0.6)';
      const barWidth = width / dataArray.length * 2;
      
      for (let i = 0; i < dataArray.length; i += 2) {
        const dbValue = dataArray[i];
        const normalizedValue = Math.max(0, Math.min(1, (dbValue + 100) / 100));
        const barHeight = normalizedValue * height * 0.8;
        
        ctx.fillRect(
          i * barWidth / 2, 
          height - barHeight, 
          barWidth - 1, 
          barHeight
        );
      }

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    };

    // Start animation loop
    drawWaveform();
  };

  const stopVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const toggleVisualization = () => {
    setVisualizationEnabled(!visualizationEnabled);
    if (!visualizationEnabled) {
      setShowVisualization(true);
    } else {
      setShowVisualization(false);
    }
  };

  const handleExportMix = async () => {
    if (!isInitialized || !exportRecorderRef.current) {
      showToast('error', 'Audio engine not initialized');
      return;
    }

    if (!user) {
      showToast('error', 'Please sign in to export mixes');
      return;
    }

    if (!timelineData && !playerARef.current) {
      showToast('error', 'No audio loaded for export');
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(0);
      showToast('info', `Starting ${exportDuration}s mix export...`);

      // Reset transport to beginning
      if (Tone.Transport) {
        Tone.Transport.stop();
        Tone.Transport.cancel();
        Tone.Transport.seconds = 0;
      }

      // Start recording
      exportRecorderRef.current.start();
      exportStartTimeRef.current = Date.now();
      
      // Progress tracking
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - exportStartTimeRef.current) / 1000;
        const progress = Math.min((elapsed / exportDuration) * 100, 95);
        setExportProgress(progress);
      }, 100);

      if (timelineData) {
        // Use scheduler for project export
        toneScheduler.play();
        
        // Wait for export duration
        await new Promise(resolve => setTimeout(resolve, exportDuration * 1000));
        
        toneScheduler.stop();
      } else {
        // Fallback to test audio export
        if (playerARef.current && playerBRef.current) {
          const startTime = Tone.now();
          playerARef.current.start(startTime);
          playerBRef.current.start(startTime);
          
          if (Tone.Transport) {
            Tone.Transport.start();
          }
          
          // Wait for export duration
          await new Promise(resolve => setTimeout(resolve, exportDuration * 1000));
          
          playerARef.current.stop();
          playerBRef.current.stop();
          
          if (Tone.Transport) {
            Tone.Transport.stop();
          }
        }
      }

      clearInterval(progressInterval);
      setExportProgress(95);
      showToast('info', 'Processing export...');

      // Stop recording and get blob
      const recording = await exportRecorderRef.current.stop();
      setExportProgress(100);

      // Upload to Supabase Storage
      await uploadMixToSupabase(recording);

    } catch (err) {
      console.error('Export error:', err);
      showToast('error', err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const uploadMixToSupabase = async (recording: Blob) => {
    if (!user || !projectId) {
      throw new Error('User and project required for upload');
    }

    try {
      showToast('info', 'Uploading to Supabase Storage...');

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `mixdowns/${projectId}/${timestamp}.wav`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-uploads')
        .upload(filename, recording, {
          contentType: 'audio/wav',
          cacheControl: '3600'
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('audio-uploads')
        .getPublicUrl(filename);

      // Insert mixdown record
      const { error: dbError } = await supabase
        .from('mixdowns')
        .insert({
          project_id: projectId === 'demo' ? null : projectId,
          user_id: user.id,
          url: urlData.publicUrl,
          filename: `${timelineData?.project.name || 'Mix'}-${timestamp}.wav`,
          duration: exportDuration,
          file_size: recording.size,
          format: 'wav',
          status: 'completed'
        });

      if (dbError) {
        console.warn('Failed to save mixdown record:', dbError);
        // Still show success since file was uploaded
      }

      showToast('success', `Mix exported successfully! ${Math.round(recording.size / 1024)} KB`);

      // Also download locally
      const url = URL.createObjectURL(recording);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${timelineData?.project.name || 'mix'}-${timestamp}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handlePlay = () => {
    if (!isInitialized) {
      setError('Please initialize the audio engine first');
      return;
    }
    
    try {
      if (timelineData) {
        // Use scheduler for project playback
        if (cursorSec > 0) {
          toneScheduler.seek(cursorSec);
        }
        toneScheduler.play();
        setIsPlaying(true);
        setStatus('Playing project timeline...');
      } else {
        // Fallback to test playback
        if (!playerARef.current || !playerBRef.current) {
          setError('Audio players not ready');
          return;
        }

        console.log('Starting test playback...');
        const startTime = Tone.now();
        playerARef.current.start(startTime);
        playerBRef.current.start(startTime);
        
        if (Tone.Transport) {
          Tone.Transport.start();
        }
        
        setIsPlaying(true);
        setStatus('Playing test audio...');
      }
      
      setError(null);
      
      // Start visualization if enabled
      if (visualizationEnabled && !showVisualization) {
        setShowVisualization(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Playback failed';
      console.error('Playback error:', err);
      setError(message);
    }
  };

  const handleStop = () => {
    if (!isInitialized) {
      return;
    }

    try {
      if (timelineData) {
        // Use scheduler for project playback
        toneScheduler.stop();
      } else {
        // Fallback to test playback
        if (playerARef.current) {
          playerARef.current.stop();
        }
        if (playerBRef.current) {
          playerBRef.current.stop();
        }
        if (Tone.Transport) {
          Tone.Transport.stop();
          Tone.Transport.cancel();
        }
      }

      setIsPlaying(false);
      setStatus('Stopped');
    } catch (err) {
      console.error('Stop error:', err);
    }
    
    // Optionally pause visualization when stopped
    // setShowVisualization(false);
  };

  const handlePreviewFromCursor = () => {
    if (!isInitialized) return;

    try {
      if (timelineData && cursorSec > 0) {
        // Seek to cursor position and play
        toneScheduler.seek(cursorSec);
        toneScheduler.play();
        setIsPlaying(true);
        setStatus(`Playing from ${cursorSec.toFixed(1)}s...`);
      } else {
        setError('No cursor position specified');
      }
    } catch (err) {
      console.error('Preview from cursor error:', err);
      setError(err instanceof Error ? err.message : 'Preview failed');
    }
  };

  const handleTestConnectivity = async () => {
    if (!timelineData) {
      setError('No project data to test');
      return;
    }

    try {
      setStatus('Testing audio connectivity...');
      const results = await toneScheduler.testConnectivity(timelineData.tracks);
      
      const accessible = results.accessible.filter(r => r.accessible).length;
      const total = results.accessible.length;
      
      if (accessible === total) {
        setStatus(`All ${total} tracks accessible`);
        setError(null);
      } else {
        setError(`${total - accessible} tracks not accessible`);
        setStatus('Connectivity test failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connectivity test failed');
    }
  };

  const handleCrossfadeChange = (value: number) => {
    setCrossfadeValue(value);
    
    if (timelineData) {
      // Use scheduler crossfade
      toneScheduler.setCrossfade(value);
    } else if (crossFadeRef.current) {
      // Use test crossfade
      crossFadeRef.current.fade.value = value;
    }
  };

  const handleScheduleCrossfade = () => {
    if (!isInitialized || !crossFadeRef.current || !Tone.Transport) {
      setError('Not initialized');
      return;
    }

    try {
      // Clear any existing scheduled events
      Tone.Transport.cancel();
      console.log('Scheduling crossfade automation...');
      
      // Schedule crossfade automation at current time + 2s for 8s duration
      const scheduleTime = Tone.Transport.seconds + 2;
      
      Tone.Transport.scheduleOnce((time: number) => {
        console.log('Executing scheduled crossfade at time:', time);
        setStatus('Executing scheduled crossfade...');
        
        // Ramp from current value to opposite over 8 seconds
        const targetValue = crossfadeValue < 0.5 ? 1 : 0;
        crossFadeRef.current.fade.rampTo(targetValue, 8, time);
        
        // Update UI gradually
        const startValue = crossfadeValue;
        const startTime = Date.now();
        const duration = 8000; // 8 seconds in ms
        
        const updateUI = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const currentValue = startValue + (targetValue - startValue) * progress;
          setCrossfadeValue(currentValue);
          
          if (progress < 1) {
            requestAnimationFrame(updateUI);
          } else {
            setStatus('Scheduled crossfade complete');
          }
        };
        requestAnimationFrame(updateUI);
        
      }, scheduleTime);

      setStatus(`Crossfade scheduled for t=${scheduleTime.toFixed(1)}s (8s duration)`);
      setError(null);
      console.log(`Crossfade scheduled for ${scheduleTime}s`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scheduling failed';
      setError(message);
      console.error('Scheduling error:', err);
    }
  };

  const handleRecord = async () => {
    if (!isInitialized || !recorderRef.current) {
      setError('Not initialized');
      return;
    }

    try {
      setIsRecording(true);
      setStatus('Recording for 3 seconds...');
      setError(null);

      // Start recording
      recorderRef.current.start();

      // Wait 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Stop recording
      const recording = await recorderRef.current.stop();

      setIsRecording(false);
      setStatus('Recording complete - downloading...');

      // Download the recording
      const url = URL.createObjectURL(recording);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mix.wav';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus('Download complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Recording failed';
      setError(message);
      setStatus('Recording failed');
      setIsRecording(false);
      console.error('Recording error:', err);
    }
  };

  return (
    <div className={`space-y-6 p-6 glass-surface rounded-2xl ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center space-x-2">
          <Music size={24} className="text-purple-400" />
          <span>{projectId ? 'Project Audio Engine' : 'Tone.js Audio Engine'}</span>
        </h2>
        <p className="text-gray-400">
          {projectId 
            ? `Project ID: ${projectId} - ${timelineData ? 'Timeline data loaded' : 'Loading timeline data...'}`
            : 'Browser-based audio processing with crossfading and recording'
          }
        </p>
      </div>

      {/* Project Data Status */}
      {projectId && (
        <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4">
          <h3 className="text-white font-medium text-sm mb-3 flex items-center space-x-2">
            <Database size={16} />
            <span>Project Data Status</span>
            {isLoadingProject && <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />}
          </h3>
          
          {timelineData ? (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400">Project:</span>
                <span className="text-white ml-2">{timelineData.project.name}</span>
              </div>
              <div>
                <span className="text-gray-400">Tracks:</span>
                <span className="text-white ml-2">{timelineData.tracks.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Clips:</span>
                <span className="text-white ml-2">{timelineData.clips.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Transitions:</span>
                <span className="text-white ml-2">{timelineData.transitions.length}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm">
              {projectPlayable.isPlayable ? (
                <span className="text-yellow-300">Loading timeline data...</span>
              ) : (
                <div className="space-y-2">
                  <span className="text-red-300">Project not ready for playback:</span>
                  <ul className="text-red-200 text-xs list-disc list-inside">
                    {projectPlayable.missingElements.map((element, index) => (
                      <li key={index}>{element}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status */}
      <div className="text-center">
        <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg ${
          error 
            ? 'bg-red-900/30 border border-red-700 text-red-300'
            : isInitialized 
            ? 'bg-green-900/30 border border-green-500 text-green-300'
            : 'bg-yellow-900/30 border border-yellow-500 text-yellow-300'
        }`}>
          {error ? (
            <AlertCircle size={16} />
          ) : isInitialized ? (
            <CheckCircle size={16} />
          ) : (
            <Clock size={16} />
          )}
          <span className="text-sm font-medium">{error || status}</span>
        </div>
      </div>

      {/* Transport Display */}
      {isInitialized && (
        <div className="text-center">
          <div className="bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 font-mono text-white">
            Transport: {transportTime}
          </div>
        </div>
      )}

      {/* Audio Visualization */}
      {isInitialized && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <BarChart3 size={20} className="text-purple-400" />
              <span>Real-time Visualization</span>
            </h3>
            <button
              onClick={toggleVisualization}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                visualizationEnabled
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {visualizationEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
              <span>{visualizationEnabled ? 'Disable' : 'Enable'}</span>
            </button>
          </div>
          
          <div className={`bg-gray-900 border border-gray-600 rounded-lg overflow-hidden transition-opacity duration-200 ${
            showVisualization ? 'opacity-100' : 'opacity-50'
          }`}>
            <canvas
              ref={canvasRef}
              width={800}
              height={200}
              className="w-full h-32 md:h-40"
              style={{ 
                background: 'linear-gradient(135deg, rgba(17, 17, 19, 0.8) 0%, rgba(30, 30, 33, 0.8) 100%)'
              }}
            />
            <div className="p-3 border-t border-gray-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {visualizationEnabled ? 'Real-time waveform analysis' : 'Visualization disabled'}
                </span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-purple-300">Waveform</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full opacity-60"></div>
                    <span className="text-purple-200">Frequency</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {!visualizationEnabled && (
            <p className="text-xs text-gray-500 text-center">
              Visualization disabled for better performance. Enable to see real-time audio analysis.
            </p>
          )}
        </div>
      )}

      {/* Main Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Initialization */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">1. Initialize</h3>
          <button
            onClick={handleInitialize}
            disabled={!Tone || isInitialized}
            className={`w-full px-4 py-3 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
              isInitialized
                ? 'bg-green-600 cursor-default'
                : !Tone
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
            }`}
          >
            {isInitialized ? (
              <>
                <CheckCircle size={16} />
                <span>Audio Initialized</span>
              </>
            ) : !Tone ? (
              <>
                <AlertCircle size={16} />
                <span>Loading Tone.js...</span>
              </>
            ) : (
              <>
                <Settings size={16} />
                <span>Initialize Audio</span>
              </>
            )}
          </button>
          <p className="text-xs text-gray-400">
            {isInitialized 
              ? '✓ Web Audio API started successfully'
              : 'Requires user gesture to start Web Audio API'
            }
          </p>
          {projectId && timelineData && (
            <button
              onClick={handleTestConnectivity}
              disabled={!isInitialized}
              className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
            >
              <RefreshCw size={14} />
              <span>Test Audio URLs</span>
            </button>
          )}
        </div>

        {/* Playback */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">2. Playback</h3>
          <div className="flex space-x-2">
            <button
              onClick={handlePlay}
              disabled={!isInitialized || isPlaying || (projectId && !projectPlayable.isPlayable)}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Play size={16} />
              <span>Play</span>
            </button>
            <button
              onClick={handleStop}
              disabled={!isInitialized}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <SquareIcon size={16} />
              <span>Stop</span>
            </button>
          </div>
          {projectId && cursorSec > 0 && (
            <button
              onClick={handlePreviewFromCursor}
              disabled={!isInitialized || !timelineData}
              className="w-full px-3 py-2 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-800 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
            >
              <Clock size={14} />
              <span>Preview from {cursorSec.toFixed(1)}s</span>
            </button>
          )}
        </div>

        {/* Recording */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">3. Quick Record</h3>
          <button
            onClick={handleRecord}
            disabled={!isInitialized || isRecording}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {isRecording ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Recording...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Record 3s & Download</span>
              </>
            )}
          </button>
        </div>

        {/* Export Mix */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">4. Export Mix</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-400">Duration:</span>
              <input
                type="number"
                value={exportDuration}
                onChange={(e) => setExportDuration(Math.max(1, Number(e.target.value)))}
                min="1"
                max="300"
                className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
              />
              <span className="text-gray-400">seconds</span>
            </div>
            <button
              onClick={handleExportMix}
              disabled={!isInitialized || isExporting || !user}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{exportProgress.toFixed(0)}%</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Export to Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Crossfade Control */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Crossfade Control</h3>
          <span className="text-sm text-gray-400">
            Value: {crossfadeValue.toFixed(2)}
          </span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-blue-300 font-medium">Song A</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={crossfadeValue}
              onChange={(e) => handleCrossfadeChange(Number(e.target.value))}
              disabled={!isInitialized}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-sm text-orange-300 font-medium">Song B</span>
          </div>
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>Full A</span>
            <span>Equal Mix</span>
            <span>Full B</span>
          </div>
        </div>
      </div>

      {/* Advanced Controls */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Advanced Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scheduled Crossfade */}
          <button
            onClick={handleScheduleCrossfade}
            disabled={!isInitialized || (projectId && timelineData)}
            className="px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Zap size={16} />
            <span>{projectId ? 'Using Project Transitions' : 'Schedule Test Crossfade'}</span>
          </button>

          {/* Volume Control */}
          <div className="flex items-center space-x-3 px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg">
            <Volume2 size={16} className="text-gray-400" />
            <span className="text-sm text-gray-300">Master</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              defaultValue="0.7"
              onChange={(e) => {
                if (Tone && Tone.getDestination) {
                  Tone.getDestination().volume.value = Tone.gainToDb(Number(e.target.value));
                }
              }}
              disabled={!isInitialized}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>

      {/* Quick Diagnostics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Quick Diagnostics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tone.js Status */}
          <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4">
            <h4 className="text-white font-medium text-sm mb-2 flex items-center space-x-2">
              <Music size={14} />
              <span>Tone.js Status</span>
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Loaded:</span>
                <span className={Tone ? 'text-green-400' : 'text-red-400'}>
                  {Tone ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Context State:</span>
                <span className="text-white font-mono">
                  {Tone?.context?.state || 'not started'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sample Rate:</span>
                <span className="text-white font-mono">
                  {Tone?.context?.sampleRate || 'N/A'} Hz
                </span>
              </div>
            </div>
          </div>
          
          {/* Audio Players Status */}
          <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4">
            <h4 className="text-white font-medium text-sm mb-2 flex items-center space-x-2">
              <Volume2 size={14} />
              <span>Audio Players</span>
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Track A:</span>
                <span className={audioLoadingStatus.a ? 'text-green-400' : 'text-yellow-400'}>
                  {audioLoadingStatus.a ? 'Loaded' : 'Loading...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Track B:</span>
                <span className={audioLoadingStatus.b ? 'text-green-400' : 'text-yellow-400'}>
                  {audioLoadingStatus.b ? 'Loaded' : 'Loading...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Transport:</span>
                <span className="text-white font-mono">
                  {Tone?.Transport?.state || 'stopped'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Browser Info */}
          <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4">
            <h4 className="text-white font-medium text-sm mb-2 flex items-center space-x-2">
              <Settings size={14} />
              <span>Browser Support</span>
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Web Audio:</span>
                <span className={typeof AudioContext !== 'undefined' ? 'text-green-400' : 'text-red-400'}>
                  {typeof AudioContext !== 'undefined' ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">User Agent:</span>
                <span className="text-white font-mono text-xs truncate max-w-24" title={navigator.userAgent}>
                  {navigator.userAgent.split(' ')[0]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Sources Info */}
      {!projectId && (
        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-yellow-200 font-medium text-sm mb-1">Test Mode - Using Demo Audio</h4>
              <p className="text-yellow-100/80 text-xs leading-relaxed mb-2">
                Using demo audio files for testing. Pass a projectId prop to use real Supabase data:
              </p>
              <div className="space-y-1 text-xs font-mono text-yellow-200">
                <div>Song A: {songAUrl}</div>
                <div>Song B: {songBUrl}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Audio Sources */}
      {projectId && timelineData && (
        <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-4">
          <h4 className="text-green-200 font-medium text-sm mb-2">Project Audio Sources</h4>
          <div className="space-y-2">
            {timelineData.tracks.map(track => (
              <div key={track.id} className="flex items-center justify-between">
                <span className="text-green-100 text-xs font-medium">{track.name}</span>
                <span className="text-green-200 text-xs">
                  {track.duration.toFixed(1)}s • {track.analysis?.bpm || '?'} BPM
                </span>
              </div>
            ))}
          </div>
          {timelineData.transitions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-600/30">
              <span className="text-green-200 text-xs">
                {timelineData.transitions.length} transition(s) scheduled
              </span>
            </div>
          )}
        </div>
      )}

      {/* Debug Info */}
      {isInitialized && (
        <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4">
          <h4 className="text-white font-medium text-sm mb-2">Debug Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-gray-400">Context State:</div>
              <div className="text-white font-mono">{Tone?.context?.state || 'unknown'}</div>
            </div>
            <div>
              <div className="text-gray-400">Sample Rate:</div>
              <div className="text-white font-mono">{Tone?.context?.sampleRate || 'unknown'} Hz</div>
            </div>
            <div>
              <div className="text-gray-400">Transport State:</div>
              <div className="text-white font-mono">{Tone?.Transport?.state || 'unknown'}</div>
            </div>
            {projectId ? (
              <>
                <div>
                  <div className="text-gray-400">Scheduler:</div>
                  <div className="text-white font-mono">
                    {toneScheduler.getDebugInfo().playersCount} players
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Scheduled Events:</div>
                  <div className="text-white font-mono">
                    {toneScheduler.getDebugInfo().scheduledEventsCount}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Current Time:</div>
                  <div className="text-white font-mono">
                    {toneScheduler.getDebugInfo().transportSeconds?.toFixed(2) || '0.00'}s
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="text-gray-400">Players Connected:</div>
                <div className="text-white font-mono">
                  A: {playerARef.current ? '✓' : '✗'}, B: {playerBRef.current ? '✓' : '✗'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-xl border max-w-sm ${
            toastMessage.type === 'success' 
              ? 'bg-green-900/90 border-green-700 text-green-100'
              : toastMessage.type === 'error'
              ? 'bg-red-900/90 border-red-700 text-red-100'
              : 'bg-blue-900/90 border-blue-700 text-blue-100'
          }`}>
            {toastMessage.type === 'success' && <CheckCircle size={20} />}
            {toastMessage.type === 'error' && <AlertCircle size={20} />}
            {toastMessage.type === 'info' && <FileAudio size={20} />}
            <span className="text-sm font-medium">{toastMessage.message}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-current hover:opacity-70 transition-opacity duration-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8B5CF6, #EC4899);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8B5CF6, #EC4899);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
};

export default ToneEngine;