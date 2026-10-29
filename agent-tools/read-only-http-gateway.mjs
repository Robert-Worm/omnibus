import {createServer, request} from 'node:http';
import {once} from 'node:events';
import {createRequestRateLimit} from '../local-data/request-rate-limit.mjs';
import {readOnlyOnlineConfig, acceptsReadOnlyOnlineHeaders} from './read-only-http-config.mjs';
import {createReadOnlyHttpServer, boundedLimits, boundReadOnlyConnections, readBody} from './read-only-http.mjs';

// The upstream is created here, never taken from a URL, request or environment.
// This HTTP ingress requires a separate TLS edge; it does not terminate TLS.
export async function createReadOnlyHttpGateway({service, online: configuration, limits: overrides}) {
  const online = readOnlyOnlineConfig(configuration), limits = boundedLimits(overrides);
  const backend = createReadOnlyHttpServer({service, online, limits});
  backend.listen(0, '127.0.0.1');
  try { await once(backend, 'listening'); }
  catch (error) { backend.close(); throw error; }
  const port = backend.address().port;
  const budget = createRequestRateLimit({capacity: limits.requestBurst, refillPerSecond: limits.requestsPerSecond});
  let active = 0;
  const server = createServer({maxHeaderSize: limits.headerBytes, headersTimeout: limits.connectionMs,
    requestTimeout: limits.connectionMs, keepAliveTimeout: 1}, (req, res) => {
    const abort = new AbortController();
    res.once('close', () => abort.abort());
    const send = (status, bytes = Buffer.from('{"error":"Leesverzoek niet uitgevoerd."}')) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, {'content-type': 'application/json', 'content-length': bytes.length,
        'cache-control': 'no-store', connection: 'close', 'x-content-type-options': 'nosniff',
        'cross-origin-resource-policy': 'same-origin', ...(status === 429 ? {'retry-after': '1'} : {}),
        ...(status === 405 ? {allow: 'POST'} : {})});
      res.end(bytes);
    };
    if (!acceptsReadOnlyOnlineHeaders(req, online)) return send(403);
    if (!budget.take().allowed) return send(429);
    if (req.url !== '/mcp') return send(404);
    if (req.method !== 'POST') return send(405);
    // Never let Connection nominate security headers for removal by a proxy.
    if (req.headers.connection?.split(',').some(token => !['close', 'keep-alive'].includes(token.trim().toLowerCase()))) return send(400);
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || '') || req.headers['content-encoding']) return send(415);
    if (Number(req.headers['content-length']) > limits.bodyBytes) return send(413);
    if (active >= limits.concurrentRequests) return send(429);
    active++;
    void (async () => {
      try {
        const body = await readBody(req, limits.bodyBytes, abort.signal);
        // Preserve original authority, origin and ALL fetch metadata. Drop
        // forwarded/client-identity, hop-by-hop and unrelated headers entirely.
        const headers = [];
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
          const name = req.rawHeaders[i].toLowerCase();
          if (['host', 'origin', 'content-type', 'accept', 'mcp-protocol-version', 'mcp-session-id'].includes(name) || name.startsWith('sec-fetch-'))
            headers.push(req.rawHeaders[i], req.rawHeaders[i + 1]);
        }
        headers.push('Content-Length', String(body.length), 'Connection', 'close');
        const response = await forward(port, headers, body, abort.signal, limits);
        send(response.status, response.body);
      } catch (error) { send(error?.status || 502); }
      finally { active--; }
    })().catch(() => res.destroy());
  });
  boundReadOnlyConnections(server, limits);
  const closeBackend = () => { backend.close(); backend.closeAllConnections(); };
  server.once('close', closeBackend);
  server.once('error', closeBackend);
  return server;
}

function forward(port, headers, body, signal, limits) {
  return new Promise((resolve, reject) => {
    const upstream = request({host: '127.0.0.1', port, path: '/mcp', method: 'POST', headers,
      agent: false, signal, maxHeaderSize: limits.headerBytes}, response => {
      const chunks = [];
      let size = 0;
      response.on('error', reject);
      response.on('data', chunk => {
        size += chunk.length;
        if (size > limits.responseBytes) { reject({status: 413}); upstream.destroy(); }
        else chunks.push(chunk);
      });
      response.once('end', () => resolve({status: response.statusCode, body: Buffer.concat(chunks)}));
    });
    upstream.once('error', reject);
    upstream.end(body);
  });
}
