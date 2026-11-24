import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
async function load(path, imports, globals = {}) {
  const context = { exports: {}, require: (name) => imports[name] ?? require(name),
    Request, Response, URL, Buffer, AbortSignal, crypto, Date, ...globals };
  vm.runInNewContext(ts.transpileModule(await readFile(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText, context, { filename: path });
  return context.exports;
}
const contracts = await load('src/lib/ai/contracts.ts', {});
const draft = { inspiration: '修补雨声的纸符师', style: '国风异能', type: '主角', world: '', extra: '' };
const character = { name: '听雨', gender: '女', ageStage: '成年', identity: '纸符师', tags: ['雨声'],
  appearance: '青色短袍', personality: ['谨慎'], background: '替小镇修补失落的雨声', ability: '保存声音',
  weakness: '怕雷', speech: '先听一听', summary: '替人找回雨夜记忆', notes: '原创', style: '国风异能', type: '主角' };
check(contracts.generationRequestSchema.safeParse({ kind: 'character', input: draft }).success, 'valid draft');
check(!contracts.generationRequestSchema.safeParse({ kind: 'character', input: { ...draft, inspiration: '' } }).success, 'reject blank');
check(!contracts.generationRequestSchema.safeParse({ kind: 'character', input: { ...draft, inspiration: '雨'.repeat(1201) } }).success, 'bound input');
check(!contracts.generationRequestSchema.safeParse({ kind: 'other', input: draft }).success, 'reject unknown operation');
check(!contracts.generationRequestSchema.safeParse({ kind: 'story', character, characterId: '../other' }).success, 'validate ID');
check(!contracts.characterContentSchema.safeParse({ ...character, name: '' }).success, 'reject empty model output');
check(!contracts.interactionSchema.safeParse({ lines: [] }).success, 'reject empty dialogue');
check(!contracts.buildPrompt({ kind: 'story', character, characterId: 'private-id' }).includes('private-id'), 'do not send database IDs');

let sdkCalls = 0, settings, catalogFailure = false, paidPrice = false;
const environment = { AI_TEXT_ENABLED: 'true', AI_FREE_ONLY_VERIFIED: 'true' };
const server = await load('src/lib/ai/server.ts', {
  './contracts': contracts,
  ai: { Output: { object: (value) => value }, async generateText(options) {
    sdkCalls++; settings = options;
    const result = options.prompt.includes('生成原创角色设定') ? character : options.prompt.includes('4至8句') ? { lines: ['听雨：你好', '你：你好'] } : { title: '雨夜', body: '她走进雨声里。', bullets: ['寻找旧伞'] };
    return { output: options.output.schema.parse(result) };
  } }
}, { process: { env: environment }, fetch: async () => new Response(JSON.stringify({ data: { endpoints: [{
  provider_name: 'nvidia', pricing: { prompt: '0', completion: paidPrice ? '0.01' : '0', discount: 0 }
}] } }), { status: catalogFailure ? 503 : 200 }) });
check(server.aiEnabled(), 'both switches required');
environment.AI_FREE_ONLY_VERIFIED = 'false'; check(!server.aiEnabled(), 'unverified must be disabled'); environment.AI_FREE_ONLY_VERIFIED = 'true';
const generated = await server.generateAi({ kind: 'character', input: draft }, new AbortController().signal);
check(generated.character.name === '听雨' && generated.character.id && generated.character.style === draft.style, 'valid complete character');
check(settings.model.endsWith('-free') && settings.providerOptions.gateway.only.join() === 'nvidia', 'pin free model/provider');
check(settings.maxRetries === 0 && settings.maxOutputTokens === 2400, 'bound requests and output');
check(!settings.providerOptions.gateway.models && !settings.providerOptions.gateway.tags, 'no paid fallback/reporting');
for (const kind of ['story', 'dialogue', 'interaction']) {
  const value = await server.generateAi({ kind, character }, new AbortController().signal);
  check(kind === 'interaction' ? value.lines.length === 2 : value.continuation.title === '雨夜', kind);
}
const countBefore = sdkCalls;
paidPrice = true;
await assert.rejects(server.generateAi({ kind: 'character', input: draft }, new AbortController().signal), /免费模型当前不可用/); checks++;
check(sdkCalls === countBefore, 'price increase must not call model');
paidPrice = false; catalogFailure = true;
await assert.rejects(server.verifyFreeModel(), /核对免费模型/); checks++; catalogFailure = false;
for (const [upstream, expected] of [[402, 402], [429, 429], [401, 503], [403, 503]]) {
  check(server.publicAiError({ cause: { statusCode: upstream, body: 'SECRET' } }).status === expected, `map ${upstream}`);
}
check(!server.publicAiError(new Error('SECRET')).message.includes('SECRET'), 'redact upstream failures');
check(server.publicAiError({ name: 'TimeoutError' }).status === 504, 'timeout response');

const docs = ['terms', 'privacy', 'content_rules', 'copyright'].map((type) => ({ id: type, document_type: type }));
let session, routeCalls = 0, inserted, throwModel, releaseModel;
function reset() { session = { user: { id: crypto.randomUUID() }, active: true, consent: true, owned: true }; inserted = null; throwModel = null; }
reset();
const supabase = {
  auth: { async getUser() { return { data: { user: session.user } }; } },
  from(table) {
    const query = { select() { return this; }, eq() { return this; }, in() { return this; }, is() { return this; },
      insert(value) { inserted = value; return this; },
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
      async single() { return result(); }, async maybeSingle() { return result(); } };
    function result() {
      if (table === 'profiles') return { data: { account_status: session.active ? 'active' : 'suspended' }, error: session.profileError };
      if (table === 'legal_documents') return { data: session.missingDocs ? [] : docs };
      if (table === 'legal_consents') return { data: session.consent ? docs.map((d) => ({ document_id: d.id })) : [] };
      if (table === 'characters') return { data: session.owned ? { id: 'owned' } : null };
      return { data: session.saveError ? null : { id: 'generation-id' }, error: session.saveError };
    }
    return query;
  }
};
const route = await load('src/app/api/ai/generate/route.ts', {
  'next/server': { NextResponse: Response },
  '@/lib/supabase/server': { createSupabaseServerClient: async () => supabase },
  '@/lib/ai/contracts': contracts,
  '@/lib/ai/server': { ...server, async generateAi() {
    routeCalls++; if (throwModel) throw throwModel;
    if (releaseModel) await new Promise((resolve) => { releaseModel = resolve; });
    return generated;
  } }
});
const request = (body = { kind: 'character', input: draft }, overrides = {}) => new Request('https://site.test/api/ai/generate', {
  method: 'POST', headers: { origin: 'https://site.test', 'content-type': 'application/json', ...overrides },
  body: typeof body === 'string' ? body : JSON.stringify(body)
});
async function expect(status, req = request()) { const result = await route.POST(req); check(result.status === status, `expected ${status}, got ${result.status}`); return result.json(); }
await expect(403, request(undefined, { origin: 'https://other.test' }));
await expect(415, request(undefined, { 'content-type': 'text/plain' }));
environment.AI_TEXT_ENABLED = 'false'; await expect(503); environment.AI_TEXT_ENABLED = 'true';
session.user = null; await expect(401); reset();
session.active = false; await expect(403); reset();
session.profileError = { message: 'SECRET' }; await expect(503); reset();
session.missingDocs = true; await expect(503); reset();
session.consent = false; await expect(403); reset();
await expect(400, request('{'));
await expect(400, request({ kind: 'character', input: { ...draft, inspiration: '' } }));
await expect(413, request('x'.repeat(40001)));
session.owned = false; await expect(403, request({ kind: 'story', character, characterId: crypto.randomUUID() })); reset();
check(routeCalls === 0, 'all denial paths must avoid model calls');
const success = await expect(200);
check(success.character.name === '听雨' && success.generationId === 'generation-id', 'returns real output and history');
check(inserted.owner_id === session.user.id && inserted.prompt.mode === 'ai', 'owner comes from verified session');
await expect(429); reset();
session.saveError = { message: 'SECRET' }; const unsaved = await expect(200);
check(unsaved.character && unsaved.warning && unsaved.generationId === null, 'save failure preserves output'); reset();
throwModel = { statusCode: 402 }; await expect(402); reset();
releaseModel = true;
const pending = route.POST(request());
while (releaseModel === true) await new Promise((r) => setTimeout(r, 0));
await expect(429);
releaseModel(); releaseModel = null;
check((await pending).status === 200, 'first request completes');
console.log(`AI regression passed: ${checks} checks; no live model calls or account writes.`);
