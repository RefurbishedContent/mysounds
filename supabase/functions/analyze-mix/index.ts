import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function log(level: string, requestId: string, message: string, data?: unknown) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    requestId,
    message,
    ...(data !== undefined ? { data } : {}),
  }));
}

interface StemAnalysis {
  stem_type: string;
  bpm: number | null;
  key: string;
  energy_level: number;
  rms_volume: number;
  harmonic_content: boolean;
  mixability_score: number;
  spectral_centroid: number;
  transient_density: number;
  frequency_range: { low: number; high: number };
}

const CAMELOT_WHEEL: Record<string, number> = {
  'Abm': 1, 'G#m': 1, 'Ebm': 2, 'D#m': 2, 'Bbm': 3, 'A#m': 3,
  'Fm': 4, 'Cm': 5, 'Gm': 6, 'Dm': 7, 'Am': 8, 'Em': 9,
  'Bm': 10, 'F#m': 11, 'Gbm': 11, 'C#m': 12, 'Dbm': 12,
  'B': 1, 'Cb': 1, 'F#': 2, 'Gb': 2, 'Db': 3, 'C#': 3,
  'Ab': 4, 'G#': 4, 'Eb': 5, 'D#': 5, 'Bb': 6, 'A#': 6,
  'F': 7, 'C': 8, 'G': 9, 'D': 10, 'A': 11, 'E': 12,
};

const RELATIVE_PAIRS: Record<string, string> = {
  'C': 'Am', 'G': 'Em', 'D': 'Bm', 'A': 'F#m', 'E': 'C#m', 'B': 'G#m',
  'F#': 'D#m', 'Db': 'Bbm', 'Ab': 'Fm', 'Eb': 'Cm', 'Bb': 'Gm', 'F': 'Dm',
  'Am': 'C', 'Em': 'G', 'Bm': 'D', 'F#m': 'A', 'C#m': 'E', 'G#m': 'B',
  'D#m': 'F#', 'Bbm': 'Db', 'Fm': 'Ab', 'Cm': 'Eb', 'Gm': 'Bb', 'Dm': 'F',
};

function keyCompatibility(keyA: string, keyB: string): number {
  if (!keyA || !keyB) return 0.5;
  if (keyA === keyB) return 1.0;
  if (RELATIVE_PAIRS[keyA] === keyB) return 0.9;

  const posA = CAMELOT_WHEEL[keyA];
  const posB = CAMELOT_WHEEL[keyB];
  if (!posA || !posB) return 0.3;

  const diff = Math.min(Math.abs(posA - posB), 12 - Math.abs(posA - posB));
  if (diff === 1) return 0.8;
  if (diff === 2) return 0.6;
  return 0.2;
}

function bpmProximity(bpmA: number | null, bpmB: number | null): number {
  if (!bpmA || !bpmB) return 0.5;
  if (Math.abs(bpmA - bpmB) <= 1) return 1.0;

  const ratio = bpmA / bpmB;
  if (Math.abs(ratio - 1) <= 0.03) return 0.8;
  if (Math.abs(ratio - 2) <= 0.05 || Math.abs(ratio - 0.5) <= 0.025) return 0.7;
  if (Math.abs(ratio - 1) <= 0.06) return 0.5;
  return 0.2;
}

function energyDelta(eA: number, eB: number): number {
  const delta = Math.abs(eA - eB);
  return Math.max(0, 1.0 - delta * 2);
}

function spectralOverlap(
  rangeA: { low: number; high: number },
  rangeB: { low: number; high: number }
): number {
  const overlapLow = Math.max(rangeA.low, rangeB.low);
  const overlapHigh = Math.min(rangeA.high, rangeB.high);
  if (overlapHigh <= overlapLow) return 0;
  const overlapSpan = overlapHigh - overlapLow;
  const totalSpan = Math.max(rangeA.high, rangeB.high) - Math.min(rangeA.low, rangeB.low);
  return overlapSpan / totalSpan;
}

function transientAlignment(tdA: number, tdB: number): number {
  return Math.max(0, 1.0 - Math.abs(tdA - tdB));
}

