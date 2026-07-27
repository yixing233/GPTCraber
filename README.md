# GPTCraber 🦀

把 AI 对话导出为 Markdown 的油猴脚本（Tampermonkey / Violentmonkey）。目前支持 **ChatGPT**、**豆包**、**DeepSeek**、**通义千问** 四个平台，各是一个独立脚本。

官方接口负责取干净内容，最终产出结构化的 Markdown。适配文本、代码、图片、引用等多种消息类型，图片尽量本地化保存，不再依赖会失效的网络链接。

## 四个脚本

| 脚本 | 平台 | 匹配域名 | 安装 |
| --- | --- | --- | --- |
| [chatgpt-md-exporter.user.js](chatgpt-md-exporter.user.js) | ChatGPT | `chatgpt.com`、`chat.openai.com` | [安装](https://raw.githubusercontent.com/yixing233/GPTCraber/main/chatgpt-md-exporter.user.js) |
| [doubao-md-exporter.user.js](doubao-md-exporter.user.js) | 豆包 | `www.doubao.com` | [安装](https://raw.githubusercontent.com/yixing233/GPTCraber/main/doubao-md-exporter.user.js) |
| [deepseek-md-exporter.user.js](deepseek-md-exporter.user.js) | DeepSeek | `chat.deepseek.com` | [安装](https://raw.githubusercontent.com/yixing233/GPTCraber/main/deepseek-md-exporter.user.js) |
| [tongyi-md-exporter.user.js](tongyi-md-exporter.user.js) | 通义千问 | `www.qianwen.com` | [安装](https://raw.githubusercontent.com/yixing233/GPTCraber/main/tongyi-md-exporter.user.js) |

按你用的平台装对应的那个即可，互不影响。四个脚本头部都配了 `@updateURL`，指向本仓库 `main` 分支的同名文件，油猴会定期检查并提示升级。

## 各平台适配情况

| 能力 | ChatGPT | 豆包 | DeepSeek | 通义千问 |
| --- | :---: | :---: | :---: | :---: |
| 导出当前会话（勾选回合） | ✅ | ✅ | ✅ | ✅ |
| 多会话批量导出（zip） | ✅ | ✅ | ✅ | ✅ |
| 日期筛选 | ✅ | ✅ | ✅ | ✅ |
| 导出前内容预览 | ✅ | ✅ | ✅ | ✅ |
| 思考过程 | — | ✅ `thinking_content` | ✅ `thinking_content` | ✅ `think_content` |
| 代码块 | ✅ | ✅ | ✅ | ✅ |
| 图片本地化 | ✅ 下载存 `images/` | ✅ 下载存 `images/` | ⚠️ 仅标注文件名* | ⚠️ 占位符清除*** |
| 联网引用 | ✅ 来源列表 | ✅ reference 块 | ⚠️ 标记直接清除** | ⚠️ 标记直接清除** |
| 单条回复导出 | ✅ 操作栏 🦀 按钮 | — | — | — |
| 项目 / 分组归类 | ✅ Gizmo 项目，可按项目筛选 | — | — | — |

\* DeepSeek 的 `history_messages` 接口不返回附件图片 URL，只能拿到文件名，故图片以 `📎 文件名` 标注，不下载。
\*\* DeepSeek / 通义千问 正文里的联网引用标记接口未返回对应来源，导出时直接清除，保持正文干净。
\*\*\* 通义千问正文里的图片以 `[(image_waterfall_N)]` 等占位符指向富媒体块，接口不返回可直接使用的图片 URL，导出纯文本时清除占位符。

> DeepSeek 多会话列表目前受服务端游标限制，一次最多拉取最新约 100 个会话；通义千问用 `next_token` 游标分页，可翻完全部历史会话。

## 功能

- **导出当前会话** — 勾选当前会话的若干回合打包成 zip。每回合一个 md，文件名取提问并加序号前缀。只选一轮时直接导出单个 md（图片 base64 内嵌），不打包。
- **多会话导出** — 拉取历史会话列表，按需勾选后批量导出。每个会话合并成一个 md，放在各自的子文件夹里（内含 `images/`）。
- **日期筛选** — 多会话列表支持近 7 / 15 / 30 天快捷筛选与自定义日期区间。
- **内容预览** — 每个回合 / 每个会话都可在导出前预览渲染后的 Markdown。
- **图片本地化** — 对话配图下载为二进制存入 `images/` 目录，md 中引用本地路径。

ChatGPT 版额外支持：原生操作栏注入 🦀 单条导出按钮、联网引用/图片组、项目（Gizmo）归类与按项目筛选。

## 支持的消息类型

- 纯文本、Markdown、代码块
- 图片（多模态；ChatGPT / 豆包本地化，DeepSeek 仅标注文件名，通义千问清除占位符）
- 引用（ChatGPT 联网来源 / 豆包 reference 块；DeepSeek / 通义千问清除标记）
- 思考过程（豆包 / DeepSeek 的 `thinking_content`、通义千问的 `think_content`，可选）

## 安装

1. 安装浏览器扩展 [Tampermonkey](https://www.tampermonkey.net/) 或 Violentmonkey。
2. 点上表里对应平台的「安装」链接 —— 油猴会识别 `.user.js` 并弹出安装页面，确认即可。
3. 打开对应网站，右下角会出现「会话列表 / 导出当前」按钮。

各脚本头部都配置了 `@updateURL`（与上方脚本表中的安装链接一致，指向本仓库 `main` 分支同名文件），油猴会定期检查更新，有新版本时自动提示升级。

## 使用

| 入口 | 作用 |
| --- | --- |
| 右下「导出当前」 | 勾选当前会话的回合，导出为 zip（单轮则为 md） |
| 右下「会话列表」 | 拉取历史会话，按日期 / 项目筛选后批量导出 |
| 回复栏的 🦀（仅 ChatGPT） | 导出这一条回复 |

## 说明

- 脚本只读取你自己账号下的会话数据，全部处理在本地浏览器完成，不上传到任何第三方。
- 依赖各平台前端结构与接口，官方改版后可能需要适配。

## License

[MIT](LICENSE)
