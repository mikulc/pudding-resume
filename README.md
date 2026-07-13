# Pudding Resume（布丁简历）

Pudding Resume 是一个前后端分离的在线简历编辑与生成系统。用户可在浏览器中创建、编辑、预览和导出简历，支持多套模板实时切换、AI 智能诊断与润色、本地/云端双保存。

## ✨ 功能特性

- **在线编辑 + 实时预览** — 所见即所得的双栏编辑器，编辑内容即时反映到预览区
- **内置多套布局模板** — 浅蓝通栏、青蓝圆标、黑白简线、青影侧栏、居中单栏、经典横线，一键切换
- **AI 简历诊断与润色** — 对简历内容进行智能评估，并提供优化建议与文字润色
- **多格式导出** — 支持导出为 PDF 、PNG、Markdown、JSON格式
- **简历导入** — 支持从 PDF / DOCX 文件解析并导入简历内容
- **暗色模式** — 全文 Dark Mode 支持，跟随系统或手动切换
- **多语言** — 目前支持简体中文和 English
- **保存方式** — 浏览器本地存储 + 登录后云端同步
- **分享设置** — 支持生成分享链接，可选择是否允许复制
- **外部 AI 模型接入** — 支持配置多种 AI 模型服务（模型池），可灵活切换
- **响应式布局** — 适配桌面端与移动端

## 🖼️ 项目截图

- 首页

<img width="2880" height="1505" alt="Snipaste_2026-07-12_13-16-23" src="https://github.com/user-attachments/assets/1c0e9b83-d1c5-4ab4-8ad0-112d7ddd6850" />

- 简历编辑界面

<img width="2880" height="1505" alt="Snipaste_2026-07-12_13-16-51" src="https://github.com/user-attachments/assets/0d81aab0-c254-4522-baf2-1a4311841b45" />

- 多模板切换

<img width="2880" height="1505" alt="Snipaste_2026-07-12_13-17-01" src="https://github.com/user-attachments/assets/acecf1f9-cb55-4847-a2e6-7a0ca4248433" />

- 暗色模式效果

<img width="2880" height="1503" alt="Snipaste_2026-07-12_13-17-29" src="https://github.com/user-attachments/assets/b56993c7-bbff-4f3d-b16c-d9749d7d1a83" />

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| CSS 方案 | Tailwind CSS 3 + tailwindcss-animate |
| 路由 | React Router v7 |
| 拖拽交互 | @dnd-kit |
| 国际化 | i18next + react-i18next |
| 文档解析 | pdfjs-dist + mammoth（DOCX） |
| 图表 | Recharts |
| 后端语言 | Go 1.26 |
| Web 框架 | Gin |
| ORM | GORM + PostgreSQL |
| 认证 | JWT（golang-jwt） |
| 导出引擎 | Chromedp（无头 Chrome） |
| 密码加密 | bcrypt（golang.org/x/crypto） |

## 📁 目录结构

```
pudding-resume/
├── frontend/                    # 前端项目 (pnpm + Vite + React)
│   ├── src/
│   │   ├── api/                 # 业务 API 封装
│   │   ├── assets/              # 静态资源（Logo 等）
│   │   ├── components/          # 通用组件 & 业务组件
│   │   │   ├── auth/            # 登录/注册/导航栏认证
│   │   │   ├── common/          # Toast、Modal、ColorPicker 等
│   │   │   ├── editor/          # 编辑器组件（字段卡片、AI 面板等）
│   │   │   ├── effects/         # Live2D 特效
│   │   │   ├── layout/          # 分栏布局、预览面板、主题抽屉
│   │   │   ├── preview/         # 预览渲染、分页、诊断指示
│   │   │   └── share/           # 分享视图、设置、二维码
│   │   ├── config/              # 字体注册、站点配置
│   │   ├── context/             # React Context（认证、简历、诊断等）
│   │   ├── hooks/               # 自定义 Hooks
│   │   ├── locales/             # 国际化语言包 (zh-CN / en-US)
│   │   ├── pages/               # 页面组件
│   │   ├── registry/layouts/    # 简历布局注册中心（6 套布局）
│   │   ├── types/               # TypeScript 类型定义
│   │   └── utils/               # 工具函数（HTTP、Markdown、导入导出等）
│   ├── index.html               # SPA 入口 HTML
│   ├── vite.config.ts           # Vite 构建配置
│   ├── tailwind.config.js       # Tailwind 主题配置
│   ├── tsconfig.json            # TypeScript 配置
│   ├── package.json             # 依赖与脚本
│   └── pnpm-workspace.yaml      # pnpm workspace 配置
│
├── backend/                     # 后端项目 (Go + Gin)
│   ├── main.go                  # 入口：初始化 → 注册路由 → 启动服务
│   ├── config/config.go         # 配置结构体与环境变量读取
│   ├── database/
│   │   ├── database.go          # GORM 初始化 + AutoMigrate
│   │   └── seed.go              # 种子数据（风格库、文档设置）
│   ├── handlers/                # HTTP 请求处理器
│   │   ├── ai.go                # AI 服务、诊断、润色
│   │   ├── auth.go              # 注册/登录
│   │   ├── user.go              # 用户资料、头像、偏好
│   │   ├── resume.go            # 简历 CRUD
│   │   ├── share.go             # 分享设置与公开访问
│   │   ├── export.go            # PDF/PNG 导出
│   │   ├── template.go          # 模板样式库
│   │   ├── doc_setting.go       # 文档设置
│   │   └── font_file.go         # 字体文件服务
│   ├── middleware/               # JWT 认证 & 频率限制中间件
│   ├── models/                  # GORM 数据模型
│   ├── services/pdf.go          # Chromedp 渲染导出服务
│   ├── utils/                   # JWT 工具 & 密码工具
│   ├── fonts/                   # 字体文件目录（.woff2）
│   ├── uploads/avatars/         # 用户头像上传目录
│   ├── go.mod / go.sum          # Go 模块依赖
│   └── .env.example             # 环境变量配置模板
│
├── skills/                      # AI Skill 定义
│   └── resume-theme-template/   # 通过截图自动创建新简历布局的 Skill
└── README.md
```

