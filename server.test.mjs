import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createApp} from '../server.mjs';

const jpeg=Buffer.concat([Buffer.from([0xFF,0xD8,0xFF,0xE0]),Buffer.alloc(2000,7)]).toString('base64');
const GLB=(()=>{const js=Buffer.from(JSON.stringify({asset:{version:'2.0'}})),ch=Buffer.concat([js,Buffer.alloc((4-js.length%4)%4,0x20)]),h=Buffer.alloc(20);h.write('glTF',0,'latin1');h.writeUInt32LE(2,4);h.writeUInt32LE(20+ch.length,8);h.writeUInt32LE(ch.length,12);h.writeUInt32LE(0x4E4F534A,16);return Buffer.concat([h,ch])})();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const provider=async reply=>{const s=http.createServer(async(req,res)=>{let b='';for await(const c of req)b+=c;const r=await reply(JSON.parse(b));res.writeHead(r.status||200,{'content-type':'application/json'});res.end(JSON.stringify(r.body))});await new Promise(r=>s.listen(0,'127.0.0.1',r));return{url:'http://127.0.0.1:'+s.address().port,close:()=>{s.closeAllConnections();s.close()}}};
const okReply=async()=>({body:{glb_base64:GLB.toString('base64'),measurements:{height_cm:170,waist_cm:80,evil:'x'},quality:{ok:true},engine:{name:'mock',version:'0'}}});
async function mk(opts={}){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vizo-'));const app=createApp({data:dir,poll:20,limit:1000,adminKey:'adm',...opts});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 const call=async(method,p,{token,body,headers,bin}={})=>{const r=await fetch(base+p,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{}),...headers},body:body?JSON.stringify(body):undefined});if(bin)return{s:r.status,buf:Buffer.from(await r.arrayBuffer()),type:r.headers.get('content-type')};const t=await r.text();return{s:r.status,j:t?JSON.parse(t):null}};
 const reg=async(email,role='buyer')=>(await call('POST','/api/auth/register',{body:{email,password:'password-123',name:'T',role,shop:role==='seller'?'Shop':undefined}})).j.token;
 const wait=async(tok,id,want)=>{for(let i=0;i<200;i++){const{j}=await call('GET','/api/body/jobs/'+id,{token:tok});if(want.includes(j.job.status))return j.job;await sleep(20)}throw new Error('job timeout')};
 return{app,dir,call,reg,wait,close:()=>app.close()}}
const req=(h=170)=>({height_cm:h,images:{front:jpeg,side:jpeg}});

test('auth: register, login, me, duplicate, weak password, wrong password, logout',async()=>{const c=await mk();
 const t=await c.reg('a@x.kz');assert.equal((await c.call('GET','/api/me',{token:t})).j.user.email,'a@x.kz');
 assert.equal((await c.call('POST','/api/auth/register',{body:{email:'A@x.kz',password:'password-123',name:'T',role:'buyer'}})).s,409);
 assert.equal((await c.call('POST','/api/auth/register',{body:{email:'b@x.kz',password:'short',name:'T',role:'buyer'}})).s,400);
 assert.equal((await c.call('POST','/api/auth/login',{body:{email:'a@x.kz',password:'nope-nope-1'}})).s,401);
 const l=await c.call('POST','/api/auth/login',{body:{email:'a@x.kz',password:'password-123'}});assert.equal(l.s,200);
 assert.equal((await c.call('GET','/api/me')).s,401);assert.equal((await c.call('POST','/api/auth/logout',{token:l.j.token})).s,204);assert.equal((await c.call('GET','/api/me',{token:l.j.token})).s,401);
 assert.ok(!JSON.stringify(c.app.db.prepare('SELECT * FROM users').all()).includes('password-123'),'no plaintext password');await c.close()});

