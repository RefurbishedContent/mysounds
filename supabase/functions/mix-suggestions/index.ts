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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const url = new URL(req.url);
    const trackId = url.searchParams.get('trackId');
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam ?? '5', 10), 20);

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

    const { data: asTrackA, error: errA } = await supabase
      .from('transition_scores')
      .select('track_b_id, overall_score, best_transition_type, confidence, computed_at')
      .eq('track_a_id', trackId)
      .eq('user_id', user.id)
      .order('overall_score', { ascending: false })
      .limit(limit);

    const { data: asTrackB, error: errB } = await supabase
      .from('transition_scores')
      .select('track_a_id, overall_score, best_transition_type, confidence, computed_at')
      .eq('track_b_id', trackId)
      .eq('user_id', user.id)
      .order('overall_score', { ascending: false })
      .limit(limit);

    if (errA || errB) {
      throw new Error(`Failed to fetch transition scores: ${errA?.message ?? errB?.message}`);
    }

    const candidateIds = new Map<string, { score: number; transitionType: string; confidence: number; computedAt: string }>();

    for (const row of (asTrackA ?? []) as Array<Record<string, unknown>>) {
      const id = row.track_b_id as string;
      candidateIds.set(id, {
        score: row.overall_score as number,
        transitionType: row.best_transition_type as string,
        confidence: row.confidence as number,
        computedAt: row.computed_at as string,
      });
    }

    for (const row of (asTrackB ?? []) as Array<Record<string, unknown>>) {
      const id = row.track_a_id as string;
      if (!candidateIds.has(id) || (row.overall_score as number) > (candidateIds.get(id)!.score)) {
        candidateIds.set(id, {
          score: row.overall_score as number,
          transitionType: row.best_transition_type as string,
          confidence: row.confidence as number,
          computedAt: row.computed_at as string,
        });
      }
    }

    const ids = Array.from(candidateIds.keys()).slice(0, limit);

    if (ids.length === 0) {
      log('info', requestId, 'No pre-computed suggestions found', { trackId });
      return new Response(
        JSON.stringify({ trackId, suggestions: [], total: 0 }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id, title, artist, album, duration_ms, status, analysis')
      .in('id', ids)
      .eq('user_id', user.id)
      .eq('status', 'ready');

    if (tracksError) {
      throw new Error(`Failed to fetch track metadata: ${tracksError.message}`);
    }

    const suggestions = (tracks ?? [])
      .map((track) => {
        const t = track as Record<string, unknown>;
        const scoreData = candidateIds.get(t.id as string);
        return {
          track: t,
          compatibilityScore: scoreData?.score ?? 0,
          bestTransitionType: scoreData?.transitionType ?? 'filter_fade',
          confidence: scoreData?.confidence ?? 0,
          computedAt: scoreData?.computedAt ?? null,
        };
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    log('info', requestId, 'Mix suggestions returned', { trackId, count: suggestions.length });

    return new Response(
      JSON.stringify({ trackId, suggestions, total: suggestions.length }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    log('error', requestId, 'mix-suggestions error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to get suggestions' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
