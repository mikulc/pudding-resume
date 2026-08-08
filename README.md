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
- **邮箱验证码注册** — 使用 Redis 保存验证码、注册凭证、发送限流及邮件队列状态
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
| ORM | GORM + PostgreSQL / MySQL |
| 缓存与任务队列 | Redis（注册邮箱验证码、限流、注册凭证、邮件队列） |
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
│   ├── redisclient/             # Redis 客户端初始化与连接检查
│   ├── services/
│   │   ├── email_code.go        # 注册验证码、注册凭证与发送限流
│   │   ├── email_queue.go       # Redis 持久化邮件队列
│   │   └── pdf.go               # Chromedp 渲染导出服务
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
| 数据库（二选一） | PostgreSQL ≥ 14 或 MySQL ≥ 8.0 |
| Redis | ≥ 6（启用注册邮箱验证时必需，推荐 Redis 7） |
| Chrome/Chromium | 用于 PDF/PNG 导出（可不安装，导出功能将不可用） |

### 1. 克隆项目

```bash
git clone https://github.com/mikulc/pudding-resume.git
cd pudding-resume
```

### 2. 准备数据库与 Redis

后端支持 PostgreSQL 和 MySQL，通过 `backend/.env` 中的 `DB_DRIVER` 选择。

```sql
-- 在 PostgreSQL 中创建后端数据库
CREATE DATABASE pudding_resume;

-- 或在 MySQL 8.0 中创建后端数据库
CREATE DATABASE pudding_resume
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

注册邮箱验证依赖 Redis。推荐使用 Docker 启动本地 Redis：

```bash
docker run --name pudding-resume-redis \
  -p 6379:6379 \
  -d redis:7-alpine

# 检查 Redis 是否正常
docker exec pudding-resume-redis redis-cli ping
# 预期输出：PONG
```

也可以使用系统中已有的 Redis，只需确保后端能够通过 `REDIS_ADDR` 连接。

### 3. 启动后端

```bash
cd backend

# 安装 Go 依赖
go mod tidy

# 复制环境变量配置文件并修改
cp .env.example .env
# 编辑 .env，填入数据库、JWT、Redis 与 SMTP 配置

# 启动后端（开发模式，含自动建表和种子数据）
go run main.go
```

后端默认运行在 `http://localhost:8080`

当 `REGISTRATION_EMAIL_CODE_ENABLED=true` 时，后端启动时会连接并检查 Redis；Redis 连接失败时后端会终止启动。若暂时不使用邮箱验证，可将该配置设为 `false`。

