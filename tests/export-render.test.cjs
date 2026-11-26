'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, '..', 'chatgpt-md-exporter.user.js'), 'utf8');

function fixture(overrides = {}) {
  const env = {
    settings:{ mode:'qa', embedImages:false, includeTools:false, includeReasoning:false, includeCode:true },
    PUA:/[\uE000-\uF8FF]/g, TextEncoder, TextDecoder, Blob, URL, URLSearchParams,
    console:{ warn() {}, debug() {} },
    sanitizeFilePart:name => name.replace(/[\\/:*?"<>|]/g, '_'),
    extFromMime:mime => mime === 'image/png' ? 'png' : 'bin',
    blobToDataURI:async blob => 'data:' + blob.type + ';base64,' + Buffer.from(await blob.arrayBuffer()).toString('base64'),
    API:{ getFileInfo:async () => { throw new Error('unexpected file download'); } },
    ...overrides
  };
  const begin = source.indexOf('  function craberRole(');
  const end = source.lastIndexOf('  /* ============================================================', source.indexOf('   * 状态：按 convId', begin));
  assert.ok(begin > 0 && end > begin);
  vm.runInNewContext(source.slice(begin, end) + '\nthis.api = { groupTurns, craberCleanMarkdown, renderAssistantText, renderAnswerNode, renderTurn, collectAttachments, fetchAttachmentBlobs, makeZipImageSink, craberStats };', env);
  return { ...env.api, env };
}
const message = (text, extra = {}) => ({ id:'answer', author:{role:'assistant'}, content:{ content_type:'text', parts:[text] }, ...extra });
const question = (text, extra = {}) => ({message:message(text, {id:'question', author:{role:'user'}, ...extra})});

test('导出：工具接收方、analysis 和隐藏消息不能混入回答；用户 JSON 示例保留', () => {
  const f = fixture();
  for (const extra of [ {recipient:'functions.fetch'}, {recipient:'python', content:{content_type:'code',text:'print(1)',language:'python'}},
    {channel:'analysis'}, {metadata:{is_visually_hidden_from_conversation:true}}, {author:{role:'system'}} ]) {
    assert.equal(f.renderAnswerNode({message:message('{"path":"/GitHub/example/fetch","args":{}}', extra)}, {}), '');
  }
  assert.match(f.renderAnswerNode({message:message('{"path":"/example"}', {recipient:'all'})}, {}), /example/);
  f.env.settings.includeTools = true;
  const tools = f.renderAnswerNode({message:message('print(1)', {recipient:'python'})}, {});
  assert.match(tools, /<details>/);
  assert.match(tools, /print\(1\)/);
});

test('导出：C++ 头文件、模板、行内代码、中文注释和 Markdown 示例逐字保留', () => {
  const f = fixture();
  const inputs = [
    '#include <iostream>\nstd::vector<SimpleHole> holes;',
    '`std::vector<SimpleHole>` 和 `<text>示例</text>`',
    'std::vector<text> values;\n#include <stack>',
    '```cpp\n// 第一行注释\n// 第二行注释\n// 第三行注释\n#include <vector>\n\n\nstd::vector<int> v;\n```',
    '````markdown\n## 标题\n```cpp\n#include <vector>\n```\n````',
    '    <text>这是缩进代码</text>\n    std::vector<int> v;',
    '$$\n\\mathbf{P}(u,v)=\\mathbf{O}+v\\mathbf{d}\n$$\n\n| 变量 | 含义 |\n|---|---|\n| x | 坐标 |'
  ];
  for (const input of inputs) assert.equal(f.craberCleanMarkdown(input), input);
});

test('导出：仅转换明确的展示组件，用户输入不经组件清理', async () => {
  const f = fixture();
  assert.equal(f.craberCleanMarkdown('<box>\n  <text>正文</text>\n</box>').trim(), '正文');
  const raw = '<text>用户粘贴的源码</text>\n#include <iostream>\n`std::vector<int>`';
  const turn = {question:question(raw), answers:[{message:message('正常回答')}]};
  assert.ok((await f.renderTurn(turn)).md.includes(raw));
});

test('导出：静态组件保留文字层次；动态模板保留为单独原文块而非残片', () => {
  const f = fixture();
  const staticCard = '引言\n\n<box>\n    <row><text>定径段</text><text>扩散段</text></row>\n</box>\n\n结论';
  const plain = f.craberCleanMarkdown(staticCard);
  assert.doesNotMatch(plain, /<\/?(?:box|row|text)\b/);
  assert.match(plain, /定径段\s+扩散段/);
  assert.equal(f.craberCleanMarkdown('<box><text>类型 `std::vector<text>`</text></box>'), '类型 `std::vector<text>`');
  const dynamic = '<box>\n{#each holes as h}\n<text>直径：{h.dia}</text>\n{/each}\n</box>';
  const out = f.craberCleanMarkdown('引言\n\n'+dynamic+'\n\n结论');
  assert.ok(out.includes(dynamic),'未执行的模板不能删掉数据和控制结构');
  assert.match(out, /<details>[\s\S]*```[\s\S]*\{h.dia\}[\s\S]*```[\s\S]*<\/details>/);
  assert.ok(out.startsWith('引言') && out.endsWith('结论'));
});

test('导出：引用索引过期、重复、越界、emoji 偏移都不截断正文或代码', () => {
  const f = fixture();
  const marker = '\uE200cite\uE202turn0search1\uE201';
  const body = '开头😀\n这里定义了整个结构体\n```cpp\n#include <iostream>\n```\n' + marker + '\n末尾';
  const ref = {type:'grouped_webpages', matched_text:marker, start_idx:8, end_idx:50, items:[{title:'资料',url:'https://example.com/paper'}]};
  const refs = [ref, {...ref}, {type:'hidden',start_idx:0,end_idx:9999}, {type:'sources_footnote',matched_text:' ',start_idx:1,end_idx:3}];
  const out = f.renderAssistantText(message(body, {metadata:{content_references:refs}}), {});
  assert.equal(out, body.replace(marker, ' ([资料](https://example.com/paper))'));
  const code = '```text\n' + marker + '\n```';
  assert.equal(f.renderAssistantText(message(code,{metadata:{content_references:[ref]}}),{}),code);
});

test('导出：未知富内容引用不按索引删除原文，合法索引引用可替换', () => {
  const f = fixture();
  const body = '完整正文\n<box><text>教学卡片</text></box>\n末尾';
  assert.equal(f.renderAssistantText(message(body,{metadata:{content_references:[{type:'unknown_widget',start_idx:0,end_idx:20}]}}),{}),body);
  const marker = '\uE200cite\uE202turn1search0\uE201';
  const ref = {type:'grouped_webpages',start_idx:2,end_idx:2+marker.length,items:[{title:'来源',url:'https://example.com'}]};
  assert.equal(f.renderAssistantText(message('前言'+marker+'后文',{metadata:{content_references:[ref]}}),{}), '前言 ([来源](https://example.com))后文');
});

test('导出：每条消息的未闭合围栏局部闭合，不污染下一条消息', async () => {
  const f = fixture();
  const turn = {question:question('问题'),answers:[{message:message('```cpp\n#include <vector>')},{message:message('## 下一段\n正文')}]};
  assert.match((await f.renderTurn(turn)).md, /#include <vector>\n```\n\n## 下一段/);
});

test('导出：生成文件与图片下载落地，按原消息定位且相同文件名不覆盖', async () => {
  const calls = [], entries = new Map();
  const f = fixture({
    API:{ async getSandboxFileInfo(options) { calls.push(options); return {blob:new Blob(['content:'+options.messageId],{type:options.path.endsWith('.png')?'image/png':'application/pdf'})}; } }
  });
  f.env.settings.embedImages = true;
  const sink = f.makeZipImageSink({add(name,bytes) { entries.set(name,bytes); }}, '会话/');
  const turn = { conversationId:'conversation-B', projectId:'project-B', question:question('下载'), answers:[
    {message:message('[下载报告](sandbox:/mnt/data/报告.pdf)\n![预览](sandbox:/mnt/data/preview.png)\n`[示例](sandbox:/mnt/data/code.pdf)`',{id:'msg-1'})},
    {message:message('[新报告](sandbox:/mnt/data/报告.pdf)',{id:'msg-2'})}
  ]};
  const {md} = await f.renderTurn(turn, null, sink);
  assert.equal(calls.length,3);
  assert.ok(calls.every(c=>c.conversationId === 'conversation-B' && c.projectId === 'project-B'));
  assert.deepEqual(calls.map(c=>c.messageId),['msg-1','msg-1','msg-2']);
  assert.match(md, /\[下载报告\]\(files\/%E6%8A%A5%E5%91%8A.pdf\)/);
  assert.match(md, /!\[预览\]\(images\/img_1.png\)/);
  assert.ok(md.includes('`[示例](sandbox:/mnt/data/code.pdf)`'));
  assert.ok(entries.has('会话/files/报告.pdf'));
  assert.ok(entries.has('会话/files/报告 (2).pdf'));
  assert.equal(new TextDecoder().decode(entries.get('会话/files/报告 (2).pdf')),'content:msg-2');
});

test('导出：预览不下载生成文件；下载失败保留名称并标明原因', async () => {
  let calls = 0;
  const f = fixture({API:{async getSandboxFileInfo(){calls++;throw new Error('HTTP 404');}}});
  const turn = {conversationId:'c',question:question('下载'), answers:[{message:message('[报告](sandbox:/mnt/data/report.pdf)')}]};
  const sink = f.makeZipImageSink({add(){ assert.fail('不应写入失败文件'); }});
  await f.renderTurn(turn,null,sink,{downloadAttachments:false});
  assert.equal(calls,0);
  const result = await f.renderTurn(turn,null,sink);
  assert.equal(calls,1);
  assert.match(result.md,/报告.*下载失败/);
  assert.doesNotMatch(result.md,/\]\(sandbox:/);
  assert.equal(f.craberStats.attFail,1);
});

test('导出：上传附件元数据带入原会话项目，支持直接返回文件内容', async () => {
  const calls = [];
  const f = fixture({API:{async getFileInfo(id,opts){calls.push({id,...opts});return {blob:new Blob(['#include <iostream>'])};}}});
  const turn = {conversationId:'c-original',projectId:'p-original',question:question('',{
    metadata:{attachments:[{id:'file_upload',name:'main.cpp',mime_type:'text/plain'}]}
  }),answers:[]};
  const entries = new Map();
  const result = await f.renderTurn(turn,null,f.makeZipImageSink({add(name,bytes){entries.set(name,bytes);}}));
  assert.equal(calls[0].projectId,'p-original');
  assert.equal(calls[0].conversationId,'c-original');
  assert.match(result.md,/files\/main.cpp/);
  assert.equal(new TextDecoder().decode(entries.get('files/main.cpp')),'#include <iostream>');
});

test('导出：整个会话实际生成 ZIP，正文和资源路径对应，附件字节完整', async () => {
  const requested=[];
  const png=Buffer.from('89504e470d0a1a0a','hex');
  const env={Blob,URL,URLSearchParams,TextEncoder,TextDecoder,Date,
    location:{origin:'https://chatgpt.com',pathname:'/c/other-conversation'},
    apiWait:async()=>{},noteRateLimit(){},settings:{mode:'qa',embedImages:true},PUA:/[\uE000-\uF8FF]/g,
    sanitizeFilePart:name=>name.replace(/[\\/:*?"<>|]/g,'_'),
    console:{warn(){},debug(){}},
    fetch:async(url,opts)=>{
      requested.push({url,opts});
      if(url==='/backend-api/files/download/file_html?inline=false') return new Response('<html>论文</html>',{headers:{'Content-Type':'text/html'}});
      if(url.startsWith('/backend-api/conversation/source-c/interpreter/download?')) {
        const path=new URL(url,'https://chatgpt.com').searchParams.get('sandbox_path');
        return Response.json({download_url:'/backend-api/estuary/content?file='+encodeURIComponent(path)});
      }
      if(url.startsWith('https://chatgpt.com/backend-api/estuary/content?')) {
        const path=new URL(url).searchParams.get('file');
        return path.endsWith('.png')?new Response(png,{headers:{'Content-Type':'image/png'}})
          :new Response('PDF fixture',{headers:{'Content-Type':'application/pdf'}});
      }
      throw new Error('unexpected URL '+url);
    }
  };
  const begin=source.indexOf('  const API = {');
  const end=source.lastIndexOf('  /* ============================================================',source.indexOf('   * 状态：按 convId'));
  vm.runInNewContext(source.slice(begin,end)+'\nAPI.getToken=async()=>"fixture-token"; this.api={createZip,makeZipImageSink,renderConversationToMd};',env);
  const zip=env.api.createZip();
  const token='\uE200cite\uE202turn0search0\uE201';
  const conv={conversation_id:'source-c',gizmo_id:'project-source',title:'导出验收',messages:[
    question('#include <iostream>\n`std::vector<text>`',{metadata:{attachments:[{id:'file_html',name:'savedrecs.html',mime_type:'text/html'}]}}).message,
    message('{"path":"/GitHub/example","args":{}}',{recipient:'functions.fetch'}),
    message('正文😀\n```cpp\n#include <vector>\n```\n'+token+'\n[报告](sandbox:/mnt/data/report.pdf)\n![模型](sandbox:/mnt/data/model.png)',{
      metadata:{content_references:[{type:'grouped_webpages',matched_text:token,start_idx:0,end_idx:40,items:[{title:'来源',url:'https://example.com'}]}]}})
  ]};
  const {md}=await env.api.renderConversationToMd(conv,env.api.makeZipImageSink(zip,'导出/'));
  zip.add('导出/对话.md',new TextEncoder().encode(md));
  const bytes=Buffer.from(await zip.generate().arrayBuffer());
  const entries=new Map();
  for(let pos=0; bytes.readUInt32LE(pos)===0x04034b50;) {
    const size=bytes.readUInt32LE(pos+18), nameLen=bytes.readUInt16LE(pos+26), extraLen=bytes.readUInt16LE(pos+28);
    const path=bytes.subarray(pos+30,pos+30+nameLen).toString('utf8');
    const start=pos+30+nameLen+extraLen;
    entries.set(path,bytes.subarray(start,start+size));
    pos=start+size;
  }
  assert.equal(entries.get('导出/files/savedrecs.html').toString(),'<html>论文</html>');
  assert.equal(entries.get('导出/files/report.pdf').toString(),'PDF fixture');
  assert.deepEqual(entries.get('导出/images/img_1.png'),png);
  assert.match(md,/#include <iostream>/);
  assert.match(md,/`std::vector<text>`/);
  assert.match(md,/#include <vector>/);
  assert.match(md,/\[来源\]\(https:\/\/example.com\)/);
  assert.doesNotMatch(md,/sandbox:|GitHub\/example|下载失败/);
  for(const link of md.matchAll(/\]\((files\/[^)]+|images\/[^)]+)\)/g)) assert.ok(entries.has('导出/'+decodeURIComponent(link[1])));
  assert.ok(requested.filter(r=>r.url.startsWith('/backend-api/')).every(r=>r.opts.headers['chatgpt-project-id']==='project-source'));
  assert.ok(requested.filter(r=>r.url.startsWith('https:')).every(r=>!r.opts.headers?.Authorization));
});
