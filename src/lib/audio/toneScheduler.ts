import { Track, Clip, Transition, PlaybackState } from '../../types/timeline';

/**
 * Tone.js Scheduler for Timeline Playback
 * Manages audio players, clips, and transitions using Tone.js
 */
export class ToneScheduler {
  private Tone: any = null;
  private players: Map<string, any> = new Map();
  private gainNodes: Map<string, any> = new Map();
  private crossFade: any = null;
  private recorder: any = null;
  private isInitialized = false;
  private scheduledEvents: Set<string> = new Set();
  private playbackState: PlaybackState = {
    isPlaying: false,
    currentTimeSec: 0,
    isLoading: false,
    error: null
  };
  private tickCallbacks: Array<(timeSec: number) => void> = [];
  private animationFrame: number | null = null;

  /**
   * Initialize the scheduler with Tone.js
   */
  async initialize(ToneInstance: any): Promise<void> {
    this.Tone = ToneInstance;
    
    try {
      // Start Tone.js (requires user gesture)
      await this.Tone.start();
      
      // Create master crossfade node
      this.crossFade = new this.Tone.CrossFade(0).toDestination();
      
      // Create recorder
      this.recorder = new this.Tone.Recorder();
      this.Tone.getDestination().connect(this.recorder);
      
      this.isInitialized = true;
      this.updatePlaybackState({ error: null });
    } catch (error) {
      this.updatePlaybackState({ 
        error: error instanceof Error ? error.message : 'Failed to initialize audio engine' 
      });
      throw error;
    }
  }

  /**
   * Build audio players for tracks
   */
  async buildPlayers(tracks: Track[]): Promise<{ [trackId: string]: any }> {
    if (!this.isInitialized || !this.Tone) {
      throw new Error('Scheduler not initialized');
    }

    this.updatePlaybackState({ isLoading: true });
    const playerMap: { [trackId: string]: any } = {};
    
    try {
      // Clean up existing players
      this.cleanup();

      // Create players for each track
      for (const track of tracks) {
        // Create gain node for volume control
        const gainNode = new this.Tone.Gain(1.0);
        this.gainNodes.set(track.id, gainNode);

        // Create player
        const player = new this.Tone.Player({
          url: track.url,
          autostart: false,
          onload: () => {
            console.log(`Track ${track.name} loaded successfully`);
          },
          onerror: (error: any) => {
            console.error(`Failed to load track ${track.name}:`, error);
            this.updatePlaybackState({ 
              error: `Failed to load ${track.name}: ${error.message || 'Network error'}` 
            });
          }
        });

        // Connect: Player -> Gain -> CrossFade channel
        player.connect(gainNode);
        
        // Connect to appropriate crossfade channel
        if (track.id.includes('track-a')) {
          gainNode.connect(this.crossFade.a);
        } else if (track.id.includes('track-b')) {
          gainNode.connect(this.crossFade.b);
        } else {
          // For additional tracks, connect directly to destination
          gainNode.toDestination();
        }

        this.players.set(track.id, player);
        playerMap[track.id] = player;
      }

      this.updatePlaybackState({ isLoading: false });
      return playerMap;
    } catch (error) {
      this.updatePlaybackState({ 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to build players'
      });
      throw error;
    }
  }

  /**
   * Schedule clips to play at specific times
   */
  scheduleClips(clips: Clip[]): void {
    if (!this.isInitialized || !this.Tone) {
      throw new Error('Scheduler not initialized');
    }

    // Clear existing scheduled events
    this.clearScheduledEvents();

    clips.forEach(clip => {
      const player = this.players.get(clip.trackId);
      const gainNode = this.gainNodes.get(clip.trackId);
      
      if (!player || !gainNode) {
        console.warn(`Player not found for track ${clip.trackId}`);
        return;
      }

      // Schedule clip start
      const startEventId = `clip-start-${clip.id}`;
      this.Tone.Transport.scheduleOnce((time: number) => {
        console.log(`Starting clip ${clip.id} at time ${time}`);
        
        // Set volume
        gainNode.gain.value = clip.volume;
        
        // Start player from specified offset
        player.start(time, clip.offsetSec, clip.durationSec);
      }, clip.startSec);
      
      this.scheduledEvents.add(startEventId);

      // Schedule clip stop (automatic with duration, but good to track)
      const stopEventId = `clip-stop-${clip.id}`;
      this.Tone.Transport.scheduleOnce((time: number) => {
        console.log(`Clip ${clip.id} ended at time ${time}`);
      }, clip.startSec + clip.durationSec);
      
      this.scheduledEvents.add(stopEventId);
    });
  }

  /**
   * Schedule transitions (crossfades, effects)
   */
  scheduleTransitions(transitions: Transition[]): void {
    if (!this.isInitialized || !this.Tone) {
      throw new Error('Scheduler not initialized');
    }

    transitions.forEach(transition => {
      switch (transition.type) {
        case 'crossfade':
          this.scheduleCrossfade(transition);
          break;
        case 'filter':
          this.scheduleFilter(transition);
          break;
        case 'cut':
          this.scheduleCut(transition);
          break;
        default:
          console.warn(`Unsupported transition type: ${transition.type}`);
      }
    });
  }

