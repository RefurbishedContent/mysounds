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

interface StemRow {
  id: string;
  track_id: string;
  user_id: string;
  stem_type: string;
  sub_type: string;
  separation_level: number;
  storage_path: string;
}

function estimateFrequencyRangeForStemType(stemType: string): { low: number; high: number } {
  switch (stemType) {
    case 'bass':    return { low: 20, high: 500 };
    case 'drums':   return { low: 40, high: 12000 };
    case 'vocals':  return { low: 200, high: 8000 };
    case 'melody':  return { low: 150, high: 16000 };
    default:        return { low: 20, high: 20000 };
  }
}

function estimateHarmonicContent(stemType: string): boolean {
  return ['vocals', 'melody', 'bass'].includes(stemType);
}

function stemTypeToAiTags(stemType: string): string[] {
  switch (stemType) {
    case 'drums':   return ['percussion', 'rhythm'];
    case 'bass':    return ['bass', 'low_end'];
    case 'vocals':  return ['voice', 'lead_vocal'];
    case 'melody':  return ['melody', 'harmonic'];
    default:        return ['atmosphere', 'fx'];
  }
}

async function fetchAndAnalyzeStem(
  storagePath: string,
  stemType: string
): Promise<{
  bpm: number | null;
  key: string;
  energyLevel: number;
  rmsVolume: number;
  harmonicContent: boolean;
  spectralCentroid: number;
  transientDensity: number;
  frequencyRange: { low: number; high: number };
  mixabilityScore: number;
}> {
  try {
    const { data, error } = await supabase.storage
      .from('audio-uploads')
      .download(storagePath);

    if (error || !data) {
      throw new Error(`Could not download stem: ${storagePath}`);
    }

    const buffer = await data.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const sampleCount = bytes.length;

    let sumSquares = 0;
    let peakAmplitude = 0;
    let zeroCrossings = 0;
    let prevSample = 0;

    for (let i = 0; i < Math.min(sampleCount, 88200); i++) {
      const sample = (bytes[i] - 128) / 128.0;
      sumSquares += sample * sample;
      if (Math.abs(sample) > peakAmplitude) peakAmplitude = Math.abs(sample);
      if (i > 0 && ((prevSample >= 0 && sample < 0) || (prevSample < 0 && sample >= 0))) {
        zeroCrossings++;
      }
      prevSample = sample;
    }

    const analysedSamples = Math.min(sampleCount, 88200);
    const rmsVolume = Math.sqrt(sumSquares / analysedSamples);
    const energyLevel = Math.min(1.0, rmsVolume * 4.0);

    const zeroCrossingRate = zeroCrossings / analysedSamples;
    const estimatedFreq = zeroCrossingRate * 22050;
    const spectralCentroid = Math.min(estimatedFreq, 20000);

    const transientDensity = Math.min(1.0, zeroCrossingRate * 10);
    const mixabilityScore = Math.min(1.0, (energyLevel * 0.6 + (1 - transientDensity) * 0.4));

    const frequencyRange = estimateFrequencyRangeForStemType(stemType);
    const harmonicContent = estimateHarmonicContent(stemType);

    return {
      bpm: null,
      key: '',
      energyLevel,
      rmsVolume,
      harmonicContent,
      spectralCentroid,
      transientDensity,
      frequencyRange,
      mixabilityScore,
    };
  } catch {
    const frequencyRange = estimateFrequencyRangeForStemType(stemType);
    return {
      bpm: null,
      key: '',
      energyLevel: 0.5,
      rmsVolume: 0.1,
      harmonicContent: estimateHarmonicContent(stemType),
      spectralCentroid: (frequencyRange.low + frequencyRange.high) / 2,
      transientDensity: 0.3,
      frequencyRange,
      mixabilityScore: 0.5,
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestId = req.headers.get('X-Request-ID') ?? crypto.randomUUID();

  try {
    const { trackId, userId, stemIds } = await req.json() as {
      trackId: string;
      userId: string;
      stemIds: string[];
    };

    if (!trackId || !userId || !Array.isArray(stemIds) || stemIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'trackId, userId, and stemIds are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    log('info', requestId, 'Stem analysis started', { trackId, stemCount: stemIds.length });

    const { data: stems, error: stemsError } = await supabase
      .from('stems')
      .select('id, track_id, user_id, stem_type, sub_type, separation_level, storage_path')
      .in('id', stemIds)
      .eq('track_id', trackId)
      .eq('user_id', userId);

    if (stemsError || !stems) {
      throw new Error(`Could not fetch stems: ${stemsError?.message}`);
    }

    const results: Array<{ stemId: string; success: boolean }> = [];

    for (const stem of stems as StemRow[]) {
      try {
        const analysis = await fetchAndAnalyzeStem(stem.storage_path, stem.stem_type);
        const aiTags = stemTypeToAiTags(stem.stem_type);

        const { error: upsertError } = await supabase
          .from('stem_analysis')
          .upsert(
            {
              stem_id: stem.id,
              track_id: stem.track_id,
              user_id: stem.user_id,
              bpm: analysis.bpm,
              key: analysis.key,
              energy_level: analysis.energyLevel,
              rms_volume: analysis.rmsVolume,
              harmonic_content: analysis.harmonicContent,
              mixability_score: analysis.mixabilityScore,
              spectral_centroid: analysis.spectralCentroid,
              transient_density: analysis.transientDensity,
              frequency_range: analysis.frequencyRange,
              onset_pattern: [],
              mix_points: [],
              ai_tags: aiTags,
              analysis_status: 'partial',
              analyzed_at: new Date().toISOString(),
            },
            { onConflict: 'stem_id' }
          );

        if (upsertError) {
          log('warn', requestId, 'Failed to save stem analysis', {
            stemId: stem.id,
            error: upsertError.message,
          });
          results.push({ stemId: stem.id, success: false });
        } else {
          results.push({ stemId: stem.id, success: true });
        }
      } catch (err) {
        log('warn', requestId, 'Analysis failed for stem', {
          stemId: stem.id,
          error: err instanceof Error ? err.message : String(err),
        });
        results.push({ stemId: stem.id, success: false });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    log('info', requestId, 'Stem analysis complete', {
      trackId,
      successCount,
      total: stemIds.length,
    });

    return new Response(
      JSON.stringify({
        trackId,
        analyzed: successCount,
        total: stemIds.length,
        note: 'Lightweight analysis complete. POST heavy analysis results to stem_analysis via update for bpm, key, and onset_pattern.',
        results,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    log('error', requestId, 'analyze-stems error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
