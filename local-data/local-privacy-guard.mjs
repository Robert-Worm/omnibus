// Test instrumentation for a disposable Node process, not an OS firewall.
// Install before importing the route under test. Never log payloads or addresses.
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import dgram from 'node:dgram';
import http from 'node:http';
import https from 'node:https';
import http2 from 'node:http2';
import {syncBuiltinESMExports} from 'node:module';
import {writeFileSync} from 'node:fs';

export const attempts = [];
let literalLoopbackLookups = 0;
const block = channel => function () {
  attempts.push(channel);
  throw Error('LOCAL_PRIVACY_BLOCKED:' + channel);
};

if (process.env.OMNIBUS_PRIVACY_GUARD === '1') {
  // No outbound connection is needed by either package staging or the server.
  // Listening and accepting loopback HTTP requests still work normally.
  globalThis.fetch = async () => block('fetch')();
  net.Socket.prototype.connect = block('tcp');
  tls.connect = block('tls');
  http.request = block('http'); http.get = block('http');
  https.request = block('https'); https.get = block('https');
  http2.connect = block('http2');
  dgram.Socket.prototype.connect = block('udp');
  dgram.Socket.prototype.send = block('udp');
  for (const name of ['lookup', 'lookupService', ...Object.keys(dns).filter(k => k.startsWith('resolve'))]) {
    if (typeof dns[name] === 'function') dns[name] = block('dns');
    if (typeof dns.promises[name] === 'function') dns.promises[name] = async () => block('dns')();
    if (typeof dns.Resolver.prototype[name] === 'function') dns.Resolver.prototype[name] = block('dns');
    if (typeof dns.promises.Resolver.prototype[name] === 'function') dns.promises.Resolver.prototype[name] = async () => block('dns')();
  }
  // Node uses dns.lookup even when binding to an IP literal. Resolve this one
  // locally, without invoking the OS resolver; do not whitelist hostnames.
  dns.lookup = (hostname, options, callback) => {
    if (hostname !== '127.0.0.1') return block('dns')();
    literalLoopbackLookups++;
    const done = typeof options === 'function' ? options : callback;
    queueMicrotask(() => options?.all ? done(null, [{address:hostname, family:4}]) : done(null, hostname, 4));
  };
  syncBuiltinESMExports();
  if (process.env.OMNIBUS_PRIVACY_RECEIPT) process.once('exit', () => {
    writeFileSync(process.env.OMNIBUS_PRIVACY_RECEIPT, JSON.stringify({attempts, literalLoopbackLookups}) + '\n', {flag:'wx'});
  });
}