function harmonicCompatibility(hA: boolean, hB: boolean): number {
  if (hA && hB) return 1.0;
  if (!hA && !hB) return 0.8;
  return 0.5;
}

function rmsBalance(rmsA: number, rmsB: number): number {
  if (rmsA === 0 && rmsB === 0) return 1.0;
  const ratio = Math.min(rmsA, rmsB) / Math.max(rmsA, rmsB + 0.0001);
  return Math.min(1.0, ratio * 1.5);
}

function scoreStemPair(a: StemAnalysis, b: StemAnalysis): number {
  return (
    keyCompatibility(a.key, b.key)                               * 0.25 +
    bpmProximity(a.bpm, b.bpm)                                   * 0.20 +
    energyDelta(a.energy_level, b.energy_level)                  * 0.15 +
    spectralOverlap(a.frequency_range, b.frequency_range)        * 0.15 +
    transientAlignment(a.transient_density, b.transient_density) * 0.10 +
    harmonicCompatibility(a.harmonic_content, b.harmonic_content)* 0.10 +
    rmsBalance(a.rms_volume, b.rms_volume)                       * 0.05
  );
}

type TransitionType =
  | 'harmonic_mix' | 'bass_swap' | 'acapella_over_instrumental' | 'drop_swap'
  | 'filter_fade' | 'echo_out' | 'breakdown_blend' | 'drum_swap'
  | 'stem_by_stem_crossfade' | 'cold_cut';

