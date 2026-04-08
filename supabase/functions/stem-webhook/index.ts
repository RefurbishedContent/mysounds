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

async function uploadStemFromUrl(
  stemUrl: string,
  trackId: string,
  userId: string,
  stemName: string
): Promise<string | null> {
  try {
    const res = await fetch(stemUrl);
    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const storagePath = `tracks/${userId}/${trackId}/stems/${stemName}.mp3`;

    const { error } = await supabase.storage
      .from('audio-uploads')
      .upload(storagePath, buffer, { contentType: 'audio/mpeg', upsert: true });

    if (error) return null;

    const { data } = supabase.storage.from('audio-uploads').getPublicUrl(storagePath);
    return data.publicUrl;
  } catch {
    return null;
  }
}

async function registerStemsInDatabase(
  trackId: string,
  userId: string,
  separationLevel: number,
  stemResults: Array<{ stemType: string; url: string | null }>,
  requestId: string
): Promise<string[]> {
  const stemIds: string[] = [];

  for (const { stemType, url } of stemResults) {
    if (!url) continue;

    const storagePath = `tracks/${userId}/${trackId}/stems/${stemType}.mp3`;

    const { data, error } = await supabase
      .from('stems')
      .upsert(
        {
          track_id: trackId,
          user_id: userId,
          stem_type: stemType,
          sub_type: '',
          separation_level: separationLevel,
          storage_path: storagePath,
          file_format: 'mp3',
        },
        { onConflict: 'track_id,stem_type,separation_level' }
      )
      .select('id')
      .maybeSingle();

    if (error) {
      log('warn', requestId, 'Failed to register stem', { stemType, error: error.message });
      continue;
    }

    if (data?.id) {
      stemIds.push(data.id as string);
    }
  }

  return stemIds;
}

async function triggerStemAnalysis(
  trackId: string,
  userId: string,
  stemIds: string[],
  requestId: string
): Promise<void> {
  if (stemIds.length === 0) return;

  try {
    const analyzeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-stems`;

    const res = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({ trackId, userId, stemIds }),
    });

    if (!res.ok) {
      const body = await res.text();
      log('warn', requestId, 'analyze-stems trigger failed', { status: res.status, body });
    } else {
      log('info', requestId, 'analyze-stems triggered', { trackId, stemCount: stemIds.length });
    }
  } catch (err) {
    log('warn', requestId, 'Could not trigger analyze-stems', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestId = req.headers.get('X-Request-ID') ?? crypto.randomUUID();

  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing jobId query parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const prediction = await req.json();

    log('info', requestId, 'Webhook received', { jobId, status: prediction.status });

    const { data: job, error: jobError } = await supabase
      .from('stem_separation_jobs')
      .select('track_id, user_id, replicate_prediction_id, stem_level')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError || !job) {
      throw new Error(`Stem job ${jobId} not found`);
    }

    if (prediction.status === 'failed' || prediction.error) {
      await supabase
        .from('stem_separation_jobs')
        .update({
          status: 'failed',
          error_message: prediction.error ?? 'Replicate prediction failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      log('error', requestId, 'Prediction failed', { jobId, error: prediction.error });

      return new Response(
        JSON.stringify({ received: true }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (prediction.status === 'succeeded' && prediction.output) {
      const output = prediction.output as Record<string, string>;
      const trackId = job.track_id as string;
      const userId = job.user_id as string;
      const separationLevel = (job.stem_level as number) ?? 1;

      const [vocalsUrl, drumsUrl, bassUrl, otherUrl] = await Promise.all([
        output.vocals ? uploadStemFromUrl(output.vocals, trackId, userId, 'vocals') : Promise.resolve(null),
        output.drums ? uploadStemFromUrl(output.drums, trackId, userId, 'drums') : Promise.resolve(null),
        output.bass ? uploadStemFromUrl(output.bass, trackId, userId, 'bass') : Promise.resolve(null),
        (output.other ?? output.no_vocals)
          ? uploadStemFromUrl(output.other ?? output.no_vocals, trackId, userId, 'other')
          : Promise.resolve(null),
      ]);

      await supabase
        .from('stem_separation_jobs')
        .update({
          status: 'completed',
          progress: 100,
          vocals_url: vocalsUrl,
          drums_url: drumsUrl,
          bass_url: bassUrl,
          other_url: otherUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      log('info', requestId, 'Stems uploaded and job completed', { jobId, trackId });

      const stemResults = [
        { stemType: 'vocals', url: vocalsUrl },
        { stemType: 'drums', url: drumsUrl },
        { stemType: 'bass', url: bassUrl },
        { stemType: 'other', url: otherUrl },
      ];

      const stemIds = await registerStemsInDatabase(
        trackId,
        userId,
        separationLevel,
        stemResults,
        requestId
      );

      log('info', requestId, 'Stems registered in database', { trackId, stemCount: stemIds.length });

      if (stemIds.length > 0) {
        EdgeRuntime.waitUntil(
          triggerStemAnalysis(trackId, userId, stemIds, requestId)
        );
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    log('error', requestId, 'Webhook processing error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
