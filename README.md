# AI 互动游戏平台

一个基于 React + TypeScript + Supabase 的 AI 互动游戏创作与体验平台。

## 功能特性

- 游戏发现与浏览
- AI 辅助游戏创作
- 支持多种 AI 提供商（Gemini/OpenAI/Claude/自定义 API）
- 用户认证与资料管理
- 游戏收藏与点赞
- 响应式设计，支持移动端

## 技术栈

### 前端
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Motion (动画)
- Lucide React (图标)

### 后端
- Express.js
- Supabase (数据库 + 认证)
- PostgreSQL

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Zhs111/ai-.git
cd ai-
```

### 2. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server && npm install && cd ..
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填写你的配置：

```bash
cp .env.example .env
cp server/.env.example server/.env
```

需要配置：
- `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` (前端)
- `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` (后端)
- `GEMINI_API_KEY` (AI 功能)

### 4. 设置数据库

在 Supabase SQL Editor 中执行 `server/schema.sql`。

### 5. 启动开发服务器

```bash
# 启动前端
npm run dev

# 启动后端（新终端）
npm run server
```

### 6. 构建生产版本

```bash
npm run build
```

## 部署

### 部署到 Vercel

1. 在 Vercel 导入项目
2. 设置环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. 部署

### 后端部署

后端需要单独部署到支持 Node.js 的平台，如：
- Render
- Railway
- Fly.io

## 自定义 AI 配置

用户可以在设置页面配置自己的 AI API：

1. 进入「个人中心 → 设置 → AI API 配置」
2. 选择 AI 提供商（Gemini/OpenAI/Claude/自定义）
3. 输入 API 密钥
4. 保存配置

## 项目结构

```
.
├── src/                    # 前端代码
│   ├── lib/
│   │   ├── ai-config.ts   # AI 配置管理
│   │   └── api.ts         # API 客户端
│   ├── App.tsx            # 主应用组件
│   └── ...
├── server/                 # 后端代码
│   ├── src/
│   │   ├── routes/        # API 路由
│   │   ├── lib/           # Supabase 客户端
│   │   └── types/         # 类型定义
│   └── schema.sql         # 数据库 Schema
└── ...
```

## License

MIT
