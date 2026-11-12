import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as validation from '../../src/features/ai/validation.ts';

const require = createRequire(import.meta.url);
const request = (body) => new Request('http://localhost/api/ai', { method:'POST', body:JSON.stringify(body) });
const valid = { task:'request_triage', prompt:'Не работает освещение' };

test('AI rejects invalid JSON field types and malformed bodies with 400', async () => {
  for (const body of [null, [], {...valid,prompt:123}, {...valid,prompt:{}}, {...valid,imageDataUrl:123}, {...valid,task:'unknown'}]) {
    assert.equal((await validation.readAiInput(request(body))).status, 400);
  }
  assert.equal((await validation.readAiInput(new Request('http://localhost', {method:'POST',body:'{' }))).status, 400);
});

test('AI enforces prompt and streaming body size limits', async () => {
  assert.equal((await validation.readAiInput(request({...valid,prompt:'x'.repeat(12001)}))).status, 413);
  const stream = new ReadableStream({start(controller) {
    controller.enqueue(new Uint8Array(validation.AI_REQUEST_LIMIT + 1)); controller.close();
  }});
  const input = new Request('http://localhost', {method:'POST',body:stream,duplex:'half'});
  assert.equal((await validation.readAiInput(input)).status, 413);
  assert.equal((await validation.readAiInput(request(valid))).ok, true);
});

const result = {title:'Освещение',answer:'Проверьте светильник',category:'repair',priority:'normal',suggested_duplicates:[],citations:[],needs_human_review:false};
test('AI validates response structure and never accepts invented source IDs', () => {
  assert.equal(validation.parseAiResult('null', []), null);
  assert.equal(validation.parseAiResult(JSON.stringify({...result,suggested_duplicates:null}), []), null);
  assert.equal(validation.parseAiResult(JSON.stringify({...result,priority:'invalid'}), []), null);
  assert.equal(validation.parseAiResult(JSON.stringify({...result,citations:['invented']}), []), null);
  assert.equal(validation.parseAiResult(JSON.stringify({...result,citations:['known']}), ['known']).needs_human_review, true);
});

const compiled = ts.transpileModule(readFileSync(new URL('../../src/app/api/ai/route.ts', import.meta.url),'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
async function callRoute(fetchImplementation, body = valid) {
  const routeModule = {exports:{}};
  const mocks = {
    '@/lib/supabase/server':{},
    '@/lib/supabase/config':{isSupabaseConfigured:()=>false,isDemoMode:()=>true},
    '@/features/ai/validation':validation,
  };
  new Function('require','module','exports','fetch',compiled)(name=>mocks[name]??require(name),routeModule,routeModule.exports,fetchImplementation);
  const oldKey = process.env.OPENAI_API_KEY, oldModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY='unit-test-only'; process.env.OPENAI_MODEL='unit-test-only';
  try { return await routeModule.exports.POST(request(body)); }
  finally {
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=oldKey;
    if (oldModel === undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL=oldModel;
  }
}

test('AI route returns 400 without calling provider for a numeric prompt', async () => {
  const response=await callRoute(()=>{throw Error('must not call provider')},{...valid,prompt:123});
  assert.equal(response.status,400);
});

test('AI route attaches a deadline and maps provider timeout to 504', async () => {
  const response=await callRoute(async (_,options)=>{
    assert.ok(options.signal instanceof AbortSignal);
    throw new DOMException('timed out','TimeoutError');
  });
  assert.equal(response.status,504);
});

test('AI route returns 502 for malformed provider output, not a broken UI payload', async () => {
  for(const body of [null,{output_text:'{}'},{output_text:JSON.stringify({...result,citations:['invented']})}]) {
    const response=await callRoute(async ()=>Response.json(body));
    assert.equal(response.status,502);
  }
});
