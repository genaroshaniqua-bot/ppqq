import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
let session={user:null,profile:null,artist:null,error:null};
let authCalls=0;
class Response {
  constructor(body,opts={}){this.body=body;this.status=opts.status??200;this.cookies={set(){}};}
  static next(){return new Response(null);}
  static json(body,opts){return new Response(body,opts);}
  static redirect(url){const result=new Response(null,{status:307});result.url=String(url);return result;}
}
const client={auth:{async getUser(){authCalls++;return {data:{user:session.user}};}},from(table){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:table==='profiles'?session.profile:session.artist,error:session.error};}};}};
const context={exports:{},URL,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://test.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-test-key'}},require(name){return name==='next/server'?{NextResponse:Response}:{createServerClient:()=>client};}};
vm.runInNewContext(ts.transpileModule(await readFile('src/middleware.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
async function request(path){const url=new URL(path,'https://site.test');url.clone=()=>new URL(url);return context.exports.middleware({url:String(url),nextUrl:url,cookies:{getAll:()=>[],set(){}}});}
assert.equal((await request('/api/telemetry/client-error')).status,401);
assert.ok((await request('/home')).url.includes('/login?next='));
assert.equal((await request('/login')).status,200);
session={user:{id:'admin'},profile:{role:'admin',account_status:'active'}};
authCalls=0;assert.equal((await request('/api/health')).status,200);assert.equal(authCalls,0);
assert.equal((await request('/admin')).status,200);
assert.equal((await request('/home')).url,'https://site.test/admin');
session={user:{id:'user'},profile:{role:'user',account_status:'active'}};
assert.equal((await request('/admin')).url,'https://site.test/home');
assert.ok((await request('/artist')).url.includes('/profile?apply=artist'));
session={user:{id:'artist'},profile:{role:'artist',account_status:'active'},artist:{review_status:'approved'}};
assert.equal((await request('/artist')).status,200);
session={user:{id:'suspended'},profile:null};
assert.equal((await request('/api/telemetry/client-error')).status,403);
assert.ok((await request('/home')).url.includes('reason=suspended'));
session.error={message:'database unavailable'};
assert.equal((await request('/home')).status,503);
assert.equal((await request('/login')).status,200);
context.process.env={};
assert.equal((await request('/home')).status,503);
console.log('Middleware regression passed: 15 assertions covering anonymous, user, artist, admin, suspended and unavailable states.');
