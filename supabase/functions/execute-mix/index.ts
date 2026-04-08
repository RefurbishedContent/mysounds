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

    const { mixPlanId } = await req.json() as { mixPlanId: string };

    if (!mixPlanId) {
      return new Response(
        JSON.stringify({ error: 'mixPlanId is required' }),
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

    const { data: plan, error: planError } = await supabase
      .from('mix_plans')
      .select('*')
      .eq('id', mixPlanId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'Mix plan not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const p = plan as Record<string, unknown>;

    if (p.status !== 'draft') {
      return new Response(
        JSON.stringify({
          error: `Mix plan is already in status '${p.status}'. Only draft plans can be executed.`,
        }),
        { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const stemInstructions = p.stem_instructions as Record<string, unknown>;
    if (!stemInstructions || Object.keys(stemInstructions).length === 0) {
      return new Response(
        JSON.stringify({ error: 'Mix plan has no stem instructions' }),
        { status: 422, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { error: updateError } = await supabase
      .from('mix_plans')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', mixPlanId);

    if (updateError) {
      throw new Error(`Failed to update mix plan status: ${updateError.message}`);
    }

    log('info', requestId, 'Mix plan marked ready', { mixPlanId, userId: user.id });

    return new Response(
      JSON.stringify({
        mixPlanId,
        status: 'ready',
        transitionType: p.transition_type,
        confidence: p.confidence,
        mixPointMs: p.mix_point_ms,
        durationMs: p.duration_ms,
        stemInstructions: p.stem_instructions,
        fxSuggestions: p.fx_suggestions,
        aiGenerationHooks: p.ai_generation_hooks,
        alternativeTransitions: p.alternative_transitions,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    log('error', requestId, 'execute-mix error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Execute mix failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
