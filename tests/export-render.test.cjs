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
    extFromMime:mime => mime === 'image/png' ? 'png' : mime === 'image/svg+xml' ? 'svg' : 'bin',
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
    message('正文😀\n<card>\n```cpp\n#include <vector>\n```\n'+token+'\n    [报告](sandbox:/mnt/data/report.pdf)\n    <AsyncImage src="sandbox:/mnt/data/model.png" alt="模型"/>\n</card>\n<svg viewBox="0 0 100 40"><text x="4" y="20">示意图</text></svg>',{
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
  assert.ok(entries.has('导出/files/report.pdf'),JSON.stringify({paths:[...entries.keys()],md}));
  assert.equal(entries.get('导出/files/report.pdf').toString(),'PDF fixture');
  assert.deepEqual(entries.get('导出/images/img_1.png'),png);
  assert.ok(entries.has('导出/images/img_2.svg'),JSON.stringify({paths:[...entries.keys()],md}));
  assert.match(entries.get('导出/images/img_2.svg').toString(),/<text x="4" y="20">示意图<\/text>/);
  assert.match(md,/#include <iostream>/);
  assert.match(md,/`std::vector<text>`/);
  assert.match(md,/#include <vector>/);
  assert.match(md,/\[来源\]\(https:\/\/example.com\)/);
  assert.doesNotMatch(md,/sandbox:|GitHub\/example|下载失败|<card|<AsyncImage|<svg/);
  for(const link of md.matchAll(/\]\((files\/[^)]+|images\/[^)]+)\)/g)) assert.ok(entries.has('导出/'+decodeURIComponent(link[1])));
  assert.ok(requested.filter(r=>r.url.startsWith('/backend-api/')).every(r=>r.opts.headers['chatgpt-project-id']==='project-source'));
  assert.ok(requested.filter(r=>r.url.startsWith('https:')).every(r=>!r.opts.headers?.Authorization));
});

test('富内容：卡片跨代码围栏保留代码，嵌套列表、标题、链接和写作块转为 Markdown', () => {
  const f=fixture();
  const code='  ```cpp\n  #include <iostream>\n  std::vector<text> values;\n  ```';
  const raw='<WritingBlock id="123" variant="document"># 讲义\n<card gap={3}>\n    <title size="xl">练习</title>\n    <caption>完成以下任务</caption>\n'+code+'\n    <list marker="number"><list-item>读取<list><list-item>检查</list-item></list></list-item><list-item>输出</list-item></list>\n    <Link url="https://example.com/a?x=1&amp;y=2" title="资料"/><spacer/>\n</card>\n</WritingBlock>';
  const md=f.craberCleanMarkdown(raw);
  assert.ok(md.includes(code));
  assert.match(md,/\*\*练习\*\*/);
  assert.match(md,/1\. 读取\n\s+- 检查\n2\. 输出/);
  assert.match(md,/\[资料\]\(https:\/\/example.com\/a\?x=1&y=2\)/);
  assert.doesNotMatch(md,/<\/?(?:WritingBlock|card|title|caption|list|list-item|Link|spacer)\b/);
});

test('富内容：表格与 Chart JSON 静态数据可读，表达式不能执行', () => {
  const f=fixture();
  const raw='<table><table-row><table-cell>统计项</table-cell><table-cell>值</table-cell></table-row><table-row><table-cell>数量</table-cell><table-cell>48</table-cell></table-row></table>';
  assert.match(f.craberCleanMarkdown(raw),/\| 统计项 \| 值 \|\n\| --- \| --- \|\n\| 数量 \| 48 \|/);
  const chart='<Chart content={{"xKey":"strategy","series":[{"dataKey":"segments","label":"填充段数量"}],"data":[{"strategy":"固定间距","segments":2774},{"strategy":"自适应","segments":2775}],"meta":{"footer":"报告记录"}}}/>';
  const md=f.craberCleanMarkdown(chart);
  assert.match(md,/填充段数量/); assert.match(md,/固定间距 \| 2774/); assert.match(md,/报告记录/);
  const dynamic='<card><button onClick={()=>{throw new Error("must not run")}}>提交</button></card>';
  assert.ok(f.craberCleanMarkdown(dynamic).includes(dynamic));
  assert.match(f.craberCleanMarkdown(dynamic),/<details>/);
});

