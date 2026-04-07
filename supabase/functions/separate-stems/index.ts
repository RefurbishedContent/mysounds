import { createClient } from 'npm:@supabase/supabase-js@2';

interface SeparateStemsRequest {
  trackId: string;
  userId: string;
  stemLevel: 1 | 2 | 3;
}

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

function getModelForLevel(stemLevel: number): string {
  if (stemLevel === 3) return 'htdemucs_6s';
  if (stemLevel === 2) return 'htdemucs';
  return 'htdemucs_ft';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestId = req.headers.get('X-Request-ID') ?? crypto.randomUUID();

  try {
    const { trackId, userId, stemLevel }: SeparateStemsRequest = await req.json();

    log('info', requestId, 'Stem separation requested', { trackId, userId, stemLevel });

    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, url, status, user_id')
      .eq('id', trackId)
      .eq('user_id', userId)
      .maybeSingle();

    if (trackError || !track) {
      throw new Error('Track not found or access denied');
    }

    if (track.status !== 'ready') {
      throw new Error(`Track is not ready for stem separation (status: ${track.status})`);
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('plan')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      throw new Error('User not found');
    }

    const planStemAccess: Record<string, number> = {
      free: 0,
      pro: 1,
      premium: 2,
      admin: 3,
    };

    const maxLevel = planStemAccess[user.plan] ?? 0;
    if (stemLevel > maxLevel) {
      throw new Error(`Stem level ${stemLevel} requires a higher subscription tier`);
    }

    const { data: job, error: jobError } = await supabase
      .from('stem_separation_jobs')
      .insert({
        track_id: trackId,
        user_id: userId,
        status: 'pending',
        stem_level: stemLevel,
        progress: 0,
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create stem job: ${jobError.message}`);
    }

    const replicateApiKey = Deno.env.get('REPLICATE_API_KEY');

    if (!replicateApiKey) {
      log('warn', requestId, 'REPLICATE_API_KEY not configured — job created in pending state');

      return new Response(
        JSON.stringify({
          jobId: job.id,
          status: 'pending',
          message: 'Replicate API key not configured. Job queued and will process once configured.',
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/stem-webhook`;
    const model = getModelForLevel(stemLevel);

    const predictionRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${replicateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'cd128044253523a9e1f2c2a84c1e6af5e1da61e22b77b2b6c8e32ca8f0b1f38d',
        input: {
          audio: track.url,
          model: model,
          stem: stemLevel >= 2 ? 'none' : 'vocals',
          shifts: 1,
          overlap: 0.25,
          clip_mode: 'rescale',
          mp3_bitrate: 320,
          mp3_preset: 2,
          output_format: 'mp3',
        },
        webhook: `${webhookUrl}?jobId=${job.id}`,
        webhook_events_filter: ['completed', 'failed'],
      }),
    });

    if (!predictionRes.ok) {
      const errBody = await predictionRes.text();
      log('warn', requestId, 'Replicate prediction creation failed', { status: predictionRes.status, body: errBody });

      await supabase
        .from('stem_separation_jobs')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', job.id);

      return new Response(
        JSON.stringify({
          jobId: job.id,
          status: 'pending',
          message: 'Prediction queued — Replicate submission will be retried.',
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const prediction = await predictionRes.json();
    const predictionId: string = prediction.id;

    await supabase
      .from('stem_separation_jobs')
      .update({
        replicate_prediction_id: predictionId,
        status: 'processing',
        progress: 5,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    log('info', requestId, 'Replicate prediction created', { predictionId, jobId: job.id });

    return new Response(
      JSON.stringify({ jobId: job.id, predictionId, status: 'processing' }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    log('error', requestId, 'Stem separation error', { error: error instanceof Error ? error.message : String(error) });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Stem separation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
