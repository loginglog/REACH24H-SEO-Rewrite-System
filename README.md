# REACH24H 内容改写系统

这是一个专为瑞欧科技（REACH24H）设计的 SEO 内容改写与多平台发布系统。

## 核心功能
- **AI 关键词预测**：基于原文内容自动预测符合 SEO 逻辑的长尾词。
- **平台定向改写**：针对百家号、知乎、搜狐、B站等平台进行定制化 HTML 改写。
- **一键发布**：自动处理推荐阅读、版权声明，并支持一键复制 HTML 及跳转发布页面。
- **安全保障**：API Key 等敏感信息存储在后端环境变量中，前端代码无泄露风险。

## 快速开始

### 1. 环境准备
确保您的系统中已安装 Node.js (建议 v18+)。

### 2. 获取 API Key
由于系统使用 Google Gemini API，您需要在 [Google AI Studio](https://aistudio.google.com/) 获取 API Key。

### 3. 配置环境变量
进入 `server/` 文件夹，将 `.env.example` 重命名为 `.env`，并填入您的 API Key：
```bash
cp server/.env.example server/.env
# 使用编辑器打开 server/.env 并修改
```

环境参数说明：
- `GEMINI_API_KEY`: 您的 Google Gemini API Key。
- `PORT`: 后端服务端口（默认 3001）。

### 4. 安装与运行

#### 开发模式
1. **启动后端**：
   ```bash
   cd server
   npm install
   node index.js
   ```
2. **启动前端**（新开一个终端）：
   ```bash
   npm install
   npm run dev
   ```

#### 生产模式 (推荐部署方式)
1. **构建前端**：
   ```bash
   npm install
   npm run build
   ```
2. **运行后端** (后端会自动托管构建好的前端静态文件)：
   ```bash
   cd server
   npm install
   node index.js
   ```
   访问地址即为服务器 IP:端口。

## 部署工作流 (CI/CD)

本项项目集成了 GitHub Actions 工作流，配置文件位于 `.github/workflows/deploy.yml`。

### 自动化流程
1. **代码推送**：每当有代码推送到 `main` 分支时触发。
2. **构建校验**：自动安装前后端依赖，执行 `npm audit` 安全审计，并尝试 `npm run build`。
3. **制品产出**：将构建好的 `dist` 目录和 `server` 代码打包为 GitHub Artifacts。

### 推荐部署方案 (VPS + PM2)
建议在 VPS 上使用 PM2 管理进程：
```bash
# 在服务器上执行
git pull
npm install
npm run build
cd server && npm install
pm2 start index.js --name "reach24h-seo"
```

## 安全自检清单
- [x] API Key 仅在服务器端使用。
- [x] `.env` 文件已加入 `.gitignore`，不会推送到仓库。
- [x] 前端代码不涉及任何鉴权密钥。

## 技术栈
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Lucide React
- **Backend**: Node.js + Express + Google Generative AI