function selectTransitionType(
  stemScores: Record<string, number>,
  analysisA: StemAnalysis[],
  analysisB: StemAnalysis[]
): Array<{ type: TransitionType; confidence: number }> {
  const get = (arr: StemAnalysis[], type: string) => arr.find((s) => s.stem_type === type);
  const drumsA = get(analysisA, 'drums');
  const drumsB = get(analysisB, 'drums');
  const bassA = get(analysisA, 'bass');
  const bassB = get(analysisB, 'bass');
  const vocalsA = get(analysisA, 'vocals');
  const melodyB = get(analysisB, 'melody');

  const avgScore = Object.values(stemScores).reduce((a, b) => a + b, 0) /
    Math.max(1, Object.values(stemScores).length);

  const keyScore = stemScores['vocals'] ?? stemScores['melody'] ?? 0.5;
  const bpmScoreVal = drumsA && drumsB ? bpmProximity(drumsA.bpm, drumsB.bpm) : 0.5;
  const energyA = analysisA.reduce((s, x) => s + x.energy_level, 0) / Math.max(1, analysisA.length);
  const energyB = analysisB.reduce((s, x) => s + x.energy_level, 0) / Math.max(1, analysisB.length);

  const candidates: Array<{ type: TransitionType; confidence: number }> = [];

  if (keyScore >= 0.8 && bpmScoreVal >= 0.8 && Math.abs(energyA - energyB) < 0.2) {
    candidates.push({ type: 'harmonic_mix', confidence: 0.6 + keyScore * 0.3 + bpmScoreVal * 0.1 });
  }

  if (bassA && bassB && (stemScores['bass'] ?? 0) >= 0.6 && bpmScoreVal >= 0.6) {
    candidates.push({ type: 'bass_swap', confidence: 0.5 + (stemScores['bass'] ?? 0) * 0.4 });
  }

  if (vocalsA && (vocalsA.harmonic_content) && melodyB && (stemScores['melody'] ?? 0) >= 0.5) {
    candidates.push({ type: 'acapella_over_instrumental', confidence: 0.5 + (stemScores['vocals'] ?? 0) * 0.4 });
  }

  if (drumsA && drumsB && drumsA.energy_level > 0.7 && drumsB.energy_level > 0.7 &&
      drumsA.transient_density > 0.5) {
    candidates.push({ type: 'drop_swap', confidence: 0.5 + drumsA.energy_level * 0.4 });
  }

  if (energyA > 0.7 && energyB < 0.4) {
    candidates.push({ type: 'echo_out', confidence: 0.6 + (energyA - energyB) * 0.3 });
  }

  const melodyA = get(analysisA, 'melody');
  if (melodyA && melodyB && melodyA.energy_level < 0.4 && melodyB.energy_level < 0.4) {
    candidates.push({ type: 'breakdown_blend', confidence: 0.55 });
  }

  if (drumsA && drumsB && (stemScores['drums'] ?? 0) < 0.5 &&
      (stemScores['melody'] ?? stemScores['vocals'] ?? 0) < 0.4) {
    candidates.push({ type: 'drum_swap', confidence: 0.5 });
  }

  if (avgScore >= 0.5 && avgScore < 0.75 && candidates.length < 2) {
    candidates.push({ type: 'stem_by_stem_crossfade', confidence: 0.4 + avgScore * 0.4 });
  }

  if (keyScore >= 0.9 && bpmScoreVal >= 0.9 && energyA > 0.6 && energyB > 0.6) {
    candidates.push({ type: 'cold_cut', confidence: 0.7 + bpmScoreVal * 0.2 });
  }

  candidates.push({ type: 'filter_fade', confidence: 0.3 + avgScore * 0.3 });

  return candidates.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

function buildStemInstructions(
  transitionType: TransitionType,
  mixPointMs: number,
  durationMs: number
): Record<string, unknown> {
  const endMs = mixPointMs + durationMs;
  const midMs = mixPointMs + durationMs / 2;

  const base: Record<string, Record<string, unknown>> = {
    drums_A: { action: 'fade_out', curve: 'linear', start_ms: mixPointMs, end_ms: endMs },
    drums_B: { action: 'fade_in', curve: 'linear', start_ms: mixPointMs, end_ms: endMs },
    bass_A: { action: 'fade_out', curve: 'linear', start_ms: mixPointMs, end_ms: endMs },
    bass_B: { action: 'fade_in', curve: 'linear', start_ms: mixPointMs, end_ms: endMs },
    vocals_A: { action: 'fade_out', curve: 'exponential', start_ms: mixPointMs, end_ms: endMs },
    vocals_B: { action: 'none' },
    melody_A: { action: 'fade_out', curve: 'linear', start_ms: mixPointMs, end_ms: endMs },
    melody_B: { action: 'fade_in', curve: 'linear', start_ms: mixPointMs, end_ms: endMs },
    other_A: { action: 'fade_out', curve: 'linear', start_ms: midMs, end_ms: endMs },
    other_B: { action: 'fade_in', curve: 'linear', start_ms: midMs, end_ms: endMs },
  };

  if (transitionType === 'bass_swap') {
    base.bass_A = { action: 'cut', at_ms: midMs };
    base.bass_B = { action: 'cut_in', at_ms: midMs };
    base.melody_A = { action: 'low_pass_sweep', from_hz: 20000, to_hz: 500, duration_ms: durationMs };
    base.melody_B = { action: 'high_pass_release', from_hz: 2000, to_hz: 20, duration_ms: durationMs };
  } else if (transitionType === 'cold_cut') {
    return {
      drums_A: { action: 'cut', at_ms: mixPointMs },
      drums_B: { action: 'cut_in', at_ms: mixPointMs },
      bass_A: { action: 'cut', at_ms: mixPointMs },
      bass_B: { action: 'cut_in', at_ms: mixPointMs },
      vocals_A: { action: 'cut', at_ms: mixPointMs },
      vocals_B: { action: 'cut_in', at_ms: mixPointMs },
      melody_A: { action: 'cut', at_ms: mixPointMs },
      melody_B: { action: 'cut_in', at_ms: mixPointMs },
      other_A: { action: 'cut', at_ms: mixPointMs },
      other_B: { action: 'cut_in', at_ms: mixPointMs },
    };
  } else if (transitionType === 'filter_fade') {
    base.melody_A = { action: 'low_pass_sweep', from_hz: 20000, to_hz: 200, duration_ms: durationMs };
    base.melody_B = { action: 'high_pass_release', from_hz: 4000, to_hz: 20, duration_ms: durationMs };
  }

  return base;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestId = req.headers.get('X-Request-ID') ?? crypto.randomUUID();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { trackAId, trackBId } = await req.json() as {
      trackAId: string;
      trackBId: string;
    };

    if (!trackAId || !trackBId) {
      return new Response(
        JSON.stringify({ error: 'trackAId and trackBId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    log('info', requestId, 'Analyzing mix compatibility', { trackAId, trackBId });

    const { data: analysisA, error: errA } = await supabase
      .from('stem_analysis')
      .select('stem_type, bpm, key, energy_level, rms_volume, harmonic_content, mixability_score, spectral_centroid, transient_density, frequency_range')
      .eq('track_id', trackAId)
      .eq('user_id', user.id);

    const { data: analysisB, error: errB } = await supabase
      .from('stem_analysis')
      .select('stem_type, bpm, key, energy_level, rms_volume, harmonic_content, mixability_score, spectral_centroid, transient_density, frequency_range')
      .eq('track_id', trackBId)
      .eq('user_id', user.id);

    if (errA || errB || !analysisA || !analysisB) {
      return new Response(
        JSON.stringify({ error: 'Stem analysis not available for one or both tracks. Ensure stems have been analyzed first.' }),
        { status: 422, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const stemScores: Record<string, number> = {};
    const stemTypes = ['drums', 'bass', 'vocals', 'melody', 'other'];

    for (const type of stemTypes) {
      const stemA = (analysisA as StemAnalysis[]).find((s) => s.stem_type === type);
      const stemB = (analysisB as StemAnalysis[]).find((s) => s.stem_type === type);
      if (stemA && stemB) {
        stemScores[type] = scoreStemPair(stemA, stemB);
      }
    }

    const overallScore = Object.values(stemScores).length > 0
      ? Object.values(stemScores).reduce((a, b) => a + b, 0) / Object.values(stemScores).length
      : 0.5;

    const transitions = selectTransitionType(stemScores, analysisA as StemAnalysis[], analysisB as StemAnalysis[]);
    const best = transitions[0] ?? { type: 'filter_fade' as TransitionType, confidence: 0.3 };

    const trackADuration = Math.max(...(analysisA as StemAnalysis[]).map(() => 180000));
    const mixPointMs = Math.floor(trackADuration * 0.8);
    const durationMs = 16000;

    const stemInstructions = buildStemInstructions(best.type, mixPointMs, durationMs);

    await supabase
      .from('transition_scores')
      .upsert(
        {
          track_a_id: trackAId,
          track_b_id: trackBId,
          user_id: user.id,
          overall_score: overallScore,
          stem_scores: stemScores,
          best_transition_type: best.type,
          confidence: best.confidence,
          computed_at: new Date().toISOString(),
        },
        { onConflict: 'track_a_id,track_b_id,user_id' }
      );

    const { data: plan } = await supabase
      .from('mix_plans')
      .insert({
        track_a_id: trackAId,
        track_b_id: trackBId,
        user_id: user.id,
        transition_type: best.type,
        confidence: best.confidence,
        mix_point_ms: mixPointMs,
        duration_ms: durationMs,
        stem_instructions: stemInstructions,
        fx_suggestions: {
          reverb_send: { target: 'vocals_A', amount: 0.6, decay_ms: 3000 },
          delay_throw: { target: 'melody_A', feedback: 0.4, time_ms: 375 },
        },
        ai_generation_hooks: { enabled: false, requests: [] },
        alternative_transitions: transitions.slice(1),
        status: 'draft',
      })
      .select('id')
      .maybeSingle();

    log('info', requestId, 'Mix analysis complete', {
      trackAId,
      trackBId,
      overallScore,
      bestTransition: best.type,
    });

    return new Response(
      JSON.stringify({
        overallScore,
        stemScores,
        bestTransition: best.type,
        confidence: best.confidence,
        alternatives: transitions.slice(1),
        mixPlanId: plan?.id ?? null,
        mixPointMs,
        durationMs,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    log('error', requestId, 'analyze-mix error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
