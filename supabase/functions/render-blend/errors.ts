export type ErrorCode =
  | 'unauthorized'
  | 'invalid_request'
  | 'transition_not_found'
  | 'source_not_eligible'
  | 'unsupported_render_mode'
  | 'conflicting_settings'
  | 'active_job_limit'
  | 'submission_limit'
  | 'internal_error';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey, X-Request-ID',
};

const STATUS_FOR: Record<ErrorCode, number> = {
  unauthorized: 401,
  invalid_request: 400,
  transition_not_found: 404,
  source_not_eligible: 403,
  unsupported_render_mode: 400,
  conflicting_settings: 409,
  active_job_limit: 429,
  submission_limit: 429,
  internal_error: 500,
};

export function errorResponse(code: ErrorCode, message?: string): Response {
  return new Response(
    JSON.stringify({ error: code, ...(message ? { message } : {}) }),
    {
      status: STATUS_FOR[code],
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
