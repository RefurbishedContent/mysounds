import { useState, useRef, useCallback, useEffect } from 'react';
import { TemplatePlacement } from '../types';
import { TemplateData } from '../lib/database';
import { UploadResult } from '../lib/storage';

interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
}

export const useAudioEngine = () => {
  const [state, setState] = useState<AudioEngineState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null
  });

  // Audio context and nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const trackASourceRef = useRef<AudioBufferSourceNode | null>(null);
  const trackBSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const trackAGainRef = useRef<GainNode | null>(null);
  const trackBGainRef = useRef<GainNode | null>(null);
  const trackAFilterRef = useRef<BiquadFilterNode | null>(null);
  const trackBFilterRef = useRef<BiquadFilterNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  // Audio buffers
  const trackABufferRef = useRef<AudioBuffer | null>(null);
  const trackBBufferRef = useRef<AudioBuffer | null>(null);

  // Playback state
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // Template placements
  const templatePlacementsRef = useRef<TemplatePlacement[]>([]);
  const templatesRef = useRef<Map<string, TemplateData>>(new Map());

  // Initialize audio context
  const initializeAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create master gain node
        masterGainRef.current = audioContextRef.current.createGain();
        masterGainRef.current.connect(audioContextRef.current.destination);

        // Create track gain nodes
        trackAGainRef.current = audioContextRef.current.createGain();
        trackBGainRef.current = audioContextRef.current.createGain();
        
        // Create filter nodes
        trackAFilterRef.current = audioContextRef.current.createBiquadFilter();
        trackBFilterRef.current = audioContextRef.current.createBiquadFilter();
        
        // Connect audio graph
        trackAGainRef.current.connect(trackAFilterRef.current);
        trackBGainRef.current.connect(trackBFilterRef.current);
        trackAFilterRef.current.connect(masterGainRef.current);
        trackBFilterRef.current.connect(masterGainRef.current);

        // Set initial filter values
        trackAFilterRef.current.type = 'allpass';
        trackBFilterRef.current.type = 'allpass';
        trackAFilterRef.current.frequency.value = 1000;
        trackBFilterRef.current.frequency.value = 1000;

      } catch (error) {
        setState(prev => ({ ...prev, error: 'Failed to initialize audio context' }));
      }
    }
  }, []);

  // Load audio file
  const loadAudioFile = useCallback(async (file: File): Promise<AudioBuffer | null> => {
    if (!audioContextRef.current) return null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.error('Failed to decode audio:', error);
      return null;
    }
  }, []);

  // Load tracks
  const loadTracks = useCallback(async (trackA: UploadResult | null, trackB: UploadResult | null) => {
    await initializeAudioContext();
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let maxDuration = 0;

      if (trackA?.url) {
        // Load from URL instead of file
        const response = await fetch(trackA.url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        if (buffer) {
          trackABufferRef.current = buffer;
          maxDuration = Math.max(maxDuration, buffer.duration);
        }
      }

      if (trackB?.url) {
        // Load from URL instead of file
        const response = await fetch(trackB.url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        if (buffer) {
          trackBBufferRef.current = buffer;
          maxDuration = Math.max(maxDuration, buffer.duration);
        }
      }

      setState(prev => ({ 
        ...prev, 
        duration: maxDuration,
        isLoading: false 
      }));

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to load audio tracks',
        isLoading: false 
      }));
    }
  }, [initializeAudioContext, loadAudioFile]);

  // Create audio source
  const createSource = useCallback((buffer: AudioBuffer, gainNode: GainNode): AudioBufferSourceNode | null => {
    if (!audioContextRef.current) return null;

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    return source;
  }, []);

  // Apply template effects
  const applyTemplateEffects = useCallback((currentTime: number) => {
    if (!audioContextRef.current || !trackAGainRef.current || !trackBGainRef.current) return;

    const audioContext = audioContextRef.current;
    const now = audioContext.currentTime;

    // Reset to default values
    trackAGainRef.current.gain.cancelScheduledValues(now);
    trackBGainRef.current.gain.cancelScheduledValues(now);
    trackAFilterRef.current?.frequency.cancelScheduledValues(now);
    trackBFilterRef.current?.frequency.cancelScheduledValues(now);

    // Set default values
    trackAGainRef.current.gain.setValueAtTime(1, now);
    trackBGainRef.current.gain.setValueAtTime(1, now);
    trackAFilterRef.current?.frequency.setValueAtTime(22050, now);
    trackBFilterRef.current?.frequency.setValueAtTime(22050, now);

    // Apply template placements
    templatePlacementsRef.current.forEach(placement => {
      const template = templatesRef.current.get(placement.templateId);
      if (!template) return;

      const placementStart = placement.startTime;
      const placementEnd = placement.trackARegion.end;

      // Check if current time is within this placement
      if (currentTime >= placementStart && currentTime <= placementEnd) {
        const relativeTime = currentTime - placementStart;
        
        // Apply transitions
        template.transitions.forEach(transition => {
          if (relativeTime >= transition.startTime && 
              relativeTime <= transition.startTime + transition.duration) {
            
            const transitionProgress = (relativeTime - transition.startTime) / transition.duration;
            
            // Apply volume automation
            if (transition.parameters.volumeAutomation) {
              const automation = transition.parameters.volumeAutomation;
              
              // Find the current automation point
              for (let i = 0; i < automation.length - 1; i++) {
                const current = automation[i];
                const next = automation[i + 1];
                
                if (relativeTime >= current.time && relativeTime <= next.time) {
                  const segmentProgress = (relativeTime - current.time) / (next.time - current.time);
                  
                  // Interpolate values
                  const trackAVolume = current.trackA + (next.trackA - current.trackA) * segmentProgress;
                  const trackBVolume = current.trackB + (next.trackB - current.trackB) * segmentProgress;
                  
                  // Apply with parameter overrides
                  const overrides = placement.parameterOverrides || {};
                  const finalTrackAVolume = (trackAVolume / 100) * (overrides.trackAVolume || 1);
                  const finalTrackBVolume = (trackBVolume / 100) * (overrides.trackBVolume || 1);
                  
                  trackAGainRef.current?.gain.setValueAtTime(finalTrackAVolume, now);
                  trackBGainRef.current?.gain.setValueAtTime(finalTrackBVolume, now);
                  break;
                }
              }
            }

            // Apply filter effects
            if (transition.type === 'filter' && transition.parameters.filterType) {
              const filterType = transition.parameters.filterType as BiquadFilterType;
              const cutoffFreq = transition.parameters.cutoffFreq || 1000;
              const resonance = transition.parameters.resonance || 1;
              
              // Apply to both tracks or based on transition logic
              if (trackAFilterRef.current && trackBFilterRef.current) {
                trackAFilterRef.current.type = filterType;
                trackBFilterRef.current.type = filterType;
                
                // Animate filter frequency based on transition progress
                let currentFreq = cutoffFreq;
                if (filterType === 'highpass') {
                  currentFreq = 20 + (cutoffFreq - 20) * transitionProgress;
                } else if (filterType === 'lowpass') {
                  currentFreq = cutoffFreq + (22050 - cutoffFreq) * (1 - transitionProgress);
                }
                
                trackAFilterRef.current.frequency.setValueAtTime(currentFreq, now);
                trackBFilterRef.current.frequency.setValueAtTime(currentFreq, now);
                trackAFilterRef.current.Q.setValueAtTime(resonance, now);
                trackBFilterRef.current.Q.setValueAtTime(resonance, now);
              }
            }
          }
        });
      }
    });
  }, []);

  // Update current time
  const updateCurrentTime = useCallback(() => {
    if (!audioContextRef.current || !isPlayingRef.current) return;

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
    const newCurrentTime = pauseTimeRef.current + elapsed;

    if (newCurrentTime >= state.duration) {
      // End of track
      stop();
      return;
    }

    setState(prev => ({ ...prev, currentTime: newCurrentTime }));
    applyTemplateEffects(newCurrentTime);

    animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
  }, [state.duration, applyTemplateEffects]);

  // Play
  const play = useCallback(async () => {
    if (!audioContextRef.current) {
      await initializeAudioContext();
    }

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (!trackAGainRef.current || !trackBGainRef.current) return;

    // Stop existing sources
    if (trackASourceRef.current) {
      trackASourceRef.current.stop();
      trackASourceRef.current = null;
    }
    if (trackBSourceRef.current) {
      trackBSourceRef.current.stop();
      trackBSourceRef.current = null;
    }

    // Create new sources
    if (trackABufferRef.current) {
      trackASourceRef.current = createSource(trackABufferRef.current, trackAGainRef.current);
      if (trackASourceRef.current) {
        trackASourceRef.current.start(0, pauseTimeRef.current);
      }
    }

    if (trackBBufferRef.current) {
      trackBSourceRef.current = createSource(trackBBufferRef.current, trackBGainRef.current);
      if (trackBSourceRef.current) {
        trackBSourceRef.current.start(0, pauseTimeRef.current);
      }
    }

    startTimeRef.current = audioContextRef.current!.currentTime;
    isPlayingRef.current = true;
    setState(prev => ({ ...prev, isPlaying: true }));

    // Start time updates
    updateCurrentTime();
  }, [initializeAudioContext, createSource, updateCurrentTime]);

  // Pause
  const pause = useCallback(() => {
    if (trackASourceRef.current) {
      trackASourceRef.current.stop();
      trackASourceRef.current = null;
    }
    if (trackBSourceRef.current) {
      trackBSourceRef.current.stop();
      trackBSourceRef.current = null;
    }

    isPlayingRef.current = false;
    setState(prev => ({ ...prev, isPlaying: false }));

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Stop
  const stop = useCallback(() => {
    pause();
    pauseTimeRef.current = 0;
    setState(prev => ({ ...prev, currentTime: 0 }));
  }, [pause]);

  // Seek
  const seek = useCallback((time: number) => {
    const wasPlaying = state.isPlaying;
    
    if (wasPlaying) {
      pause();
    }

    pauseTimeRef.current = Math.max(0, Math.min(time, state.duration));
    setState(prev => ({ ...prev, currentTime: pauseTimeRef.current }));

    if (wasPlaying) {
      // Small delay to prevent audio glitches
      setTimeout(() => play(), 50);
    }
  }, [state.isPlaying, state.duration, pause, play]);

  // Update template placements
  const updateTemplatePlacements = useCallback((placements: TemplatePlacement[], templates: Map<string, TemplateData>) => {
    templatePlacementsRef.current = placements;
    templatesRef.current = templates;
    
    // Apply effects immediately if playing
    if (isPlayingRef.current) {
      applyTemplateEffects(state.currentTime);
    }
  }, [state.currentTime, applyTemplateEffects]);

  // Set track volumes
  const setTrackVolume = useCallback((track: 'A' | 'B', volume: number) => {
    const gainNode = track === 'A' ? trackAGainRef.current : trackBGainRef.current;
    if (gainNode && audioContextRef.current) {
      const normalizedVolume = Math.max(0, Math.min(1, volume / 100));
      gainNode.gain.setValueAtTime(normalizedVolume, audioContextRef.current.currentTime);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    ...state,
    loadTracks,
    play,
    pause,
    stop,
    seek,
    updateTemplatePlacements,
    setTrackVolume
  };
};