import { supabase } from '../supabase';

// ============================================================
// STEM SEPARATION REALTIME SUBSCRIPTION
// ============================================================

export interface StemSeparationCallbacks {
  onProcessing?: (jobId: string) => void;
  onSeparationComplete?: (jobId: string, trackId: string) => void;
  onSeparationFailed?: (jobId: string, error: string) => void;
}

export function subscribeStemSeparation(
  trackId: string,
  callbacks: StemSeparationCallbacks
): () => void {
  const channel = supabase
    .channel(`stem_separation:${trackId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'stem_separation_jobs',
        filter: `track_id=eq.${trackId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        const jobId = row.id as string;
        const status = row.status as string;

        if (status === 'processing') {
          callbacks.onProcessing?.(jobId);
        } else if (status === 'completed') {
          callbacks.onSeparationComplete?.(jobId, trackId);
        } else if (status === 'failed') {
          callbacks.onSeparationFailed?.(jobId, (row.error_message as string) ?? 'Unknown error');
        }
      }
    )
    .subscribe();

  return () => { channel.unsubscribe(); };
}

// ============================================================
// STEM ANALYSIS REALTIME SUBSCRIPTION
// ============================================================

export interface StemAnalysisCallbacks {
  onAnalysisInserted?: (stemId: string, trackId: string) => void;
  onAnalysisReady?: (trackId: string) => void;
}

export function subscribeStemAnalysis(
  trackId: string,
  expectedStemCount: number,
  callbacks: StemAnalysisCallbacks
): () => void {
  const completed = new Set<string>();

  const channel = supabase
    .channel(`stem_analysis:${trackId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'stem_analysis',
        filter: `track_id=eq.${trackId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        const stemId = row.stem_id as string;
        callbacks.onAnalysisInserted?.(stemId, trackId);
        completed.add(stemId);

        if (expectedStemCount > 0 && completed.size >= expectedStemCount) {
          callbacks.onAnalysisReady?.(trackId);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'stem_analysis',
        filter: `track_id=eq.${trackId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (row.analysis_status === 'complete' || row.analysis_status === 'partial') {
          completed.add(row.stem_id as string);
          if (expectedStemCount > 0 && completed.size >= expectedStemCount) {
            callbacks.onAnalysisReady?.(trackId);
          }
        }
      }
    )
    .subscribe();

  return () => { channel.unsubscribe(); };
}

// ============================================================
// TRANSITION SCORES REALTIME SUBSCRIPTION
// ============================================================

export interface TransitionScoreCallbacks {
  onCompatibilityReady?: (trackAId: string, trackBId: string, overallScore: number) => void;
}

export function subscribeTransitionScores(
  trackAId: string,
  trackBId: string,
  callbacks: TransitionScoreCallbacks
): () => void {
  const channel = supabase
    .channel(`transition_scores:${trackAId}:${trackBId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transition_scores',
        filter: `track_a_id=eq.${trackAId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (row.track_b_id === trackBId) {
          callbacks.onCompatibilityReady?.(trackAId, trackBId, row.overall_score as number);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'transition_scores',
        filter: `track_a_id=eq.${trackAId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (row.track_b_id === trackBId) {
          callbacks.onCompatibilityReady?.(trackAId, trackBId, row.overall_score as number);
        }
      }
    )
    .subscribe();

  return () => { channel.unsubscribe(); };
}

// ============================================================
// PIPELINE STATUS HOOK (combines all three for a single track pair)
// ============================================================

export type PipelineStage =
  | 'idle'
  | 'separating'
  | 'analyzing'
  | 'computing_compatibility'
  | 'ready'
  | 'error';

export interface PipelineStatusCallbacks {
  onStageChange: (stage: PipelineStage, detail?: string) => void;
}

export function subscribePipelineStatus(
  trackId: string,
  pairedTrackId: string | null,
  expectedStemCount: number,
  callbacks: PipelineStatusCallbacks
): () => void {
  const unsubSep = subscribeStemSeparation(trackId, {
    onProcessing: () => callbacks.onStageChange('separating'),
    onSeparationComplete: () => callbacks.onStageChange('analyzing'),
    onSeparationFailed: (_, err) => callbacks.onStageChange('error', err),
  });

  const unsubAnalysis = subscribeStemAnalysis(trackId, expectedStemCount, {
    onAnalysisReady: () => {
      if (pairedTrackId) {
        callbacks.onStageChange('computing_compatibility');
      } else {
        callbacks.onStageChange('ready');
      }
    },
  });

  let unsubScores: (() => void) | null = null;
  if (pairedTrackId) {
    unsubScores = subscribeTransitionScores(trackId, pairedTrackId, {
      onCompatibilityReady: () => callbacks.onStageChange('ready'),
    });
  }

  return () => {
    unsubSep();
    unsubAnalysis();
    unsubScores?.();
  };
}
