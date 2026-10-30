import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CatalogueRepository} from './repository.mjs';
import {createStaticWeb} from './static-web.mjs';
import {webResource,webResourceBatchPayload,WebResourceIntegrityError} from './web-resources.mjs';
import {parseContentBatchQuery} from '../lib/content-batch-contract.mjs';
import {Readable,pipeline} from 'node:stream';
import {responseEncoding,createResponseCompressor} from './response-compression.mjs';
import {createRuntimeReadiness} from './runtime-readiness.mjs';
import {createHostingPolicy} from './hosting-policy.mjs';
import {createRequestRateLimit,createVisitorRequestRateLimit,requestVisitorAddress} from './request-rate-limit.mjs';
import {startupCheck,startupFailureReason} from './startup-diagnostics.mjs';

// Single-process resource ceilings, not per-user fairness or a request-rate SLA.
// Leave room for a viewer burst while bounding retained JSON/compression/file streams.
export const catalogueRequestLimits=Object.freeze({activeResponses:32,connections:128,responseMs:30000});

// Loopback by default; public request policy requires explicit configuration.
// This is NOT hosted acceptance, DDoS protection or an authentication solution.
// With a webRoot, all data reads are bound to its verified publication. Without
// a webRoot this is the standalone local catalogue tooling API (all releases).
// There is no option or request parameter to disable the web publication scope.
export async function serveCatalogue(repository,{port=0,webRoot,publicOrigin,listenHost='127.0.0.1',sliplaneGateway,formerOrigin}={}){
 const hosting=startupCheck('start-options',()=>{
  if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid catalogue port');
  return createHostingPolicy({publicOrigin,listenHost,webRoot,formerOrigin});
 });
 // A rejected forwarded address falls back to the gateway budget; log only its shape, at most once a minute.
 let lastFallbackLog=-Infinity;
 const onFallback=shape=>{const t=performance.now();if(t-lastFallbackLog<60_000)return;lastFallbackLog=t;
  console.error(JSON.stringify({event:'visitor_address_fallback',shape,time:new Date().toISOString()}));};
 const visitorAddress=startupCheck('start-options',()=>requestVisitorAddress({publicMode:hosting.publicMode,sliplaneGateway,onFallback}));
 const readiness=webRoot===undefined?null:startupCheck('web-readiness',()=>createRuntimeReadiness(repository,()=>{
  const web=createStaticWeb(webRoot,repository);
  return {pins:web.pins,value:web};
 }));
 const staticWeb=readiness?.value??null;
 const readScope=staticWeb?.readScope;
 if(hosting.publicMode&&(!readScope||typeof readScope.allows!=='function'))
  startupCheck('web-readiness',()=>{throw Error('Runtime readiness startup refused');});
 const requestRateLimit=hosting.publicMode?createVisitorRequestRateLimit():null;
 // One immediate refusal log, then at most one per minute for the listener.
 // Retain only a saturating count of repeats, never addresses or request input.
 const refusalLogLimit=hosting.publicMode?createRequestRateLimit({capacity:1,refillPerSecond:1/60}):null;
 let suppressedRefusals=0;
 let activeResponses=0;
 const indexes=new Map();let indexBytes=0;
 const documentIndex=(release,version)=>{
  const key=release+':'+version,hit=indexes.get(key);
  if(hit){indexes.delete(key);indexes.set(key,hit);return hit.value;}
  const value=repository.documentIndex(release,version);if(!value)return null;
  const size=Buffer.byteLength(JSON.stringify(value));
  if(size<=4*1024*1024){
   while(indexes.size>=32||indexBytes+size>4*1024*1024){const oldest=indexes.keys().next().value;indexBytes-=indexes.get(oldest).size;indexes.delete(oldest);}
   indexes.set(key,{value,size});indexBytes+=size;
  }
  return value;
 };
 // Node also creates responses before the request event (missing Host and the
 // per-socket request ceiling). Cover these with the same fixed public CORS.
 const pendingResponses=new WeakMap();
 class PublicResponse extends http.ServerResponse{
  constructor(req,options){
   super(req,options);
   this.setHeader('Access-Control-Allow-Origin',hosting.publicOrigin);
   this.setHeader('Cache-Control','no-store');
   if(hosting.hsts)this.setHeader('Strict-Transport-Security',hosting.hsts);
   const socket=req.socket;
   pendingResponses.set(socket,(pendingResponses.get(socket)||0)+1);
   let released=false;
   const release=()=>{
    if(released)return;released=true;
    pendingResponses.set(socket,pendingResponses.get(socket)-1);
    this.off('finish',release);this.off('close',release);
   };
   this.once('finish',release);this.once('close',release);
  }
 }
 const handle=(req,res,expectation=false)=>{
  // Never trust caller/proxy request IDs or log URLs, headers, SQL or exceptions.
  const requestId=randomUUID();
  let failureLogged=false;
  const requestFailed=()=>{
   if(failureLogged)return;failureLogged=true;
   console.error(JSON.stringify({event:'catalogue_request_failed',requestId,status:500,time:new Date().toISOString()}));
  };
  res.setHeader('X-Request-ID',requestId);
  let expected=hosting.publicMode?hosting.authority:'127.0.0.1:'+server.address().port;
  // Accept only this exact local alias on the actual listener port. The Origin
  // must match the requested authority; neither DNS nor proxy headers choose it.
  if(!hosting.publicMode&&req.headers.host==='localhost:'+server.address().port)expected=req.headers.host;
  const expectedOrigin=hosting.publicMode?hosting.publicOrigin:`http://${expected}`;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(expectation)res.setHeader('Connection','close');
  const replyJson=(status,raw)=>{
   const bytes=Buffer.byteLength(raw);
   const encoding=responseEncoding(req.headers['accept-encoding'],bytes);
   res.setHeader('Vary','Accept-Encoding');
   if(encoding===null){res.writeHead(406);res.end();return;}
   if(encoding!=='identity'){
    res.setHeader('Content-Encoding',encoding);res.writeHead(status);
    pipeline(Readable.from([raw]),createResponseCompressor(encoding,bytes),res,()=>{});
   }else{res.writeHead(status);res.end(raw);}
  };
  const reply=(status,value)=>replyJson(status,JSON.stringify(value));
  if(req.rawHeaders.length/2>32)return reply(431,{error:'Too many headers'});
  let hosts=0,origins=0;
  for(let i=0;i<req.rawHeaders.length;i+=2){
   const name=req.rawHeaders[i].toLowerCase();
   if(name==='host')hosts++;
   if(name==='origin')origins++;
  }
  if(hosts!==1||origins>1){res.setHeader('Connection','close');return reply(400,{error:'Invalid request headers'});}
  // The former public address sends page visits on to the current one, path included.
  if(hosting.formerAuthority&&req.headers.host===hosting.formerAuthority&&(req.method==='GET'||req.method==='HEAD')){
   const path=typeof req.url==='string'&&req.url.startsWith('/')&&!req.url.startsWith('//')&&req.url.length<=2048?req.url:'/';
   res.removeHeader('Content-Type');
   res.writeHead(308,{Location:new URL(path,hosting.publicOrigin).href,'Content-Length':'0'});res.end();return;
  }
  if(req.headers.host!==expected)return reply(403,{error:'Host not allowed'});
  if(req.headers.origin!==undefined&&req.headers.origin!==expectedOrigin)
   return reply(403,{error:'Origin not allowed'});
  const fetchSite=req.headers['sec-fetch-site'];
  // Public mode: a visitor following a link from another site (mail, search) opens the
  // page as a top-level document. Allow only that single GET navigation outside /api/;
  // everything the page then loads is same-origin, and cross-site API reads stay refused.
  const publicNavigation=hosting.publicMode&&req.method==='GET'&&req.headers.origin===undefined&&
   req.headers['sec-fetch-mode']==='navigate'&&req.headers['sec-fetch-dest']==='document'&&
   fetchSite==='cross-site'&&!(req.url||'').startsWith('/api/');
  if(!publicNavigation&&(hosting.publicMode?(fetchSite||'').split(',').some(value=>value.trim()==='cross-site'):fetchSite==='cross-site'))
   return reply(403,{error:'Cross-site request not allowed'});
  if(expectation)return reply(417,{error:'Expectation not allowed'});
  if(req.method!=='GET'){res.setHeader('Allow','GET');res.setHeader('Connection','close');return reply(405,{error:'Read-only API'});}
  if(req.headers['transfer-encoding'] || (req.headers['content-length'] && req.headers['content-length']!=='0')){
   res.setHeader('Connection','close');return reply(400,{error:'Request body not allowed'});
  }
  if(req.url.length>2048)return reply(414,{error:'URL too long'});
  if(!req.url.startsWith('/')||req.url.startsWith('//')||req.url.includes('\\'))return reply(400,{error:'Invalid request'});
  // Exact probes keep working when a peer exhausts its budget. They still pass
  // all request checks and the bounded active-response admission below.
  const probe=req.url==='/api/v1/health'||req.url==='/api/v1/ready';
  // Only an explicitly configured Sliplane gateway can supply a visitor IP.
  // Other peers retain the transport-address budget, ignoring proxy headers.
  // Reject before taking an answer slot or reading any requested content.
  const admission=probe?null:requestRateLimit?.take(visitorAddress(req));
  if(admission&&!admission.allowed){
   if(refusalLogLimit.take().allowed){
    console.error(JSON.stringify({event:'catalogue_request_limited',requestId,status:429,
     time:new Date().toISOString(),suppressed:suppressedRefusals}));
    suppressedRefusals=0;
   }else suppressedRefusals=Math.min(Number.MAX_SAFE_INTEGER,suppressedRefusals+1);
   res.setHeader('Retry-After',String(admission.retryAfter));res.setHeader('Connection','close');
   return reply(429,{error:'Too many requests; retry shortly'});
  }
  // Admit before any database read, JSON serialization or static stream starts.
  // No waiting queue or trust in forwarded identity headers.
  if(activeResponses>=catalogueRequestLimits.activeResponses){
   res.setHeader('Retry-After','1');res.setHeader('Connection','close');
   return reply(503,{error:'Server busy; retry shortly'});
  }
  activeResponses++;
  // requestTimeout bounds incoming requests; socket inactivity alone can be
  // extended by a trickling reader. Bound total response lifetime as well.
  const responseDeadline=setTimeout(()=>res.destroy(),catalogueRequestLimits.responseMs);
  responseDeadline.unref();
  let released=false;
  const releaseResponse=()=>{
   if(released)return;released=true;activeResponses--;clearTimeout(responseDeadline);
   res.off('finish',releaseResponse);res.off('close',releaseResponse);
  };
  // finish releases completed writes; close covers aborts and pipeline errors.
  // IncomingMessage 'close' is too early: a complete GET can still be streaming.
  res.once('finish',releaseResponse);res.once('close',releaseResponse);
  try{
   const u=new URL(req.url,expectedOrigin),q=u.searchParams;
   if(staticWeb?.serve(u.pathname,req,res,requestFailed))return;
   const limit=q.has('limit')?Number(q.get('limit')):25,offset=q.has('offset')?Number(q.get('offset')):0;
   const release=q.get('release');let match;
   if(['/api/v1/health','/api/v1/ready','/api/v1/version'].includes(u.pathname)&&req.url.includes('?'))
    return reply(400,{error:'Invalid request'});
   if(u.pathname==='/api/v1/health')return reply(200,{status:'ok',mode:hosting.mode,schema:1});
   if(u.pathname==='/api/v1/version')
    return reply(staticWeb?200:404,staticWeb?.version??{error:'Not found'});
   if(u.pathname==='/api/v1/ready'){
    if(!readiness)return reply(404,{error:'Not found'});
    const state=readiness.probe();
    if(!state.ready)res.setHeader('Retry-After','1');
    return reply(state.ready?200:503,{status:state.ready?'ready':'not-ready',mode:hosting.mode,schema:1});
   }
   const isContentBatch=u.pathname==='/api/v1/content-batch';
   if(readScope){
    if(q.getAll('release').length>1)return reply(400,{error:'Invalid request'});
    if((release!==null&&release!==readScope.release)||(!isContentBatch&&!readScope.allows(u.pathname)))
     return reply(404,{error:'Not found'});
   }
   if(isContentBatch){
    const {release,hashes}=parseContentBatchQuery(q);
    if(readScope&&hashes.some(hash=>!readScope.allows('/api/v1/content/'+hash)))
      return reply(404,{error:'Not found'});
    const payload=webResourceBatchPayload(repository,release,hashes);
    return payload===null?reply(404,{error:'Not found'}):replyJson(200,payload);
   }
   if((match=u.pathname.match(/^\/api\/v1\/content\/([a-f0-9]{64})$/))){
    if(!/^[a-f0-9]{64}$/.test(release||''))return reply(400,{error:'Explicit release required'});
    const value=webResource(repository,release,match[1]);return reply(value?200:404,value||{error:'Not found'});
   }
   if(u.pathname==='/api/v1/releases')return reply(200,repository.releases({limit,offset}).map(r=>({id:r.id,baselineVersion:r.manifest.baselineVersion,counts:r.manifest.counts})));
   if(u.pathname==='/api/v1/catalogue'){
    if(!/^[a-f0-9]{64}$/.test(release||''))return reply(400,{error:'Explicit release required'});
    return reply(200,repository.catalogue({release,query:q.get('q')||'',kind:q.get('kind')||'',limit,offset}));
   }
   if(u.pathname==='/api/v1/documents'){
    if(!/^[a-f0-9]{64}$/.test(release||''))return reply(400,{error:'Explicit release required'});
    return reply(200,repository.documents(release,{limit,offset}));
   }
   if((match=u.pathname.match(/^\/api\/v1\/documents\/([a-f0-9]{64})\/index$/))){
    if(!/^[a-f0-9]{64}$/.test(release||''))return reply(400,{error:'Explicit release required'});
    const value=documentIndex(release,match[1]);return reply(value?200:404,value||{error:'Not found'});
   }
   if((match=u.pathname.match(/^\/api\/v1\/packages\/([a-f0-9]{64})\/records$/)))return reply(200,repository.records(match[1],{kind:q.get('kind')||'',limit,offset}));
   if((match=u.pathname.match(/^\/api\/v1\/packages\/([a-f0-9]{64})\/records\/([^/]+)\/([^/]+)$/))){
    const value=repository.record(match[1],decodeURIComponent(match[2]),decodeURIComponent(match[3]));return reply(value?200:404,value||{error:'Not found'});
   }
   if((match=u.pathname.match(/^\/api\/v1\/documents\/([a-f0-9]{64})\/pages\/(\d+)$/))){const value=repository.page(match[1],Number(match[2]));return reply(value?200:404,value||{error:'Not found'});}
   return reply(404,{error:'Not found'});
  }catch(error){
   if(!(error instanceof WebResourceIntegrityError)&&
      ((error instanceof Error&&error.message.startsWith('Invalid'))||error instanceof URIError))
    return reply(400,{error:'Invalid request'});
   requestFailed();
   return reply(500,{error:'Request failed'});
  }
 };
 const server=http.createServer({maxHeaderSize:8192,connectionsCheckingInterval:1000,
  ...(hosting.publicMode?{ServerResponse:PublicResponse}:{})},handle);
 // Reject excess headers above instead of silently truncating security headers.
 // Includes idle keep-alive sockets and clients that never finish their headers.
 // Node drops excess TCP connections before parsing; no HTTP reply is promised.
 server.maxConnections=catalogueRequestLimits.connections;
 server.requestTimeout=10000;server.headersTimeout=10000;server.maxHeadersCount=0;
 server.setTimeout(15000,socket=>socket.destroy());
 server.keepAliveTimeout=5000;server.maxRequestsPerSocket=100;
 // Never invite a request body on this read-only surface.
 if(hosting.publicMode){
  const rejectExpectation=(req,res)=>handle(req,res,true);
  server.on('checkContinue',rejectExpectation);server.on('checkExpectation',rejectExpectation);
  server.on('clientError',(error,socket)=>{
   // There is no ServerResponse on a parser failure. Never log rawPacket or
   // append a second HTTP status inside a pending/pipelined response body.
   if(error.code==='ECONNRESET'||!socket.writable||socket.writableEnded||pendingResponses.get(socket)>0){
    socket.destroy();return;
   }
   const status=error.code==='HPE_HEADER_OVERFLOW'?431:error.code==='HPE_CHUNK_EXTENSIONS_OVERFLOW'?413:
    error.code==='ERR_HTTP_REQUEST_TIMEOUT'?408:400;
   socket.end(`HTTP/1.1 ${status} ${http.STATUS_CODES[status]}\r\nConnection: close\r\nContent-Length: 0\r\n`+
    `Cache-Control: no-store\r\nAccess-Control-Allow-Origin: ${hosting.publicOrigin}\r\n`+
    (hosting.hsts?`Strict-Transport-Security: ${hosting.hsts}\r\n`:'')+'\r\n',()=>socket.destroy());
  });
 }else server.on('checkContinue',(_req,res)=>{res.writeHead(417,{'Connection':'close'});res.end();});
 await startupCheck('listener',()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,hosting.listenHost,resolve);}));
 return {server,url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise((resolve,reject)=>{
  // Drain active reads, but do not let a slow client prevent shutdown indefinitely.
  const deadline=setTimeout(()=>server.closeAllConnections(),5000);deadline.unref();
  server.close(error=>{clearTimeout(deadline);if(error)reject(error);else resolve();});
 })};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let repository;
 try{
  repository=startupCheck('database-open',()=>new CatalogueRepository(process.argv[2]||fileURLToPath(new URL('./runtime/catalogue.sqlite',import.meta.url)),{readOnly:true}));
  const app=await serveCatalogue(repository,{port:4318,webRoot:process.argv[3]});console.log('Local catalogue API: '+app.url+'/api/v1/health');
  if(process.argv[3])console.log('Local database preview: '+app.url);
  let closing=false;
  const close=async()=>{if(closing)return;closing=true;await app.close();repository.close();};process.once('SIGINT',close);process.once('SIGTERM',close);
 }catch(error){
  repository?.close();
  console.error('Catalogue start refused. Failed check: '+startupFailureReason(error)+'.');
  process.exitCode=1;
 }
}
