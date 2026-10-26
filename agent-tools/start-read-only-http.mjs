import {parseArgs} from 'node:util';
import {readFileSync, statSync} from 'node:fs';
import {openIsolatedReadOnlyService} from './read-only-http-service.mjs';
import {createReadOnlyHttpServer} from './read-only-http.mjs';
import {readOnlyOnlineConfig} from './read-only-http-config.mjs';

// Separate opt-in. Never consulted by npm start or STDIO. Even with an online
// config the listener stays loopback; deployment of a TLS proxy is separate.
let service;
try {
  const {values, tokens} = parseArgs({tokens: true, options: {'build-directory': {type: 'string'},
    port: {type: 'string', default: '0'}, 'online-config': {type: 'string'}}});
  if (new Set(tokens.map(token => token.name)).size !== tokens.length) throw Error('Dubbele startoptie.');
  const port = Number(values.port);
  if (!values['build-directory'] || !/^\d+$/.test(values.port) || !Number.isInteger(port) || port < 0 || port > 65535)
    throw Error('Ongeldige startopties.');
  let online;
  if (values['online-config'] !== undefined) {
    if (statSync(values['online-config']).size > 16 * 1024) throw Error('Configuratie te groot.');
    online = readOnlyOnlineConfig(JSON.parse(readFileSync(values['online-config'], 'utf8')));
  }
  service = await openIsolatedReadOnlyService({buildDirectory: values['build-directory'], publicRuntime: online?.publicRuntime});
  const server = createReadOnlyHttpServer({service, online});
  server.once('close', () => service.close());
  server.once('error', () => {
    service.close();
    process.stderr.write('De lokale leeskoppeling kon niet starten.\n');
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { server.close(); server.closeAllConnections(); });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`${online ? 'Proxy-leesvoorbereiding' : 'Lokale leesproef'}: http://127.0.0.1:${server.address().port}/mcp\n`);
  });
} catch {
  await service?.close();
  process.stderr.write('De leeskoppeling kon niet starten. Controleer --build-directory, --port en eventuele --online-config.\n');
  process.exitCode = 1;
}
