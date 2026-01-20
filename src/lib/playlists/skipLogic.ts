import { aiService, AI_CREDITS_COST } from '../ai/aiService';
import { templateMatcher } from '../ai/templateMatcher';

export type SkipType = 'single' | 'double';
export type TransitionType = 'ai_smooth' | 'hard_cut' | 'simple_crossfade';

export interface SkipEvent {
  type: SkipType;
  currentTrackId: string;
  nextTrackId: string;
  timestamp: number;
  transitionType: TransitionType;
  transitionDuration: number;
}

export interface SkipResult {
  success: boolean;
  transitionType: TransitionType;
  transitionDuration: number;
  templateId?: string;
  errorMessage?: string;
}

class SkipLogicHandler {
  private lastTapTime: number = 0;
  private readonly DOUBLE_TAP_THRESHOLD = 300;

  detectTapType(callback: (tapType: SkipType) => void): () => void {
    const handleTap = () => {
      const now = Date.now();
      const timeSinceLastTap = now - this.lastTapTime;

      if (timeSinceLastTap < this.DOUBLE_TAP_THRESHOLD) {
        callback('double');
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
        setTimeout(() => {
          if (this.lastTapTime === now) {
            callback('single');
            this.lastTapTime = 0;
          }
        }, this.DOUBLE_TAP_THRESHOLD);
      }
    };

    return handleTap;
  }

  async handleSkip(
    userId: string,
    skipType: SkipType,
    currentTrackData: any,
    nextTrackData: any,
    hasCredits: boolean
  ): Promise<SkipResult> {
    if (skipType === 'double') {
      return this.performHardCut();
    }

    if (skipType === 'single' && hasCredits) {
      return await this.performAISmootShip(userId, currentTrackData, nextTrackData);
    }

    return this.performSimpleCrossfade();
  }

  private performHardCut(): SkipResult {
    return {
      success: true,
      transitionType: 'hard_cut',
      transitionDuration: 0,
    };
  }

  private performSimpleCrossfade(): SkipResult {
    return {
      success: true,
      transitionType: 'simple_crossfade',
      transitionDuration: 3,
    };
  }

  private async performAISmootShip(
    userId: string,
    currentTrackData: any,
    nextTrackData: any
  ): Promise<SkipResult> {
    try {
      const hasCredits = await aiService.checkCreditsAvailable(
        userId,
        AI_CREDITS_COST.SKIP_TRANSITION
      );

      if (!hasCredits) {
        return this.performSimpleCrossfade();
      }

      const currentAnalysis = currentTrackData.analysis || {};
      const nextAnalysis = nextTrackData.analysis || {};

      if (!currentAnalysis.bpm || !nextAnalysis.bpm) {
        return this.performSimpleCrossfade();
      }

      const bpmDiff = Math.abs(currentAnalysis.bpm - nextAnalysis.bpm);
      let transitionDuration = 4;

      if (bpmDiff > 20) {
        transitionDuration = 8;
      } else if (bpmDiff > 10) {
        transitionDuration = 6;
      }

      const keyCompatible = this.checkKeyCompatibility(
        currentAnalysis.key,
        nextAnalysis.key
      );

      if (keyCompatible) {
        transitionDuration += 2;
      }

      return {
        success: true,
        transitionType: 'ai_smooth',
        transitionDuration,
      };
    } catch (error) {
      console.error('AI skip failed:', error);
      return this.performSimpleCrossfade();
    }
  }

  private checkKeyCompatibility(key1?: string, key2?: string): boolean {
    if (!key1 || !key2) return false;

    const compatibleKeys: Record<string, string[]> = {
      'Cmaj': ['Cmaj', 'Amin', 'Gmaj', 'Emin'],
      'Amin': ['Amin', 'Cmaj', 'Emin', 'Gmaj'],
      'Gmaj': ['Gmaj', 'Emin', 'Dmaj', 'Bmin'],
      'Dmaj': ['Dmaj', 'Bmin', 'Amaj', 'F#min'],
    };

    const key1Normalized = key1.replace(' ', '').replace('major', 'maj').replace('minor', 'min');
    const key2Normalized = key2.replace(' ', '').replace('major', 'maj').replace('minor', 'min');

    const compatible = compatibleKeys[key1Normalized] || [];
    return compatible.includes(key2Normalized);
  }

  calculateCrossfadePoints(
    currentTrackDuration: number,
    transitionDuration: number
  ): { startFadeOut: number; startFadeIn: number } {
    const startFadeOut = Math.max(0, currentTrackDuration - transitionDuration);
    const startFadeIn = 0;

    return {
      startFadeOut,
      startFadeIn,
    };
  }

  createSkipHistory(): SkipEvent[] {
    const history: SkipEvent[] = [];
    return history;
  }

  logSkipEvent(event: SkipEvent): void {
    const history = this.createSkipHistory();
    history.push(event);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skip_history', JSON.stringify(history.slice(-50)));
    }
  }

  getSkipHistory(): SkipEvent[] {
    if (typeof localStorage === 'undefined') return [];

    try {
      const stored = localStorage.getItem('skip_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

export const skipLogicHandler = new SkipLogicHandler();
