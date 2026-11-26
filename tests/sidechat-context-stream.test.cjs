'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, '..', 'chatgpt-md-exporter.user.js'), 'utf8');

function load() {
  const requests = [];
  const env = {
    TextEncoder, TextDecoder, btoa, atob, setTimeout, clearTimeout,
    document: { getSelection: () => null, querySelectorAll: () => [] },
    GM_xmlhttpRequest(opts) { requests.push(opts); return { abort() { opts.onabort(); } }; }
  };
  vm.runInNewContext(source.slice(source.indexOf('  const SC_CFG_KEY ='),
    source.indexOf('  /* ---------- 面板 ----------'))
    + '\nthis.api = { scBuildContext, scContextAttachment, scTurnMessages, scStream };', env);
  return { ...env.api, requests };
}
const profile = { model:'test-model', baseUrl:'https://example.invalid/v1', apiKey:'test',
  textEnabled:true, imageEnabled:true, mainContextEnabled:true };
const plain = (value) => JSON.parse(JSON.stringify(value));
const event = (value) => 'data: ' + JSON.stringify(value) + '\n\n';
const pause = () => new Promise((resolve) => setTimeout(resolve, 10));

test('主会话：长对话全部保留为真实 UTF-8 文件，历史不重复附加，重试复用快照', () => {
  const api = load();
  const turns = Array.from({ length:60 }, (_, i) => ({ q:`问题${i}😀`, a:`开始${i}` + '完整正文'.repeat(1000) + `结束${i}` }));
  const ctx = api.scBuildContext('all', turns, profile);
  for (const turn of turns) {
    assert.ok(ctx.text.includes(turn.q));
    assert.ok(ctx.text.includes(turn.a));
  }
  assert.doesNotMatch(ctx.label, /截断/);
  const attachment = api.scContextAttachment(ctx);
  const old = { role:'user', content:'旧问题', ctxAttachment:attachment };
  const question = { role:'user', content:'总结附件', ctxAttachment:attachment };
  const thread = { messages:[old, { role:'assistant', content:'旧回答' }, question] };
  const messages = plain(api.scTurnMessages(thread, question, profile));
  assert.equal(messages[0].content, '旧问题');
  assert.equal(messages[2].content[0].text, '总结附件');
  const file = messages[2].content[1].file;
  assert.match(file.filename, /\.txt$/);
  assert.equal(Buffer.from(file.file_data.split(',')[1], 'base64').toString('utf8'), ctx.text);
  assert.deepEqual(plain(api.scTurnMessages(thread, question, profile)), messages);
  assert.equal(api.scTurnMessages(thread, question, { ...profile, mainContextEnabled:false }).at(-1).content, '总结附件');
});

test('主会话附件：使用 Responses input_file，SSE 正文和思考分开且不重复最终输出', () => {
  const api = load();
  const question = { role:'user', content:'总结', ctxAttachment:api.scContextAttachment({text:'主会话正文', label:'全对话 1 轮'}) };
  const messages = api.scTurnMessages({ messages:[question] }, question, profile);
  const out = { content:'', think:'', done:0, errors:[] };
  api.scStream({ ...profile, reasoningEffort:'high', maxTokens:1000 }, messages,
    (d) => out.content += d, () => out.done++, (e) => out.errors.push(e), (d) => out.think += d);
  const req = api.requests[0];
  assert.match(req.url, /\/responses$/);
  const data = JSON.parse(req.data);
  assert.equal(data.store, false);
  assert.equal(data.input[0].content[1].type, 'input_file');
  assert.equal(data.input[0].content[0].type, 'input_text');
  assert.equal(data.reasoning.effort, 'high');
  assert.equal(data.max_output_tokens, 1000);
  const response = event({ type:'response.reasoning_summary_text.delta', delta:'思考' })
    + event({ type:'response.output_text.delta', delta:'答案' })
    + event({ type:'response.completed', response:{ output:[{ type:'message', content:[{ type:'output_text', text:'答案' }] }] } });
  req.onload({ status:200, responseText:response });
  assert.deepEqual(out, { content:'答案', think:'思考', done:1, errors:[] });
});