  /**
   * Schedule a crossfade transition
   */
  private scheduleCrossfade(transition: Transition): void {
    const trackAGain = this.gainNodes.get(transition.trackAId);
    const trackBGain = this.gainNodes.get(transition.trackBId);
    
    if (!trackAGain || !trackBGain) {
      console.warn(`Gain nodes not found for transition ${transition.id}`);
      return;
    }

    // Schedule volume automation points
    if (transition.parameters.volumeAutomation) {
      transition.parameters.volumeAutomation.forEach(point => {
        const absoluteTime = transition.startSec + point.timeSec;
        
        const eventId = `crossfade-${transition.id}-${point.timeSec}`;
        this.Tone.Transport.scheduleOnce((time: number) => {
          console.log(`Crossfade automation at time ${time}: A=${point.trackAGain}, B=${point.trackBGain}`);
          
          // Apply crossfade curve
          const curve = transition.parameters.curve || 'linear';
          const rampTime = 0.1; // Small ramp to avoid clicks
          
          if (curve === 'exponential') {
            trackAGain.gain.exponentialRampToValueAtTime(point.trackAGain, time + rampTime);
            trackBGain.gain.exponentialRampToValueAtTime(point.trackBGain, time + rampTime);
          } else {
            trackAGain.gain.linearRampToValueAtTime(point.trackAGain, time + rampTime);
            trackBGain.gain.linearRampToValueAtTime(point.trackBGain, time + rampTime);
          }
          
          // Update crossfade if using shared crossfade node
          if (this.crossFade) {
            this.crossFade.fade.linearRampToValueAtTime(point.trackBGain, time + rampTime);
          }
        }, absoluteTime);
        
        this.scheduledEvents.add(eventId);
      });
    } else {
      // Default crossfade: A->B over transition duration
      this.scheduleDefaultCrossfade(transition);
    }
  }

  /**
   * Schedule default crossfade from A to B
   */
  private scheduleDefaultCrossfade(transition: Transition): void {
    if (!this.crossFade) return;

    const eventId = `default-crossfade-${transition.id}`;
    this.Tone.Transport.scheduleOnce((time: number) => {
      console.log(`Starting default crossfade at time ${time} for ${transition.durationSec}s`);
      
      // Ramp crossfade from 0 (Track A) to 1 (Track B)
      this.crossFade.fade.linearRampToValueAtTime(1, time + transition.durationSec);
    }, transition.startSec);
    
    this.scheduledEvents.add(eventId);
  }

  /**
   * Schedule filter effects
   */
  private scheduleFilter(transition: Transition): void {
    // Filter effects would require additional audio nodes
    // For now, log the transition
    console.log(`Filter transition scheduled: ${transition.id} at ${transition.startSec}s`);
  }

  /**
   * Schedule cut transitions
   */
  private scheduleCut(transition: Transition): void {
    const trackAGain = this.gainNodes.get(transition.trackAId);
    const trackBGain = this.gainNodes.get(transition.trackBId);
    
    if (!trackAGain || !trackBGain) return;

    const eventId = `cut-${transition.id}`;
    this.Tone.Transport.scheduleOnce((time: number) => {
      console.log(`Cut transition at time ${time}`);
      
      // Instant cut: A off, B on
      trackAGain.gain.setValueAtTime(0, time);
      trackBGain.gain.setValueAtTime(1, time);
      
      if (this.crossFade) {
        this.crossFade.fade.setValueAtTime(1, time);
      }
    }, transition.startSec);
    
    this.scheduledEvents.add(eventId);
  }