test('富内容：卡片内缩进的 sandbox 链接和 Link 组件都下载，真实代码链接不下载', async () => {
  const calls=[],entries=new Map();
  const f=fixture({API:{async getSandboxFileInfo(file){calls.push(file.path);return {blob:new Blob(['file'],{type:'application/pdf'})};}}});
  const raw='<box>\n    [PDF](sandbox:/mnt/data/lesson.pdf)\n    <card>\n        <Link url="sandbox:/mnt/data/other.pdf" title="附件"/>\n    </card>\n    ```text\n    [示例](sandbox:/mnt/data/not-a-file.pdf)\n    ```\n</box>';
  const turn={conversationId:'c',question:question('下载'),answers:[{message:message(raw)}]};
  const result=await f.renderTurn(turn,null,f.makeZipImageSink({add(n,b){entries.set(n,b);}}));
  assert.deepEqual(calls,['/mnt/data/lesson.pdf','/mnt/data/other.pdf']);
  assert.match(result.md,/\[PDF\]\(files\/lesson.pdf\)/);
  assert.match(result.md,/\[附件\]\(files\/other.pdf\)/);
  assert.match(result.md,/sandbox:\/mnt\/data\/not-a-file.pdf/);
});

test('富内容：图片组件从实际 src 导出，没有源地址的 query/ref 明确说明', async () => {
  const calls=[],entries=new Map();
  const f=fixture({gmFetchBlob:async(url)=>{calls.push(url);return new Blob(['png'],{type:'image/png'});}});
  f.env.settings.embedImages=true;
  const raw='<card>\n    <AsyncImage src="https://images.example/model.png" alt="模型"/>\n    <AsyncImage query="CAD hole"/>\n    <AsyncImage ref="turn181639image1"/>\n</card>';
  const result=await f.renderTurn({question:question('配图'),answers:[{message:message(raw)}]},null,f.makeZipImageSink({add(n,b){entries.set(n,b);}}));
  assert.deepEqual(calls,['https://images.example/model.png']);
  assert.match(result.md,/!\[模型\]\(images\/img_1.png\)/);
  assert.match(result.md,/图片未导出.*未提供图片地址/);
  assert.doesNotMatch(result.md,/<AsyncImage/);
});

