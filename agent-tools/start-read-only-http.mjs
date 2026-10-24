import {parseArgs} from 'node:util';
import {openIsolatedReadOnlyService} from './read-only-http-service.mjs';
import {createReadOnlyHttpServer} from './read-only-http.mjs';

// Separate, explicit local opt-in. Never consulted by npm start or STDIO.
let service;
try {
  const {values} = parseArgs({options: {'build-directory': {type: 'string'}, port: {type: 'string', default: '0'}}});
  const port = Number(values.port);
  if (!values['build-directory'] || !/^\d+$/.test(values.port) || !Number.isInteger(port) || port < 0 || port > 65535)
    throw Error('Ongeldige startopties.');
  service = await openIsolatedReadOnlyService({buildDirectory: values['build-directory']});
  const server = createReadOnlyHttpServer({service});
  server.once('close', () => service.close());
  server.once('error', () => {
    service.close();
    process.stderr.write('De lokale leeskoppeling kon niet starten.\n');
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { server.close(); server.closeAllConnections(); });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`Lokale leesproef: http://127.0.0.1:${server.address().port}/mcp\n`);
  });
} catch {
  await service?.close();
  process.stderr.write('De lokale leeskoppeling kon niet starten. Geef --build-directory en eventueel --port op.\n');
  process.exitCode = 1;
}
