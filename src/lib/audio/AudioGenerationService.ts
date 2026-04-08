import { aiGenerationConfig } from '../../config/features';

// ============================================================
// TYPES
// ============================================================

export interface TransitionFXConstraints {
  key: string;
  bpm: number;
  durationMs: number;
  energyCurve: 'ascending' | 'descending' | 'flat';
  frequencyTarget: 'low' | 'mid' | 'high' | 'mid_high';
}

export interface BridgeParams {
  keyA: string;
  keyB: string;
  bpm: number;
  durationMs: number;
  style: 'ambient' | 'rhythmic' | 'melodic';
}

export type GenerationStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'disabled';

export interface GenerationResult {
  requestId: string;
  status: GenerationStatus;
  audioBuffer: AudioBuffer | null;
  durationMs: number;
  fallbackUsed: boolean;
}

// ============================================================
// ABSTRACT INTERFACE
// ============================================================

export interface AudioGenerationService {
  generateTransitionFX(constraints: TransitionFXConstraints): Promise<GenerationResult>;
  generateMusicalBridge(params: BridgeParams): Promise<GenerationResult>;
  generateVocalDrop(text: string, style: string): Promise<GenerationResult>;
  getGenerationStatus(requestId: string): Promise<GenerationStatus>;
}

// ============================================================
// MOCK IMPLEMENTATION (active until ai_generation.enabled = true)
// ============================================================

function createSilentBuffer(audioContext: AudioContext, durationMs: number): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const frameCount = Math.ceil((durationMs / 1000) * sampleRate);
  return audioContext.createBuffer(2, frameCount, sampleRate);
}

export class MockGenerationService implements AudioGenerationService {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  async generateTransitionFX(constraints: TransitionFXConstraints): Promise<GenerationResult> {
    const requestId = crypto.randomUUID();
    console.debug('[MockGenerationService] generateTransitionFX', { requestId, constraints });

    return {
      requestId,
      status: 'disabled',
      audioBuffer: createSilentBuffer(this.getContext(), constraints.durationMs),
      durationMs: constraints.durationMs,
      fallbackUsed: true,
    };
  }

  async generateMusicalBridge(params: BridgeParams): Promise<GenerationResult> {
    const requestId = crypto.randomUUID();
    console.debug('[MockGenerationService] generateMusicalBridge', { requestId, params });

    return {
      requestId,
      status: 'disabled',
      audioBuffer: createSilentBuffer(this.getContext(), params.durationMs),
      durationMs: params.durationMs,
      fallbackUsed: true,
    };
  }

  async generateVocalDrop(text: string, style: string): Promise<GenerationResult> {
    const requestId = crypto.randomUUID();
    const durationMs = 2000;
    console.debug('[MockGenerationService] generateVocalDrop', { requestId, text, style });

    return {
      requestId,
      status: 'disabled',
      audioBuffer: createSilentBuffer(this.getContext(), durationMs),
      durationMs,
      fallbackUsed: true,
    };
  }

  async getGenerationStatus(_requestId: string): Promise<GenerationStatus> {
    return 'disabled';
  }
}

// ============================================================
// FACTORY
// ============================================================

export function createGenerationService(): AudioGenerationService {
  if (!aiGenerationConfig.enabled) {
    return new MockGenerationService();
  }
  return new MockGenerationService();
}

export const generationService = createGenerationService();
