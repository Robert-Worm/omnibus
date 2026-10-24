import {isIP} from 'node:net';

// Configuration only: no DNS resolution, proxy trust, aliases or environment defaults.
// Reject URL normalization rather than silently accepting a different authority.
export function createHostingPolicy({publicOrigin,listenHost='127.0.0.1',webRoot}={}){
 const publicMode=publicOrigin!==undefined;
 const fail=()=>{throw Error('Invalid hosting configuration');};
 if(listenHost!=='127.0.0.1'&&!(publicMode&&listenHost==='0.0.0.0'))fail();
 if(!publicMode)return Object.freeze({publicMode:false,listenHost,mode:'local-read-only'});
 if(typeof publicOrigin!=='string'||typeof webRoot!=='string'||!webRoot.trim())fail();
 let origin;
 try{origin=new URL(publicOrigin);}catch{fail();}
 // Plain HTTP only for a container on the user's own computer (docker run -p 8080:8080).
 const loopbackHttp=origin.protocol==='http:'&&(origin.hostname==='localhost'||origin.hostname==='127.0.0.1');
 if((origin.protocol!=='https:'&&!loopbackHttp)||origin.origin!==publicOrigin||origin.username||origin.password||
    origin.pathname!=='/'||origin.search||origin.hash||origin.port==='0')fail();
 const host=origin.hostname;
 const ip=isIP(host.startsWith('[')?host.slice(1,-1):host);
 if(!ip&&(host.length>253||!host.split('.').every(label=>
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))))fail();
 // The configured HTTPS origin is the operator's TLS ingress contract. Never
 // infer it from Forwarded headers. No preload/subdomain policy or local HSTS.
 const hsts=origin.protocol==='https:'&&!ip&&host!=='localhost'&&!host.endsWith('.localhost')
  ?'max-age=31536000':null;
 return Object.freeze({publicMode:true,publicOrigin,authority:origin.host,listenHost,mode:'public-read-only',hsts});
}