  /**
   * Start playback
   */
  play(): void {
    if (!this.isInitialized || !this.Tone) {
      throw new Error('Scheduler not initialized');
    }

    try {
      // Start transport
      this.Tone.Transport.start();
      this.updatePlaybackState({ isPlaying: true });
      
      // Start animation frame updates
      this.startTicker();
      
      console.log('Playback started');
    } catch (error) {
      this.updatePlaybackState({ 
        error: error instanceof Error ? error.message : 'Failed to start playback' 
      });
      throw error;
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isInitialized || !this.Tone) return;

    try {
      this.Tone.Transport.pause();
      this.updatePlaybackState({ isPlaying: false });
      this.stopTicker();
      
      console.log('Playback paused');
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  }

  /**
   * Stop playback and reset
   */
  stop(): void {
    if (!this.isInitialized || !this.Tone) return;

    try {
      // Stop transport
      this.Tone.Transport.stop();
      this.Tone.Transport.cancel();
      
      // Stop all players
      this.players.forEach(player => {
        try {
          player.stop();
        } catch (e) {
          console.warn('Error stopping player:', e);
        }
      });

      // Reset crossfade
      if (this.crossFade) {
        this.crossFade.fade.value = 0;
      }

      // Reset gain nodes
      this.gainNodes.forEach(gainNode => {
        gainNode.gain.value = 1.0;
      });

      this.updatePlaybackState({ 
        isPlaying: false,
        currentTimeSec: 0 
      });
      this.stopTicker();
      
      console.log('Playback stopped and reset');
    } catch (error) {
      console.error('Failed to stop:', error);
    }
  }

  /**
   * Seek to specific time
   */
  seek(timeSec: number): void {
    if (!this.isInitialized || !this.Tone) return;

    try {
      const wasPlaying = this.playbackState.isPlaying;
      
      // Stop current playback
      if (wasPlaying) {
        this.stop();
      }

      // Set transport time
      this.Tone.Transport.seconds = timeSec;
      this.updatePlaybackState({ currentTimeSec: timeSec });

      // Resume if was playing
      if (wasPlaying) {
        // Small delay to prevent audio glitches
        setTimeout(() => this.play(), 50);
      }
      
      console.log(`Seeked to ${timeSec}s`);
    } catch (error) {
      console.error('Failed to seek:', error);
    }
  }

  /**
   * Set crossfade value (0 = Track A, 1 = Track B)
   */
  setCrossfade(value: number): void {
    if (this.crossFade) {
      this.crossFade.fade.value = Math.max(0, Math.min(1, value));
    }
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    if (!this.recorder) {
      throw new Error('Recorder not available');
    }

    try {
      this.recorder.start();
      console.log('Recording started');
    } catch (error) {
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop recording and return blob
   */
  async stopRecording(): Promise<Blob> {
    if (!this.recorder) {
      throw new Error('Recorder not available');
    }

    try {
      const recording = await this.recorder.stop();
      console.log('Recording stopped');
      return recording;
    } catch (error) {
      throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Register callback for playback time updates
   */
  onTick(callback: (timeSec: number) => void): () => void {
    this.tickCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.tickCallbacks.indexOf(callback);
      if (index > -1) {
        this.tickCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  /**
   * Start ticker for real-time updates
   */
  private startTicker(): void {
    const tick = () => {
      if (!this.isInitialized || !this.Tone || !this.playbackState.isPlaying) {
        return;
      }

      const currentTime = this.Tone.Transport.seconds;
      this.updatePlaybackState({ currentTimeSec: currentTime });
      
      // Notify callbacks
      this.tickCallbacks.forEach(callback => {
        try {
          callback(currentTime);
        } catch (error) {
          console.error('Tick callback error:', error);
        }
      });

      this.animationFrame = requestAnimationFrame(tick);
    };

    this.animationFrame = requestAnimationFrame(tick);
  }

  /**
   * Stop ticker
   */
  private stopTicker(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Update playback state and notify if needed
   */
  private updatePlaybackState(updates: Partial<PlaybackState>): void {
    this.playbackState = { ...this.playbackState, ...updates };
  }

  /**
   * Clear all scheduled events
   */
  private clearScheduledEvents(): void {
    if (this.Tone?.Transport) {
      this.Tone.Transport.cancel();
    }
    this.scheduledEvents.clear();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    try {
      this.stopTicker();
      this.clearScheduledEvents();

      // Stop and dispose players
      this.players.forEach((player, trackId) => {
        try {
          player.stop();
          player.dispose();
        } catch (e) {
          console.warn(`Error disposing player ${trackId}:`, e);
        }
      });
      this.players.clear();

      // Dispose gain nodes
      this.gainNodes.forEach((gainNode, trackId) => {
        try {
          gainNode.dispose();
        } catch (e) {
          console.warn(`Error disposing gain node ${trackId}:`, e);
        }
      });
      this.gainNodes.clear();

      // Stop transport
      if (this.Tone?.Transport) {
        this.Tone.Transport.stop();
        this.Tone.Transport.cancel();
      }

      console.log('ToneScheduler cleanup complete');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo(): Record<string, any> {
    return {
      isInitialized: this.isInitialized,
      toneContextState: this.Tone?.context?.state,
      toneSampleRate: this.Tone?.context?.sampleRate,
      transportState: this.Tone?.Transport?.state,
      transportSeconds: this.Tone?.Transport?.seconds,
      playersCount: this.players.size,
      gainNodesCount: this.gainNodes.size,
      scheduledEventsCount: this.scheduledEvents.size,
      playbackState: this.playbackState
    };
  }

  /**
   * Test audio connectivity
   */
  async testConnectivity(tracks: Track[]): Promise<{ 
    accessible: Array<{ trackId: string; name: string; accessible: boolean; error?: string }> 
  }> {
    const results = await Promise.all(
      tracks.map(async (track) => {
        try {
          const response = await fetch(track.url, { method: 'HEAD' });
          return {
            trackId: track.id,
            name: track.name,
            accessible: response.ok,
            error: response.ok ? undefined : `HTTP ${response.status}`
          };
        } catch (error) {
          return {
            trackId: track.id,
            name: track.name,
            accessible: false,
            error: error instanceof Error ? error.message : 'Network error'
          };
        }
      })
    );

    return { accessible: results };
  }
}

// Singleton instance
export const toneScheduler = new ToneScheduler();