test('流读取器：从 onloadstart 开始读取，onload 前正文已可见，重复事件不重复正文', async () => {
  const api = load();
  let controller;
  const stream = new ReadableStream({ start(c) { controller = c; } });
  let content = '';
  let done = false;
  api.scStream(profile, [{ role:'user', content:'问题' }], (d) => content += d, () => done = true, (e) => { throw e; });
  const req = api.requests[0];
  assert.equal(typeof req.onloadstart, 'function');
  const head = { status:200, response:stream };
  req.onloadstart(head);
  const first = event({ choices:[{ delta:{ content:'先到的正文' } }] });
  controller.enqueue(new TextEncoder().encode(first));
  await pause();
  assert.equal(content, '先到的正文');
  assert.equal(done, false);
  req.onprogress({ ...head, responseText:first });
  assert.equal(content, '先到的正文');
  controller.close();
  req.onload(head);
  await pause();
  assert.equal(done, true);
});

test('主会话附件：旧接口不支持 Responses 时明确提示并保留全文回退', () => {
  const api = load();
  const full = '开始😀' + '完整正文'.repeat(6000) + '结束';
  const question = { role:'user', content:'总结', ctxAttachment:api.scContextAttachment({text:full, label:'全对话'}) };
  const messages = api.scTurnMessages({ messages:[question] }, question, profile);
  const notices = [];
  let answer = '';
  const handle = api.scStream(profile, messages, (d) => answer += d, () => {}, (e) => { throw e; }, null, (n) => notices.push(n));
  api.requests[0].onload({ status:404, responseText:'Not Found' });
  assert.equal(api.requests.length, 2);
  const fallback = api.requests[1];
  assert.match(fallback.url, /\/chat\/completions$/);
  assert.ok(JSON.parse(fallback.data).messages[0].content.some((part) => part.type === 'text' && part.text.includes(full)));
  assert.match(notices[0], /完整文本/);
  fallback.onload({ status:200, responseText:JSON.stringify({ choices:[{ message:{ content:'已读取' } }] }) });
  assert.equal(answer, '已读取');
  assert.equal(handle.settled, true);
});

test('主会话附件：流式 HTTP 错误保留原因；鉴权、超限、服务故障不自动重试', async () => {
  for (const status of [401, 413, 429, 500]) {
    const api = load();
    const question = { role:'user', content:'总结', ctxAttachment:api.scContextAttachment({text:'正文'}) };
    let error;
    api.scStream(profile, api.scTurnMessages({ messages:[question] }, question, profile), () => {}, () => {}, e => error = e);
    const stream = new ReadableStream({ start(c) {
      c.enqueue(new TextEncoder().encode(JSON.stringify({error:{message:'服务端具体原因'}})));
      c.close();
    } });
    await api.requests[0].onload({ status, response:stream, responseText:'' });
    assert.match(error.message, /服务端具体原因/);
    assert.equal(api.requests.length, 1);
  }
});

test('主会话附件：回退后的停止中止当前请求，迟到的响应不再显示', () => {
  const api = load();
  const question = { role:'user', content:'总结', ctxAttachment:api.scContextAttachment({text:'正文'}) };
  let callbacks = 0;
  const handle = api.scStream(profile, api.scTurnMessages({ messages:[question] }, question, profile),
    () => callbacks++, () => callbacks++, () => callbacks++);
  api.requests[0].onload({status:404, responseText:'Not Found'});
  handle.abort();
  api.requests[1].onload({status:200, responseText:event({choices:[{delta:{content:'迟到'}}]})});
  assert.equal(handle.settled, true);
  assert.equal(callbacks, 0);
});

test('Responses：不完整输出保留正文并报告原因；已输出内容不能触发协议重试', () => {
  const api = load();
  const question = { role:'user', content:'总结', ctxAttachment:api.scContextAttachment({text:'正文'}) };
  let content = '';
  let error;
  api.scStream(profile, api.scTurnMessages({ messages:[question] }, question, profile),
    d => content += d, () => assert.fail('不完整输出不应报告正常完成'), e => error = e);
  api.requests[0].onload({ status:200, responseText:
    event({type:'response.output_text.delta', delta:'部分正文'})
    + event({type:'response.incomplete', response:{incomplete_details:{reason:'max_output_tokens'}}}) });
  assert.equal(content, '部分正文');
  assert.match(error.message, /max_output_tokens/);
  assert.equal(api.requests.length, 1);
});

test('Responses：非流式 JSON 回退仍在收包后一次发出完整正文', async () => {
  const api = load();
  const question = { role:'user', content:'总结', ctxAttachment:api.scContextAttachment({text:'正文'}) };
  let content = '';
  let done = false;
  api.scStream(profile, api.scTurnMessages({ messages:[question] }, question, profile),
    d => content += d, () => done = true, e => { throw e; });
  const text = '长回复😀'.repeat(5000);
  await api.requests[0].onload({ status:200, responseText:JSON.stringify({
    output_text:text, status:'completed'
  }) });
  assert.equal(content, text);
  assert.equal(done, true);
});