test('job validation: auth, role, height, views, magic bytes, format, size',async()=>{const c=await mk(),t=await c.reg('a@x.kz'),s=await c.reg('s@x.kz','seller');
 assert.equal((await c.call('POST','/api/body/jobs',{body:req()})).s,401);assert.equal((await c.call('POST','/api/body/jobs',{token:s,body:req()})).s,403);
 assert.equal((await c.call('POST','/api/body/jobs',{token:t,body:{images:req().images}})).j.error,'invalid_height');
 assert.equal((await c.call('POST','/api/body/jobs',{token:t,body:req(300)})).j.error,'invalid_height');
 assert.equal((await c.call('POST','/api/body/jobs',{token:t,body:{height_cm:170,images:{front:jpeg}}})).j.error,'missing_views');
 const fake=Buffer.alloc(3000,1).toString('base64');assert.equal((await c.call('POST','/api/body/jobs',{token:t,body:{height_cm:170,images:{front:jpeg,side:fake}}})).j.error,'unsupported_format');
 assert.equal((await c.call('POST','/api/body/jobs',{token:t,body:{height_cm:170,images:{front:jpeg,side:'AAAA'}}})).j.error,'invalid_image');
 assert.equal((await c.call('POST','/api/body/jobs',{token:t,body:{height_cm:170,images:{front:jpeg,side:jpeg,top:jpeg}}})).j.error,'invalid_view');
 assert.equal(c.app.db.prepare('SELECT COUNT(*) n FROM jobs').get().n,0,'rejected requests create no jobs');await c.close()});

test('no provider configured: job fails honestly, no model, photos erased',async()=>{const c=await mk(),t=await c.reg('a@x.kz');
 const r=await c.call('POST','/api/body/jobs',{token:t,body:req()});assert.equal(r.s,202);const j=await c.wait(t,r.j.job.id,['failed']);
 assert.equal(j.error,'provider_not_configured');assert.equal((await c.call('GET','/api/body/model',{token:t})).s,404);
 assert.deepEqual(fs.readdirSync(path.join(c.dir,'tmp')),[]);assert.equal((await c.call('GET','/api/health')).j.reconstruction.configured,false);await c.close()});

test('provider ok: completed job, versioned model, GLB served, bad provider data sanitised',async()=>{const p=await provider(okReply),c=await mk({reconUrl:p.url}),t=await c.reg('a@x.kz');
 const r=await c.call('POST','/api/body/jobs',{token:t,body:req(),headers:{'idempotency-key':'k1'}});const again=await c.call('POST','/api/body/jobs',{token:t,body:req(),headers:{'idempotency-key':'k1'}});
 assert.equal(again.s,200);assert.equal(again.j.job.id,r.j.job.id,'idempotent replay');
 const j=await c.wait(t,r.j.job.id,['completed','failed']);assert.equal(j.status,'completed');
 const m=(await c.call('GET','/api/body/model',{token:t})).j.model;assert.equal(m.version,1);assert.deepEqual(m.measurements,{height_cm:170,waist_cm:80});assert.equal(m.accuracy_validated,false);
 const f=await c.call('GET','/api/body/models/'+m.id+'/file',{token:t,bin:true});assert.equal(f.type,'model/gltf-binary');assert.ok(f.buf.equals(GLB));
 const j2=await c.wait(t,(await c.call('POST','/api/body/jobs',{token:t,body:req()})).j.job.id,['completed']);assert.equal(j2.status,'completed');
 assert.equal((await c.call('GET','/api/body/models',{token:t})).j.models.map(x=>x.version).join(),'2,1');await p.close();await c.close()});

test('owner isolation: other user cannot read, cancel, download or delete',async()=>{const p=await provider(okReply),c=await mk({reconUrl:p.url}),a=await c.reg('a@x.kz'),b=await c.reg('b@x.kz');
 const job=(await c.call('POST','/api/body/jobs',{token:a,body:req()})).j.job;await c.wait(a,job.id,['completed']);const mid=(await c.call('GET','/api/body/model',{token:a})).j.model.id;
 assert.equal((await c.call('GET','/api/body/jobs/'+job.id,{token:b})).s,404);assert.equal((await c.call('POST','/api/body/jobs/'+job.id+'/cancel',{token:b})).s,404);
 assert.equal((await c.call('GET','/api/body/models/'+mid+'/file',{token:b,bin:true})).s,404);assert.equal((await c.call('GET','/api/body/model',{token:b})).s,404);
 assert.equal((await c.call('DELETE','/api/body/models',{token:b})).s,204);assert.equal((await c.call('GET','/api/body/model',{token:a})).s,200,'A model untouched');await p.close();await c.close()});