### 4. 启动前端

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
| `APP_ENV` | 运行环境；生产部署设为 `production` | `development` |
| `SERVER_PORT` | 后端服务端口 | `8080` |
| `COOKIE_SECURE` | 刷新令牌 Cookie 仅通过 HTTPS 发送 | 开发环境 `false`，生产环境 `true` |
| `DB_DRIVER` | 数据库驱动：`postgres` 或 `mysql` | `postgres` |
| `DB_HOST` | 数据库主机 | `localhost` |
| `DB_PORT` | 数据库端口 | PostgreSQL `5432`；MySQL `3306` |
| `DB_USER` | 数据库用户名 | PostgreSQL `postgres`；MySQL `root` |
| `DB_PASSWORD` | 数据库密码 | **生产环境必填** |
| `DB_NAME` | 数据库名 | `pudding_resume` |
| `DB_SSLMODE` | PostgreSQL SSL 模式 | `disable` |
| `DB_CHARSET` | MySQL 字符集 | `utf8mb4` |
| `DB_TLS` | MySQL TLS 配置（如 `false`、`true`、`skip-verify`） | `false` |
| `DB_TIMEZONE` | IANA 数据库时区 | `Asia/Shanghai` |
| `JWT_SECRET` | JWT 签名密钥 | **生产环境务必修改为强随机串** |
| `JWT_EXPIRATION` | Access Token 过期时间 | `1h` |
| `JWT_REFRESH_EXPIRATION` | Refresh Token 过期时间 | `168h` |
| `REGISTRATION_EMAIL_CODE_ENABLED` | 是否启用注册邮箱验证码；启用后 Redis 与 SMTP 配置必须有效 | `false` |
| `REDIS_ADDR` | Redis 地址，格式为 `主机:端口` | `localhost:6379` |
| `REDIS_USERNAME` | Redis ACL 用户名；未启用 ACL 时留空 | (空) |
| `REDIS_PASSWORD` | Redis 密码；本地无密码实例可留空 | (空) |
| `REDIS_DB` | Redis 数据库编号 | `0` |
| `REDIS_TLS_ENABLED` | 是否使用 TLS 连接 Redis | `false` |
| `REDIS_TLS_SERVER_NAME` | Redis TLS 证书的服务端名称 | (空) |
| `REDIS_KEY_PREFIX` | Redis 键前缀；不同环境应使用不同前缀 | `pudding:development` |
| `EMAIL_CODE_SECRET` | 验证码摘要密钥，至少 32 个字符且应独立随机生成 | **启用邮箱验证时必填** |
| `EMAIL_CODE_TTL` | 邮箱验证码有效期 | `5m` |
| `REGISTRATION_TICKET_TTL` | 验证成功后注册凭证的有效期 | `10m` |
| `EMAIL_CODE_COOLDOWN` | 同一邮箱两次发送验证码的最短间隔 | `60s` |
| `EMAIL_CODE_MAX_ATTEMPTS` | 单个验证码允许的最大错误次数 | `5` |
| `EMAIL_CODE_MAX_PER_EMAIL_HOUR` | 单个邮箱每小时最大发送次数 | `5` |
| `EMAIL_CODE_MAX_PER_IP_HOUR` | 单个 IP 每小时最大发送次数 | `20` |
| `SMTP_HOST` | SMTP 服务器地址 | `smtp.example.com` |
| `SMTP_PORT` | SMTP 端口 | `587` |
| `SMTP_USERNAME` | SMTP 登录用户名 | `no-reply@example.com` |
| `SMTP_PASSWORD` | SMTP 密码、授权码或应用专用密码 | 按邮件服务商要求填写 |
| `SMTP_FROM_ADDRESS` | 验证码邮件发件地址 | **启用邮箱验证时必填** |
| `SMTP_FROM_NAME` | 验证码邮件发件人名称 | `Pudding Resume` |
| `SMTP_TLS_MODE` | SMTP 加密模式：`starttls`、`tls` 或 `none` | `starttls` |
| `EMAIL_QUEUE_WORKERS` | Redis 邮件队列并发工作协程数 | `2` |
| `EMAIL_QUEUE_MAX_ATTEMPTS` | 邮件发送失败后的最大尝试次数 | `3` |
| `EMAIL_QUEUE_LEASE` | 邮件任务被工作协程领取后的租约时间 | `30s` |
| `EMAIL_QUEUE_POLL` | 邮件队列轮询间隔 | `1s` |
| `UPLOAD_DIR` | 头像上传目录 | `./uploads` |
| `CHROMIUM_PATH` | Chrome/Chromium 可执行文件路径 | 留空则从系统 PATH 查找 |
| `FONTS_DIR` | 字体文件目录 | `./fonts` |
| `FONT_CDN_BASE_URL` | 字体 CDN 基础地址（导出用） | jsDelivr CDN 地址 |
| `ALLOWED_ORIGINS` | CORS 允许来源（逗号分隔） | `http://localhost:5173,...` |

先生成独立的验证码摘要密钥：

```bash
openssl rand -hex 32
```

启用邮箱验证的最小配置示例：

```dotenv
REGISTRATION_EMAIL_CODE_ENABLED=true

REDIS_ADDR=localhost:6379
REDIS_USERNAME=
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TLS_ENABLED=false
REDIS_KEY_PREFIX=pudding:development

# 粘贴上一步生成的 64 位十六进制随机串
EMAIL_CODE_SECRET=<GENERATED_64_HEX_CHARACTERS>

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=no-reply@example.com
SMTP_PASSWORD=CHANGE_ME
SMTP_FROM_ADDRESS=no-reply@example.com
SMTP_FROM_NAME=Pudding Resume
SMTP_TLS_MODE=starttls
```

Redis 用于保存短期验证码、注册凭证、频率限制计数以及待发送邮件任务。生产环境建议：

- 为 Redis 配置认证，并限制其网络访问范围；
- 使用托管 Redis 或开启 AOF 持久化，避免重启时丢失邮件队列任务；
- 跨公网连接时启用 TLS，并配置 `REDIS_TLS_SERVER_NAME`；
- 为开发、测试和生产环境设置不同的 `REDIS_KEY_PREFIX`。

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
           └─┬───┬──┬─┘  └──────────┘
             │   │  │
             ▼   ▼  ▼
       ┌──────────┐ ┌───────┐ ┌──────┐
       │PG / MySQL│ │ Redis │ │ SMTP │
       └──────────┘ └───────┘ └──────┘
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
