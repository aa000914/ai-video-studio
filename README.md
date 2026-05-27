# AI视频生产工作台 V1

AI 视频团队内部使用的「AI视频生产工作台」，帮助团队把剧本、人物资产、场景资产、分镜、提示词、生成状态统一管理起来。

## 技术栈

- **Next.js** (App Router) + JavaScript
- **Tailwind CSS** (样式)
- **Supabase** (数据库)
- **DeepSeek API** (AI 生成)
- **Vercel** (部署)

## V1 功能

- 项目管理：创建、查看、删除 AI 视频项目
- 剧本拆解：粘贴剧本，AI 自动分析剧情、角色、场景
- 角色资产：AI 生成角色设定 + 手动增删改
- 场景资产：AI 生成场景设定 + 手动增删改
- 分镜表：AI 生成 10-20 个分镜 + 手动增删改
- 导出：复制 / Markdown / CSV 三种方式导出

## 环境变量说明

| 变量 | 说明 | 暴露到前端 |
|------|------|-----------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | 否 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 是 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | 是 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 | 否 |

## 安装和本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填入实际值：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. 创建 Supabase 数据库表

在 Supabase 控制台的 SQL Editor 中，执行 `supabase/schema.sql` 文件中的全部 SQL 语句。

这会创建以下表：
- `projects` - 项目表
- `characters` - 角色资产表
- `scenes` - 场景资产表
- `shots` - 分镜表
- `ai_outputs` - AI 输出记录表

### 4. 本地启动

```bash
npm run dev
```

浏览器打开 http://localhost:3000

## 部署到 Vercel

1. 将代码推送到 GitHub
2. 在 Vercel 中导入该仓库
3. 在 Vercel 项目设置中添加所有环境变量
4. 部署

Vercel 会自动识别 Next.js 项目并完成构建。

## 页面结构

| 路径 | 说明 |
|------|------|
| `/` | 项目列表首页 |
| `/projects/[id]` | 项目详情（剧本拆解、角色、场景、分镜、导出） |

## API 路由

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/projects` | GET/POST | 项目列表 / 创建 |
| `/api/projects/[id]` | GET/PUT/DELETE | 项目详情 / 编辑 / 删除 |
| `/api/analyze-script` | POST | AI 拆解剧本 |
| `/api/generate-characters` | POST | AI 生成角色 |
| `/api/generate-scenes` | POST | AI 生成场景 |
| `/api/generate-shots` | POST | AI 生成分镜 |
| `/api/characters` | GET/POST | 角色列表 / 创建 |
| `/api/characters/[id]` | PUT/DELETE | 角色编辑 / 删除 |
| `/api/scenes` | GET/POST | 场景列表 / 创建 |
| `/api/scenes/[id]` | PUT/DELETE | 场景编辑 / 删除 |
| `/api/shots` | GET/POST | 分镜列表 / 创建 |
| `/api/shots/[id]` | PUT/DELETE | 分镜编辑 / 删除 |

## 还需要你做的事情

1. **获取 DeepSeek API Key**：前往 https://platform.deepseek.com 注册并获取 API Key
2. **创建 Supabase 项目**：前往 https://supabase.com 创建免费项目
3. **执行 schema.sql**：在 Supabase SQL Editor 中运行建表语句
4. **配置 .env.local**：填入你的真实环境变量
