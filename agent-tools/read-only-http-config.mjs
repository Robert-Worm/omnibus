import {createHostingPolicy} from '../local-data/hosting-policy.mjs';

const fail = () => { throw Error('Ongeldige online leesconfiguratie.'); };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export function publicRuntimePins(value) {
  if (!exact(value, ['release', 'publication', 'databaseSha256']) ||
      !Object.values(value).every(item => typeof item === 'string' && /^[a-f0-9]{64}$/.test(item))) fail();
  return Object.freeze({...value});
}

// No ambient environment or automatic public mode. A proxy on this same host
// must preserve the externally validated Host and Origin; forwarded headers
// never establish trust, a client identity, a scheme or a separate budget.
export function readOnlyOnlineConfig(value) {
  if (!exact(value, ['enabled', 'publicOrigin', 'missingOrigin', 'publicRuntime']) || value.enabled !== true ||
      !['reject', 'server-client'].includes(value.missingOrigin)) fail();
  let policy;
  try { policy = createHostingPolicy({publicOrigin: value.publicOrigin, webRoot: 'unused-read-only'}); }
  catch { fail(); }
  if (!policy.publicMode || !value.publicOrigin.startsWith('https://')) fail();
  return Object.freeze({enabled: true, publicOrigin: policy.publicOrigin, missingOrigin: value.missingOrigin,
    publicRuntime: publicRuntimePins(value.publicRuntime)});
}

export function acceptsReadOnlyRequest(req, online) {
  const duplicate = name => req.rawHeaders.filter((_, i) => i % 2 === 0 && req.rawHeaders[i].toLowerCase() === name).length > 1;
  if (req.socket.localAddress !== '127.0.0.1' || req.socket.remoteAddress !== '127.0.0.1' ||
      duplicate('host') || duplicate('origin')) return false;
  const {host, origin} = req.headers;
  if (!online) return [`127.0.0.1:${req.socket.localPort}`, `localhost:${req.socket.localPort}`].includes(host) &&
    (origin === undefined || origin === `http://${host}`) &&
    !['cross-site', 'same-site'].includes(req.headers['sec-fetch-site']);
  if (host !== new URL(online.publicOrigin).host || duplicate('sec-fetch-site') ||
      ![undefined, 'none', 'same-origin'].includes(req.headers['sec-fetch-site'])) return false;
  if (origin !== undefined) return origin === online.publicOrigin;
  return online.missingOrigin === 'server-client' && !Object.keys(req.headers).some(key => key.startsWith('sec-fetch-'));
}
