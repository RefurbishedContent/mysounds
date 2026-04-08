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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestId = req.headers.get('X-Request-ID') ?? crypto.randomUUID();

  try {
    const url = new URL(req.url);
    const trackId = url.searchParams.get('trackId');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!trackId) {
      return new Response(
        JSON.stringify({ error: 'trackId query parameter is required' }),
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

    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, user_id, title, artist, duration_ms')
      .eq('id', trackId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (trackError || !track) {
      return new Response(
        JSON.stringify({ error: 'Track not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { data: stems, error: stemsError } = await supabase
      .from('stems')
      .select(`
        id,
        stem_type,
        sub_type,
        separation_level,
        storage_path,
        file_format,
        duration_ms,
        created_at,
        stem_analysis (
          id,
          bpm,
          key,
          energy_level,
          rms_volume,
          harmonic_content,
          mixability_score,
          spectral_centroid,
          transient_density,
          frequency_range,
          onset_pattern,
          mix_points,
          ai_tags,
          analysis_status,
          analyzed_at
        )
      `)
      .eq('track_id', trackId)
      .eq('user_id', user.id)
      .order('stem_type');

    if (stemsError) {
      throw new Error(`Failed to fetch stems: ${stemsError.message}`);
    }

    const { data: signedUrls } = await supabase.storage
      .from('audio-uploads')
      .createSignedUrls(
        (stems ?? []).map((s) => (s as Record<string, unknown>).storage_path as string),
        3600
      );

    const urlMap: Record<string, string> = {};
    if (signedUrls) {
      for (const entry of signedUrls) {
        if (entry.signedUrl) {
          urlMap[entry.path] = entry.signedUrl;
        }
      }
    }

    const stemsWithUrls = (stems ?? []).map((stem) => {
      const s = stem as Record<string, unknown>;
      return {
        ...s,
        playback_url: urlMap[s.storage_path as string] ?? null,
      };
    });

    log('info', requestId, 'Stems fetched', { trackId, stemCount: stemsWithUrls.length });

    return new Response(
      JSON.stringify({ track, stems: stemsWithUrls }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    log('error', requestId, 'get-stems error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to get stems' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
