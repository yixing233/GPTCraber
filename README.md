# GPTCraber 🦀

一个把 ChatGPT 对话导出为 Markdown 的油猴脚本（Tampermonkey / Violentmonkey）。

DOM 负责定位消息，官方接口负责取干净内容，最终产出结构化的 Markdown。适配文本、代码、图片、联网引用等多种消息类型，图片会本地化保存，不再依赖会失效的网络链接。

## 功能

- **单条导出** — 在原生操作栏（复制按钮旁）注入 🦀 按钮，一键导出当前这条回复。
- **导出当前会话** — 勾选当前会话的若干回合，打包成 zip。每回合一个 md，文件名取用户的提问并加序号前缀。
- **多会话导出** — 拉取历史会话列表，按需勾选后批量导出。每个会话合并成一个 md，放在各自的子文件夹里。
- **项目归类** — 归属于某个项目（Project / Gizmo）的会话，自动放进以项目名命名的文件夹。
- **日期筛选** — 多会话列表支持近 7 / 15 / 30 天快捷筛选与自定义日期区间。
- **内容预览** — 每条消息 / 每个会话都可在导出前预览渲染后的 Markdown。
- **图片本地化** — 对话配图、联网搜索配图都下载为二进制存入 `images/` 目录，md 中引用本地路径。

## 支持的消息类型

- 纯文本、Markdown
- 代码块
- 图片（多模态）
- 联网搜索结果与引用（网页来源、图片组、脚注等）

## 安装

1. 安装浏览器扩展 [Tampermonkey](https://www.tampermonkey.net/) 或 Violentmonkey。
2. 点击 **[安装脚本](https://raw.githubusercontent.com/yixing233/GPTCraber/main/chatgpt-md-exporter.user.js)** —— 油猴会识别 `.user.js` 并弹出安装页面，确认即可。
3. 打开 [chatgpt.com](https://chatgpt.com/)，右下角会出现「会话列表 / 导出当前」按钮，回复操作栏里会出现 🦀 图标。

脚本头部已配置 `@updateURL`，油猴会定期检查更新，有新版本时自动提示升级。

## 使用

| 入口 | 作用 |
| --- | --- |
| 回复栏的 🦀 | 导出这一条回复 |
| 右下「导出当前」 | 勾选当前会话的回合，导出为 zip |
| 右下「会话列表」 | 拉取历史会话，按日期筛选后批量导出 |

## 工作原理

脚本通过 `GM_xmlhttpRequest` 调用 ChatGPT 的官方接口：

- `/api/auth/session` — 获取 accessToken
- `/backend-api/conversation/{id}` — 拉取会话的消息树
- `/backend-api/conversations` — 会话列表
- `/backend-api/files/{id}/download` — 图片下载地址
- `/backend-api/gizmos/{id}` — 项目信息

从 `current_node` 沿 `parent` 回溯重建消息链，按「用户提问 → 后续回复」分组成回合，再把各类 content 渲染成 Markdown。引用位置用私有区字符（U+E000–U+F8FF）标记，按 `start_idx`/`end_idx` 从后往前替换还原。

zip 打包使用内置的 STORE 模式打包器（不做压缩），因为 ChatGPT 的 CSP 同时禁止外部 `@require` 脚本和 `eval`，无法引入 JSZip。

## 说明

- 脚本只读取你自己账号下的会话数据，全部处理在本地浏览器完成，不上传到任何第三方。
- 依赖 ChatGPT 前端结构与接口，官方改版后可能需要适配。

## License

MIT
