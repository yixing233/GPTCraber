'use strict';
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, '..', 'chatgpt-md-exporter.user.js'), 'utf8');
function fixture(fetch) {
  let time = 2000000000000;
  const env = { fetch, Blob, URL, URLSearchParams, Date:class extends Date {static now(){return time;}},
    apiWait:async()=>{}, noteRateLimit(){}, craberAuthMode:'bearer', craberNoteAuthMode(){},
    location:{origin:'https://chatgpt.com'}, console };
  vm.runInNewContext(source.slice(source.indexOf('  const API = {'),source.indexOf('  // 用 GM_xmlhttpRequest 拉图'))
    + '\nAPI.getToken = async () => "fixture-token"; this.api = API;',env);
  return {api:env.api, advance(){time+=11*60*1000;}};
}
const response = (status, value, type='application/json') => ({ok:status===200,status,
  headers:{get:()=>type},json:async()=>value,blob:async()=>new Blob([value],{type})});

test('文件下载：新版入口与原项目上下文；签名 URL 和直接文件响应均支持', async () => {
  const calls=[];
  const f=fixture(async(url,opts)=>{calls.push({url,opts});return response(200,'payload','application/pdf');});
  const info=await f.api.getFileInfo('file_upload',{projectId:'project-B',conversationId:'conv-B'});
  assert.equal(calls[0].url,'/backend-api/files/download/file_upload?inline=false');
  assert.equal(calls[0].opts.headers['chatgpt-project-id'],'project-B');
  assert.equal(await info.blob.text(),'payload');
  assert.equal(calls[0].opts.credentials,'include');
});

test('文件下载：新版入口不支持时回退旧入口；失败缓存按时间过期且项目隔离', async () => {
  const calls=[];
  const f=fixture(async(url)=>{calls.push(url);return response(404,{});});
  await assert.rejects(f.api.getFileInfo('file_1',{projectId:'a'}),/404/);
  assert.ok(calls.some(url=>url==='/backend-api/files/file_1/download'));
  const count=calls.length;
  await assert.rejects(f.api.getFileInfo('file_1',{projectId:'a'}),/404/);
  assert.equal(calls.length,count);
  await assert.rejects(f.api.getFileInfo('file_1',{projectId:'b'}),/404/);
  assert.ok(calls.length>count);
  const second=calls.length;
  f.advance();
  await assert.rejects(f.api.getFileInfo('file_1',{projectId:'a'}),/404/);
  assert.ok(calls.length>second);
});

test('文件下载：401/403 允许 Cookie 重试；429/服务故障不扩散请求', async () => {
  const calls=[];
  const f=fixture(async(url,opts)=>{calls.push(opts);return opts.headers.Authorization ? response(403,{}) : response(200,{url:'https://files.example/file'});});
  assert.equal((await f.api.getFileInfo('file_1')).download_url,'https://files.example/file');
  assert.equal(calls.length,2);
  for(const status of [429,500]) {
    let count=0;
    const failed=fixture(async()=>{count++;return response(status,{});});
    await assert.rejects(failed.api.getFileInfo('file_1'),new RegExp(String(status)));
    assert.equal(count,1);
  }
});

test('生成文件：携带所属会话、消息和 sandbox 路径；缺少定位信息不发请求', async () => {
  const calls=[];
  const f=fixture(async(url,opts)=>{calls.push({url,opts});return response(200,{download_url:'/backend-api/estuary/content?sig=fixture'});});
  await f.api.getSandboxFileInfo({conversationId:'conv-B',messageId:'msg-B',projectId:'project-B',path:'/mnt/data/报告 (2).pdf'});
  const url=new URL(calls[0].url,'https://chatgpt.com');
  assert.equal(url.pathname,'/backend-api/conversation/conv-B/interpreter/download');
  assert.equal(url.searchParams.get('message_id'),'msg-B');
  assert.equal(url.searchParams.get('sandbox_path'),'/mnt/data/报告 (2).pdf');
  assert.equal(calls[0].opts.headers['chatgpt-project-id'],'project-B');
  await assert.rejects(f.api.getSandboxFileInfo({path:'/mnt/data/a.pdf'}),/会话|消息/);
  assert.equal(calls.length,1);
});

test('文件下载：savedrecs.html 保留实际 HTML 文件内容', async () => {
  const f=fixture(async()=>response(200,'<!doctype html><title>论文检索</title>','text/html'));
  const result=await f.api.getFileInfo('file_html',{name:'savedrecs.html',mime:'text/html'});
  assert.equal(await result.blob.text(),'<!doctype html><title>论文检索</title>');
});
