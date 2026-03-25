# 环境配置说明

## 三个环境介绍

### 1. 开发环境 (Development)
**用途**: 本地开发调试

**部署位置**:
- 前端: `http://localhost:3000`
- 后端: `http://localhost:3001`

**特点**:
- ✅ 热重载 (Hot Reload)
- ✅ 详细错误信息
- ✅ 调试工具开启
- ❌ 性能优化关闭

**启动命令**:
```bash
# 启动前端
cd "d:\桌面\ai-互动游戏平台 (1)"
npm run dev

# 启动后端（新终端）
npm run server
```

---

### 2. 测试环境 (Staging)
**用途**: 功能测试、预发布验证

**部署位置**:
- 前端: Vercel (staging分支)
- 后端: Render (staging分支)

**特点**:
- ✅ 接近生产环境配置
- ✅ 错误监控开启
- ✅ 测试数据隔离
- ❌ 不面向真实用户

**部署命令**:
```bash
# 推送到staging分支
git checkout -b staging
git push origin staging
```

---

### 3. 生产环境 (Production)
**用途**: 正式用户使用

**部署位置**:
- 前端: Vercel (main分支)
- 后端: Render (main分支)

**特点**:
- ✅ 性能优化全开
- ✅ 错误监控 + 分析
- ✅ CDN加速
- ❌ 无调试信息

**部署命令**:
```bash
# 推送到main分支
git checkout main
git merge staging
git push origin main
```

---

## 环境变量配置

### 前端环境变量 (.env文件)

```bash
# 开发环境 .env.development
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://ikdedqdrygluwjyudgtqp.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# 测试环境 .env.staging
VITE_API_URL=https://staging-ai-game-api.onrender.com/api
VITE_SUPABASE_URL=https://ikdedqdrygluwjyudgtqp.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# 生产环境 .env.production
VITE_API_URL=https://ai-game-api.onrender.com/api
VITE_SUPABASE_URL=https://ikdedqdrygluwjyudgtqp.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 后端环境变量 (.env文件)

```bash
# 开发环境
NODE_ENV=development
PORT=3001
SUPABASE_URL=https://ikdedqdrygluwjyudgtqp.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=dev_jwt_secret

# 测试环境
NODE_ENV=staging
PORT=3001
SUPABASE_URL=https://ikdedqdrygluwjyudgtqp.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=staging_jwt_secret

# 生产环境
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://ikdedqdrygluwjyudgtqp.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=production_jwt_secret
```

---

## 快速切换环境

### 方法1: 使用npm脚本

```bash
# 开发环境
npm run dev

# 测试环境构建
npm run build:staging

# 生产环境构建
npm run build:prod
```

### 方法2: 使用环境变量

```bash
# Windows PowerShell
$env:NODE_ENV="staging"
npm run build

# Mac/Linux
NODE_ENV=staging npm run build
```

---

## 数据库环境

建议为三个环境分别创建Supabase项目:

| 环境 | 数据库 | 用途 |
|------|--------|------|
| 开发 | ai-game-dev | 本地开发，可随意修改 |
| 测试 | ai-game-staging | 测试数据，定期清理 |
| 生产 | ai-game-prod | 真实用户数据，谨慎操作 |

---

## 部署流程图

```
本地开发 → 推送到GitHub → 自动部署
    ↓
开发环境 (localhost:3000)
    ↓
git push origin staging
    ↓
测试环境 (Vercel/Render Staging)
    ↓
测试通过
    ↓
git push origin main
    ↓
生产环境 (Vercel/Render Production)
```

---

## 常见问题

### Q: 如何查看当前环境?
A: 在浏览器控制台输入:
```javascript
console.log(import.meta.env.MODE)
```

### Q: 环境变量不生效?
A: 
1. 检查.env文件名是否正确
2. 重启开发服务器
3. 确认变量名以`VITE_`开头(前端)

### Q: 如何模拟生产环境?
A:
```bash
npm run build
npm run preview
```