## 🚀 本地开发

### 环境要求

| 依赖 | 版本要求 |
|------|----------|
| Go | ≥ 1.26 |
| pnpm | ≥ 8（推荐使用 `corepack enable`） |
| PostgreSQL | ≥ 14 |
| Chrome/Chromium | 用于 PDF/PNG 导出（可不安装，导出功能将不可用） |

### 1. 克隆项目

```bash
git clone https://github.com/mikulc/pudding-resume.git
cd pudding-resume
```

### 2. 启动后端

```sql
# 在PostgreSQL创建后端数据库
CREATE DATABASE pudding_resume;
```

```bash
cd backend

# 安装 Go 依赖
go mod tidy

# 复制环境变量配置文件并修改
cp .env.example .env
# 编辑 .env，填入数据库密码和 JWT_SECRET

# 启动后端（开发模式，含自动建表和种子数据）
go run main.go
```

后端默认运行在 `http://localhost:8080`

### 3. 启动前端

```bash
cd frontend

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

前端开发服务器运行在 `http://localhost:5173`，API 请求通过 Vite proxy 自动转发到后端 `localhost:8080`。



## 🌐 安装Chromium

Ubuntu/Debian：

```bash
# 安装 Chromium
sudo apt update
sudo apt install -y chromium-browser

# 验证安装
chromium-browser --version
chromium --version
```

CentOS/RHEL/Rocky：

```bash
# 安装 Chromium
sudo dnf install -y epel-release
sudo dnf install -y chromium

# 验证安装
chromium-browser --version
chromium --version
```

## ⚙️ 环境变量

### 后端环境变量（backend/.env）

| 变量名 | 说明 | 默认值 / 示例 |
|--------|------|---------------|
| `SERVER_PORT` | 后端服务端口 | `8080` |
| `DB_HOST` | PostgreSQL 主机 | `localhost` |
| `DB_PORT` | PostgreSQL 端口 | `5432` |
| `DB_USER` | 数据库用户名 | `postgres` |
| `DB_PASSWORD` | 数据库密码 | **必填，无默认值** |
| `DB_NAME` | 数据库名 | `pudding_resume` |
| `DB_SSLMODE` | SSL 模式 | `disable` |
| `DB_TIMEZONE` | 数据库时区 | `Asia/Shanghai` |
| `JWT_SECRET` | JWT 签名密钥 | **生产环境务必修改为强随机串** |
| `JWT_EXPIRATION` | Token 过期时间 | `72h` |
| `UPLOAD_DIR` | 头像上传目录 | `./uploads` |
| `CHROMIUM_PATH` | Chrome/Chromium 可执行文件路径 | 留空则从系统 PATH 查找 |
| `FONTS_DIR` | 字体文件目录 | `./fonts` |
| `FONT_CDN_BASE_URL` | 字体 CDN 基础地址（导出用） | jsDelivr CDN 地址 |
| `ALLOWED_ORIGINS` | CORS 允许来源（逗号分隔） | `http://localhost:5173,...` |

### 前端环境变量（frontend/.env.development / .env.production）

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_API_BASE` | API 基础路径，留空表示同源部署 | (空) |
| `VITE_FONT_BASE_URL` | 字体 CDN 地址 | `https://cdn.jsdelivr.net/gh/mikulc/pudding-resume-fonts@v1.0.0` |

## 📦 打包构建

### 前端构建

```bash
cd frontend

# 生产构建
pnpm build

# 预览模式构建 + 本地预览
pnpm preview
```

构建产物位于 `frontend/dist/`，可直接由 Nginx 托管。

### 后端编译

```bash
cd backend

# 编译为单可执行文件
go build -o pudding-resume-backend

# 跨平台编译示例（Linux AMD64）
GOOS=linux GOARCH=amd64 go build -o pudding-resume-backend
```

## 🚢 部署说明

### 推荐架构

```
                 ┌──────────────┐
                 │   Nginx      │
                 │  (Reverse    │
                 │   Proxy)     │
                 └──┬───────┬───┘
                    │       │
           /api/*   │       │  /* (静态文件)
                    ▼       ▼
           ┌──────────┐  ┌──────────┐
           │  Go      │  │  前端    │
           │  Backend │  │  静态文件 │
           │  :8080   │  │  dist/   │
           └────┬─────┘  └──────────┘
                │
                ▼
         ┌────────────┐
         │ PostgreSQL │
         └────────────┘
```

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    root /opt/pudding-resume/frontend/dist;
    index index.html;

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 10m;
    }

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 后端 systemd 服务

创建 systemd 服务文件 /etc/systemd/system/pudding-resume.service

```ini
[Unit]
Description=Pudding Resume Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/pudding-resume/backend
ExecStart=/opt/pudding-resume/backend/pudding-resume-backend
Restart=always
RestartSec=5

EnvironmentFile=/opt/pudding-resume/backend/.env

[Install]
WantedBy=multi-user.target
```

```bash
# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable pudding-resume
sudo systemctl start pudding-resume
```

## 📄 License

MIT License
