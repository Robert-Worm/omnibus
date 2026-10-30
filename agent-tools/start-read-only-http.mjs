import {parseArgs} from 'node:util';
import {readFileSync, statSync} from 'node:fs';
import {openIsolatedReadOnlyService} from './read-only-http-service.mjs';
import {createReadOnlyHttpServer} from './read-only-http.mjs';
import {readOnlyOnlineConfig} from './read-only-http-config.mjs';
import {createReadOnlyHttpGateway} from './read-only-http-gateway.mjs';

// Separate opt-in. Never consulted by npm start or STDIO. Even with an online
// config the reader stays loopback. An extra ingress requires --gateway-host;
// it is intended only behind a separately configured TLS edge.
let service;
try {
  const {values, tokens} = parseArgs({tokens: true, options: {'build-directory': {type: 'string'},
    port: {type: 'string', default: '0'}, 'online-config': {type: 'string'}, 'gateway-host': {type: 'string'},
    'read-concurrency': {type: 'string', default: '4'}}});
  if (new Set(tokens.map(token => token.name)).size !== tokens.length) throw Error('Dubbele startoptie.');
  const port = Number(values.port);
  if (!/^[1-4]$/.test(values['read-concurrency'])) throw Error('Ongeldige leesgrens.');
  if (!values['build-directory'] || !/^\d+$/.test(values.port) || !Number.isInteger(port) || port < 0 || port > 65535)
    throw Error('Ongeldige startopties.');
  let online;
  if (values['online-config'] !== undefined) {
    if (statSync(values['online-config']).size > 16 * 1024) throw Error('Configuratie te groot.');
    online = readOnlyOnlineConfig(JSON.parse(readFileSync(values['online-config'], 'utf8')));
  }
  const gatewayHost = values['gateway-host'];
  if (gatewayHost !== undefined && (!online || !['127.0.0.1', '0.0.0.0'].includes(gatewayHost))) throw Error('Ongeldige gateway.');
  service = await openIsolatedReadOnlyService({buildDirectory: values['build-directory'], publicRuntime: online?.publicRuntime,
    concurrentReads: Number(values['read-concurrency'])});
  const server = gatewayHost === undefined ? createReadOnlyHttpServer({service, online}) :
    await createReadOnlyHttpGateway({service, online});
  server.once('close', () => service.close());
  server.once('error', () => {
    service.close();
    process.stderr.write('De lokale leeskoppeling kon niet starten.\n');
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { server.close(); server.closeAllConnections(); });
  server.listen(port, gatewayHost ?? '127.0.0.1', () => {
    process.stdout.write(`${gatewayHost ? 'HTTP-ingang achter TLS-proxy' : online ? 'Proxy-leesvoorbereiding' : 'Lokale leesproef'}: http://${gatewayHost ?? '127.0.0.1'}:${server.address().port}/mcp\n`);
  });
} catch {
  await service?.close();
  process.stderr.write('De leeskoppeling kon niet starten. Controleer --build-directory, --port en eventuele --online-config en --gateway-host.\n');
  process.exitCode = 1;
}
