# GPTCraber 🦀

把 AI 对话导出为 Markdown 的油猴脚本（Tampermonkey / Violentmonkey）。目前支持 **ChatGPT**、**豆包**、**DeepSeek**、**通义千问**、**Gemini** 五个平台，各是一个独立脚本。

导出结果为结构化的 Markdown，适配文本、代码、图片、引用等多种消息类型，图片尽量保存到本地，不再依赖会失效的网络链接。

## 脚本列表

| 脚本 | 平台 | 匹配域名 | 安装 |
| --- | --- | --- | --- |
| [chatgpt-md-exporter.user.js](chatgpt-md-exporter.user.js) | ChatGPT | `chatgpt.com`、`chat.openai.com` | [安装](https://raw.githubusercontent.com/yixing233/GPTCraber/main/chatgpt-md-exporter.user.js) |
| [chatgpt-latex-smart-fix.user.js](chatgpt-latex-smart-fix.user.js) | ChatGPT 公式渲染 | `chatgpt.com`、`chat.openai.com` | [安装](https://raw.githubusercontent.com/yixing233/GPTCraber/main/chatgpt-latex-smart-fix.user.js) |
| [doubao-md-exporter.user.js](doubao-md-exporter.user.js) | 豆包 | `www.doubao.com` | [安装](https://raw.githubusercontent.com/yixing233/GPTCraber/main/doubao-md-exporter.user.js) |
| [deepseek-md-exporter.user.js](deepseek-md-exporter.user.js) | DeepSeek | `chat.deepseek.com` | [安装](https://raw.githubusercontent.com/yixing233/GPTCraber/main/deepseek-md-exporter.user.js) |
| [tongyi-md-exporter.user.js](tongyi-md-exporter.user.js) | 通义千问 | `www.qianwen.com`、`www.tongyi.com`、`tongyi.aliyun.com` | [安装](https://raw.githubusercontent.com/yixing233/GPTCraber/main/tongyi-md-exporter.user.js) |
| [gemini-md-exporter.user.js](gemini-md-exporter.user.js) | Gemini | `gemini.google.com` | [安装](https://raw.githubusercontent.com/yixing233/GPTCraber/main/gemini-md-exporter.user.js) |

按你用的平台装对应的那个即可，互不影响。所有脚本头部都配了 `@updateURL`，指向本仓库 `main` 分支的同名文件，油猴会定期检查并提示升级。

## 功能

### ChatGPT 导出（chatgpt-md-exporter）

- 勾选当前会话的回合导出，每回合一个 md；只选一轮且没有上传文档时直接导出单个 md
- 拉取历史会话列表，按需勾选后批量导出，打包 zip（含图片与上传文档）
- 近 7 / 15 / 30 天快捷筛选与自定义日期区间
- 按项目（Projects）筛选会话
- 左侧导航轨道：节点跳转、悬停预览、键盘导航、跨长会话跳转，支持全量搜索定位
- 项目内对话：顶栏显示项目对话入口，点会话名即可在本项目内切换对话
- 顶栏增强：半透明毛玻璃背景，长正文滚过时不与顶栏文字重叠
- 🦀 菜单内可单独关闭「节点导航」「项目 UI 优化」
- 单条回复导出：回复栏的 🦀 按钮，点一下导出这一条（自动带上对应的提问）
- 上传的 PDF、DOCX、TXT 等文档保存到本地，md 中以相对路径引用
- 导出前可预览渲染后的 Markdown
- 可选：问答对 / 仅 AI 回复、是否导出工具代码、是否附参考来源、图片是否内嵌

### ChatGPT 公式渲染（chatgpt-latex-smart-fix）

- 把正文里没渲染出来的 LaTeX 公式就地渲染好，支持 `$...$`、`$$...$$`、`\(...\)`、`\[...\]`
- 会先判断 `$...$` 里的内容是否真的像公式，`$100`、`$29.9` 这类金额照常显示，不会被误渲染
- 代码块、行内代码里的内容不动
- 只做渲染、不导出，与导出脚本互不影响，两个可以同时装

### 豆包（doubao-md-exporter）

- 勾选回合导出、多会话批量导出、日期筛选、导出前预览
- 思考过程可选导出
- 单条回复导出：回复栏的 🦀 按钮
- 图片保存到本地

### DeepSeek（deepseek-md-exporter）

- 勾选回合导出、多会话批量导出、日期筛选、导出前预览
- 思考过程可选导出
- 图片平台不提供下载地址，只能记录文件名，不下载

### 通义千问（tongyi-md-exporter）

- 勾选回合导出、多会话批量导出、日期筛选、导出前预览
- 思考过程可选导出
- 图片保存到本地（你上传的图与 AI 生成的图）
- 联网搜索的配图保留原始链接

### Gemini（gemini-md-exporter）

- 勾选回合导出、导出前预览、单条回复导出、图片保存到本地
- 只针对当前打开的会话，不做多会话批量导出与日期筛选（引擎限制）
- 长会话需先滚动到顶部把内容加载出来，已加载的回合才能导出

### 抓包工具（craber-sniffer）

- 面向开发者的辅助脚本，用于分析新平台的数据结构，普通用户不需要装
- 分析完即可卸载

## 支持的消息类型

- 纯文本、Markdown、代码块
- 图片（ChatGPT / 豆包 / 通义千问 / Gemini 保存到本地；DeepSeek 仅记录文件名）
- 附件（ChatGPT 上传的非图片文档保存到本地；Gemini 记录上传文件的名称与类型）
- 引用（ChatGPT 输出参考来源列表、豆包输出引用块；DeepSeek / 通义千问 / Gemini 清除正文里的引用标记，保持正文干净）
- 思考过程（豆包、DeepSeek、通义千问可选导出）

## 能力对照

| 能力 | ChatGPT | 豆包 | DeepSeek | 通义千问 | Gemini |
| --- | :---: | :---: | :---: | :---: | :---: |
| 导出当前会话（勾选回合） | ✅ | ✅ | ✅ | ✅ | ✅ |
| 多会话批量导出（zip） | ✅ | ✅ | ✅ | ✅ | — |
| 日期筛选 | ✅ | ✅ | ✅ | ✅ | — |
| 导出前内容预览 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 思考过程 | — | ✅ | ✅ | ✅ | — |
| 代码块 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 图片本地化 | ✅ | ✅ | ⚠️ 仅记录文件名 | ✅ | ✅ |
| 上传文档本地化 | ✅ | — | — | — | ⚠️ 仅记录名称 |
| 联网引用 | ✅ 来源列表 | ✅ 引用块 | ⚠️ 清除标记 | ⚠️ 清除标记 | ⚠️ 清除标记 |
| 单条回复导出 | ✅ 操作栏 🦀 | ✅ 操作栏 🦀 | — | — | ✅ 操作栏 🦀 |
| 项目筛选 | ✅ | — | — | — | — |

## 安装

1. 安装浏览器扩展 [Tampermonkey](https://www.tampermonkey.net/) 或 Violentmonkey。
2. 点上表里对应平台的「安装」链接 —— 油猴会识别 `.user.js` 并弹出安装页面，确认即可。
3. 打开对应网站：ChatGPT 的入口是顶栏右侧的 🦀 按钮；其余平台是右下角的「会话列表 / 导出当前」按钮。

各脚本头部都配置了 `@updateURL`（与上方脚本表中的安装链接一致，指向本仓库 `main` 分支同名文件），油猴会定期检查更新，有新版本时自动提示升级。

## 使用

| 入口 | 作用 |
| --- | --- |
| 顶栏右侧 🦀 菜单「导出当前」 | 勾选当前会话的回合，导出为 zip（单轮无附件时为 md） |
| 顶栏右侧 🦀 菜单「会话列表」（不含 Gemini） | 拉取历史会话，按日期 / 项目筛选后批量导出 |
| 回复栏的 🦀（ChatGPT / 豆包 / Gemini） | 导出这一条回复（带对应提问；含图则为 zip） |
| 顶栏项目名旁的会话名（ChatGPT 项目内对话） | 点开本项目全部对话，直接切换 |
| 左侧导航轨道（ChatGPT） | 长会话快速跳转与搜索定位 |

🦀 菜单里还有两个开关，可分别关闭**节点导航**与**项目 UI 优化**：

| 开关 | 关闭后的效果 |
| --- | --- |
| 节点导航 | 撤掉左侧回合节点轨道，不再拉取会话结构 |
| 项目 UI 优化 | 撤掉顶栏里项目对话入口与当前位置，不再拉取项目接口 |

## 说明

- 脚本只读取你自己账号下的会话数据，全部处理在本地浏览器完成，不上传到任何第三方。
- 依赖各平台前端结构，官方改版后可能需要适配。
- Gemini 版只覆盖当前打开的会话，且只有页面上已加载出来的回复才能导出，很长的会话记得先滚动到顶部。

## License

[GPL-3.0](LICENSE)

Copyright (C) 2026 yixing233

本项目的所有脚本均以 GNU General Public License v3.0 发布（`GPL-3.0-only`），可自由使用、修改与分发，但衍生作品需同样以 GPL-3.0 开源。
