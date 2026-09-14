import { createServer } from 'node:http';

export function startHealthServer({ port, engineVersion, state }) {
  const startedAt = Date.now();

  const server = createServer((req, res) => {
    if (req.method !== 'GET' || req.url !== '/health') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    const now = Date.now();
    const pollAgeMs = state.lastPollAt ? now - state.lastPollAt : null;
    const pollingHealthy =
      state.lastPollAt !== null &&
      pollAgeMs !== null &&
      pollAgeMs < state.pollIntervalMs * 3;

    const body = {
      ok: !state.shuttingDown && (state.lastPollAt === null || pollingHealthy),
      engineVersion,
      uptimeSeconds: Math.round((now - startedAt) / 1000),
      ffmpegAvailable: state.ffmpegAvailable,
      pollingHealthy,
      lastPollAgeSeconds: pollAgeMs === null ? null : Math.round(pollAgeMs / 1000),
      inFlight: state.inFlight,
      shuttingDown: state.shuttingDown,
    };

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  });

  server.listen(port, '0.0.0.0');
  return server;
}