test('富内容：图片关闭、下载失败和预览是不同状态，上传附件保留 HTTP 原因', async () => {
  const f=fixture({API:{async getFileInfo(){throw new Error('文件信息获取失败: 403');}}});
  const turn={conversationId:'c',question:question('截图',{metadata:{attachments:[{id:'file_txt',name:'main.cpp'}]}}),answers:[{message:message('![预览](sandbox:/mnt/data/preview.png)')}]};
  const {md}=await f.renderTurn(turn,null,f.makeZipImageSink({add(){}}));
  assert.match(md,/已关闭图片导出/); assert.match(md,/main.cpp.*HTTP 403/);
  assert.doesNotMatch(md,/!\[预览\]\(sandbox:/);
});

test('富内容：静态 SVG 作为图片保存，标签文字不丢失，不执行脚本和外部资源', async () => {
  const f=fixture(),entries=new Map(); f.env.settings.embedImages=true;
  const svg='<svg viewBox="0 0 120 40" width="100%"><rect x="1" y="1" width="118" height="38" fill="white"/><text x="8" y="24" fontSize="12" fill="black">圆柱面</text></svg>';
  const turn={question:question('示意图'),answers:[{message:message(svg)}]};
  const {md}=await f.renderTurn(turn,null,f.makeZipImageSink({add(n,b){entries.set(n,b);}}));
  assert.match(md,/!\[.*\]\(images\/img_1.svg\)/);
  const saved=new TextDecoder().decode(entries.get('images/img_1.svg'));
  assert.match(saved,/<text[^>]*font-size="12"[^>]*>圆柱面<\/text>/);
  assert.match(saved,/xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  const unsafe='<svg><script>throw new Error("must not run")</script></svg>';
  assert.match(f.craberCleanMarkdown(unsafe),/<details>/);
  assert.doesNotMatch(f.craberCleanMarkdown(unsafe),/!\[.*data:/);
});

test('富内容：下载失败图片不显示远程假成功，重复图片地址只请求一次', async () => {
  const calls=[];
  const f=fixture({gmFetchBlob:async(url)=>{calls.push(url);throw new Error('图片请求失败: 403');}});
  f.env.settings.embedImages=true;
  const body='<AsyncImage src="https://images.example/a.png"/>\n![同一图片](https://images.example/a.png)';
  const {md}=await f.renderTurn({question:question('配图'),answers:[{message:message(body)}]},null,f.makeZipImageSink({add(){assert.fail('失败图片不能落盘');}}));
  assert.equal(calls.length,1);
  assert.equal(f.craberStats.imgTotal,1);assert.equal(f.craberStats.imgFail,1);
  assert.match(md,/图片未导出：下载失败，HTTP 403/);
  assert.doesNotMatch(md,/!\[.*https:\/\/images/);
});

test('富内容：图片 ref 只能匹配元数据中的同一引用，代码中的组件不下载', async () => {
  const calls=[],entries=new Map();
  const f=fixture({gmFetchBlob:async(url)=>{calls.push(url);return new Blob(['image'],{type:'image/png'});}});
  f.env.settings.embedImages=true;
  const body='<AsyncImage ref="turn1image2"/>\n`<AsyncImage src="https://images.example/code.png"/>`';
  const metadata={content_references:[{type:'image_group',images:[{ref_id:'turn1image2',image_result:{content_url:'https://images.example/real.png'}}]}]};
  const {md}=await f.renderTurn({question:question('配图'),answers:[{message:message(body,{metadata})}]},null,f.makeZipImageSink({add(n,b){entries.set(n,b);}}));
  assert.deepEqual(calls,['https://images.example/real.png']);
  assert.match(md,/!\[图片\]\(images\/img_1.png\)/);
  assert.ok(md.includes('`<AsyncImage src="https://images.example/code.png"/>`'));
});

test('富内容：多行属性、箭头函数与动态值都完整保留，不调用表达式', () => {
  const f=fixture();
  const raw='<card\n  padding={3}\n  title={getTitle()}>\n  <text>内容</text>\n</card>';
  assert.ok(f.craberCleanMarkdown(raw).includes(raw));
  const js='<button onClick={() => alert("a > b")} title="a > b">点按</button>';
  assert.ok(f.craberCleanMarkdown(js).includes(js));
  assert.equal(f.craberCleanMarkdown('`<Link title="代码"/>`'),'`<Link title="代码"/>`');
});

test('富内容：合法 SVG 中的 JSX 数字与弧线保留，外部引用和事件保留为原文', () => {
  const f=fixture();
  for(const svg of ['<svg><image href="https://example.com/a.png"/></svg>',
    '<svg onload="alert(1)"><text>文字</text></svg>',
    '<svg><use href="https://example.com/a.svg#shape"/></svg>',
    '<svg><rect fill="url(https://example.com/a)"/></svg>']) assert.match(f.craberCleanMarkdown(svg),/<details>/);
  const svg='<svg viewBox="0 0 100 40"><path strokeWidth={2} d="M1 1 L9 9"/><text x="2" y="20">文字</text></svg>';
  assert.match(decodeURIComponent(f.craberCleanMarkdown(svg)),/stroke-width="2"/);
});
