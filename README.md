# Westworld — AI 漫画生成站（最小闭环版）

> 目标：学习「如何把各种大模型与工具连接起来」。核心是**模型无关的插件化适配器架构**——接新模型只加一个 adapter，改一行配置即可切换。

## 最小闭环

```
粘贴/上传书籍文本 → 自动拆章节 → 选章节「生成分镜」 → LLM/本地算法产出 Panel 列表
   → 图像 Provider 为每格生成漫画占位图 → 前端以「漫画页」形式展示，可重生成
```

- **离线可用**：默认 mock 模式，不需要任何 API key。
- **配 key 即升级**：`.env` 填入 `LLM_API_KEY` 后，同一套代码自动走真实大模型（默认 DeepSeek，OpenAI 兼容协议）。

## 目录结构

```
Westworld/
├─ backend/                     # NestJS
│  ├─ src/
│  │  ├─ domain/types.ts        # 数据模型(Project/Chapter/Panel/Job...)
│  │  ├─ store/                 # FileStoreService —— JSON 文件持久化(零依赖,方便 MVP)
│  │  ├─ providers/             # ★ 适配器层(所有"模型/工具"都是可插拔 Provider)
│  │  │  ├─ llm/                #   LLM_PROVIDER: OpenAI 兼容实现(DeepSeek/豆包/通义都可指过来)
│  │  │  ├─ image/              #   IMAGE_PROVIDER: MockImageProvider(SVG 占位)
│  │  │  └─ providers.module.ts #   用 NestJS DI + 工厂按配置选 Provider
│  │  ├─ pipeline/              # ★ 编排层
│  │  │  ├─ storyboard/         #   文本 → 分镜 Panel(LLM;无 key 时本地兜底算法)
│  │  │  ├─ render/             #   Panel → 漫画格图片
│  │  │  └─ jobs.service.ts     #   异步任务队列(串行,内存实现,可换 BullMQ)
│  │  └─ modules/               #   projects/jobs REST 接口
│  └─ data/                     # 运行时生成(db.json)
├─ frontend/                    # Vue3 + Vite
│  └─ src/views/                #   新建作品 / 作品列表 / 作品详情(分镜页)
└─ README.md
```

## 快速开始(pnpm)

```bash
# 1) 安装(根目录一次性安装 backend + frontend 全部依赖)
cd Westworld && pnpm install

# 2) (可选)接真实大模型: 复制 backend/.env.example → backend/.env 并填 LLM_API_KEY
cp backend/.env.example backend/.env

# 3) 同时启动前后端 (backend: http://localhost:3000, frontend: http://localhost:5173)
pnpm dev

# 或分开跑
pnpm dev:backend
pnpm dev:frontend
```

浏览器打开 **http://localhost:5173** → 新建作品 → 粘贴文本 → 选章节「生成分镜」。

## 代码格式化(Oxfmt)

使用 oxc 官方 **Oxfmt**(Prettier 兼容的高性能格式化器, 约 30x 快于 Prettier)。

- oxfmt 自身读取 `.oxfmtrc.json`(它不直接读 `.prettierrc`)。本项目配置由根目录 `.prettierrc` 通过 `pnpm exec oxfmt --migrate=prettier` 迁移生成, 想改风格只需编辑 `.prettierrc` 后重新跑一次迁移即可同步。
- 命令行:

```bash
pnpm fmt          # 格式化全部源码(自动忽略 node_modules/dist)
pnpm fmt:check    # 只检查不写入(CI 用)
```

- VS Code: 已配置官方扩展 `oxc.oxc-vscode` 为默认格式化器并「保存即格式化」(见 `.vscode/settings.json`); 扩展通过项目本地的 `oxfmt --lsp` 工作, 无需额外设置。

## 怎么接第二个模型（学习重点）

### 换/加一个 LLM

1. 在 `backend/src/providers/llm/` 新建 `xxx.provider.ts`，实现 `LLMProvider` 接口（`name/available/generateStructured`）；
2. 在 `providers.module.ts` 的 `LLM_PROVIDER` factory 里改成返回它；
3. 无需改 pipeline —— `StoryboardService` 只依赖接口。

OpenAI 兼容服务（DeepSeek/豆包/通义/Kimi…）通常**零代码**：改 `.env` 的 `LLM_BASE_URL` + `LLM_MODEL` 即可。

### 换/加出图模型

`IMAGE_PROVIDER` 同理：实现 `ImageProvider.generate()`，把 factory 换成真实 provider（即梦/SD/Flux/ComfyUI），pipeline 的 `RenderService` 不用动。

### 每个环节都可见、可观测

每步产物（章节/分镜/格图/任务状态）都结构化存储，方便对比「同一文本、不同模型」的输出与成本。

## API 一览

| 方法   | 路径                                         | 说明                          |
| ------ | -------------------------------------------- | ----------------------------- |
| POST   | `/api/projects`                              | `{title, content}` 新建并拆章 |
| GET    | `/api/projects`                              | 列表                          |
| GET    | `/api/projects/:id`                          | 详情                          |
| DELETE | `/api/projects/:id`                          | 删除                          |
| POST   | `/api/projects/:id/chapters/:cid/generate`   | 发起生成，返回 `{jobId}`      |
| GET    | `/api/projects/:id/jobs/:jobId`              | 轮询任务状态/结果             |
| GET    | `/api/projects/:id/chapters/:cid/storyboard` | 该章节最近一次成功结果        |