test('provider failures: low quality, invalid GLB, HTTP error, timeout',async()=>{
 for(const[reply,err,opts]of[[async()=>({body:{quality:{ok:false,warnings:['no side view']},glb_base64:GLB.toString('base64')}}),'quality_insufficient'],[async()=>({body:{glb_base64:'AAAA'}}),'invalid_provider_response'],[async()=>({status:500,body:{}}),'provider_error'],[async()=>{await sleep(300);return okReply()},'provider_timeout',{timeout:60}]]){
  const p=await provider(reply),c=await mk({reconUrl:p.url,...opts}),t=await c.reg('a@x.kz');const j=await c.wait(t,(await c.call('POST','/api/body/jobs',{token:t,body:req()})).j.job.id,['failed','completed']);
  assert.equal(j.error,err);assert.equal((await c.call('GET','/api/body/model',{token:t})).s,404,'no model on failure');await p.close();await c.close()}});

test('cancel while processing discards the result; one active job per user; delete erases models',async()=>{const p=await provider(async()=>{await sleep(250);return okReply()}),c=await mk({reconUrl:p.url}),t=await c.reg('a@x.kz');
 const job=(await c.call('POST','/api/body/jobs',{token:t,body:req()})).j.job;assert.equal((await c.call('POST','/api/body/jobs',{token:t,body:req()})).j.error,'job_in_progress');
 await sleep(60);assert.equal((await c.call('POST','/api/body/jobs/'+job.id+'/cancel',{token:t})).j.job.status,'cancelled');await sleep(450);
 assert.equal((await c.call('GET','/api/body/jobs/'+job.id,{token:t})).j.job.status,'cancelled');assert.equal((await c.call('GET','/api/body/model',{token:t})).s,404);
 await c.wait(t,(await c.call('POST','/api/body/jobs',{token:t,body:req()})).j.job.id,['completed']);assert.equal(fs.readdirSync(path.join(c.dir,'models')).length,1);
 assert.equal((await c.call('DELETE','/api/body/models',{token:t})).s,204);assert.equal(fs.readdirSync(path.join(c.dir,'models')).length,0);
 assert.equal((await c.call('DELETE','/api/me',{token:t})).s,204);assert.equal((await c.call('GET','/api/me',{token:t})).s,401);await p.close();await c.close()});

test('analytics: whitelist, no PII props, dedupe, server-only events, purchase gate, honest KPIs',async()=>{const p=await provider(okReply),c=await mk({reconUrl:p.url}),t=await c.reg('a@x.kz');
 const ev=(name,props,id='evt-00000001')=>c.call('POST','/api/events',{token:t,body:{event_id:id,name,props}});
 assert.equal((await ev('hacked_event',{})).j.error,'unknown_event');assert.equal((await ev('login_completed',{})).j.error,'server_only_event');assert.equal((await ev('purchase_completed',{})).j.error,'purchase_not_integrated');
 for(const bad of[{email:'a@x.kz'},{photo:'data:image/png;base64,AAAA'},{size:'x'.repeat(65)},{size:{a:1}}])assert.equal((await ev('size_selected',bad)).j.error,'invalid_props');
 assert.equal((await ev('size_selected',{size:'M',product_id:'p1'})).j.duplicate,false);assert.equal((await ev('size_selected',{size:'M',product_id:'p1'})).j.duplicate,true);
 assert.equal((await c.call('GET','/api/admin/kpis')).s,403);let k=(await c.call('GET','/api/admin/kpis',{headers:{'x-admin-key':'adm'}})).j;assert.equal(k.kpis.scan_success_rate,null,'no scans yet -> null, not 0 or 100');
 await c.wait(t,(await c.call('POST','/api/body/jobs',{token:t,body:req()})).j.job.id,['completed']);k=(await c.call('GET','/api/admin/kpis',{headers:{'x-admin-key':'adm'}})).j;
 assert.equal(k.counts.body_scan_started,1);assert.equal(k.kpis.scan_success_rate,1);assert.equal(k.counts.registration_completed,1);
 assert.ok(!JSON.stringify(c.app.db.prepare('SELECT * FROM events').all()).includes('a@x.kz'),'events carry no email/user id');await p.close();await c.close()});
