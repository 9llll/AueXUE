# AIOVTUE 博客

基于 [Valaxy](https://github.com/YunYouJun/valaxy) + [Sakura 主题](https://github.com/YunYouJun/valaxy-theme-sakura) 的个人博客，前端为 SPA，内容通过 **Cloudflare Pages Functions** 动态提供，数据存储在 **Cloudflare D1**（索引/元数据）与 **R2**（Markdown 原文）。

| 环境 | 地址 |
|------|------|
| Cloudflare Pages 默认域名 | https://aiovtue-blog.pages.dev |
| 自定义域名（公告栏配置，按需绑定） | `daily.yybb.us`、`daily.20030327.xyz`、`daily.aiovtcloudns.ch` 等 |

> 自定义域名需在 Cloudflare Pages 控制台绑定，并将 `wrangler.toml` / `site.config.ts` 中的 `SITE_URL` 改为你的主域名。

---

## 目录

- [技术架构](#技术架构)
- [数据存储说明](#数据存储说明)
- [环境要求](#环境要求)
- [本地开发](#本地开发)
- [首次部署到 Cloudflare](#首次部署到-cloudflare)
- [手动部署（命令行）](#手动部署日常更新)
- [在 Cloudflare 控制台部署（网页操作）](#在-cloudflare-控制台部署网页操作)
- [数据迁移与同步](#数据迁移与同步)
- [环境变量](#环境变量)
- [后台管理](#后台管理)
- [常用命令速查](#常用命令速查)
- [项目结构](#项目结构)
- [外部服务依赖](#外部服务依赖)
- [常见问题](#常见问题)

---

## 技术架构

```
浏览器
  │
  ▼
Cloudflare Pages（静态资源 dist/）
  │
  ├── SPA 路由（Vue / Valaxy）
  │
  └── Pages Functions（functions/）
        ├── /api/posts/*     文章 CRUD + 搜索 + 分类标签
        ├── /api/links       友链
        ├── /api/about       关于页
        ├── /api/gallery/*   相册
        ├── /api/notice      公告栏
        ├── /api/admin/*     后台登录
        └── /atom.xml        RSS

Cloudflare D1（aiovtue-blog）    文章索引、分类标签、FTS 搜索、公告栏、登录限速
Cloudflare R2（aiovtue-blog）    Markdown 原文（文章/友链/关于/相册）
```

**说明：** 仓库内 `.github/workflows/gh-pages.yml` 为 Valaxy 模板遗留的 GitHub Pages 工作流，**当前生产环境使用 Cloudflare Pages 手动部署**，不依赖该 Workflow。

---

## 数据存储说明

### D1 数据库（结构化索引）

| 表名 | 用途 |
|------|------|
| `posts` | 文章元数据：标题、摘要、日期、分类(JSON)、标签(JSON)、封面、置顶、是否发布、`r2_key` |
| `post_categories` | 分类索引（用于分类页/归档筛选） |
| `post_tags` | 标签索引 |
| `posts_fts` | 全文搜索索引（标题 + 摘要 + 正文纯文本） |
| `notice_board` | 公告栏（仅存 D1，不在 R2） |
| `admin_login_attempts` | 后台登录失败次数与锁定时间 |

**标题、分类、标签均在 D1 中**，列表页、分类页、标签页、归档页均读 D1，不扫描 R2。

### R2 对象存储（Markdown 原文）

| 路径 | 内容 |
|------|------|
| `posts/{slug}.md` | 文章完整 Markdown（含 frontmatter） |
| `about/index.md` | 关于页 |
| `links/index.md` | 友链页 |
| `gallery/index.md` | 相册 hub |
| `gallery/{slug}/index.md` | 单个相册（含照片列表、加密密码等） |

### 本地开发镜像目录

迁移脚本会从以下目录读取并写入本地/远程 D1+R2：

| 类型 | 本地路径 |
|------|----------|
| 文章 | `content/posts/*.md` |
| 友链 | `content/links/index.md` |
| 关于 | `content/about/index.md` |
| 相册 | `content/gallery/**` |
| 公告 | `content/notice.json` → D1 |

---

## 环境要求

- **Node.js** 18+（推荐 LTS）
- **npm** 9+
- **Cloudflare 账号**（已创建 Pages 项目、D1 数据库、R2 存储桶）
- **Wrangler CLI**（通过 `npx wrangler` 调用，无需全局安装）

登录 Cloudflare（首次部署前执行一次）：

```bash
npx wrangler login
```

---

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置本地密钥

复制示例文件并按需修改：

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` **不要提交到 Git**。

### 3. 两种本地预览方式

| 命令 | 端口 | 说明 |
|------|------|------|
| `npm run dev` | 4859 | Vite 热更新；API 走本地 `content/` 插件，**与云端行为不完全一致** |
| `npm run dev:cf` | 8788 | **推荐**：构建 + 本地 D1/R2 迁移 + `wrangler pages dev`，等同云端 |
| `npm run dev:cf:lite` | 8788 | 仅重建前端并启动 wrangler，**跳过数据迁移**（改样式/UI 时用） |

`dev:cf` 启动后可访问：

- 首页：http://localhost:8788
- 后台：http://localhost:8788/admin
- API：http://localhost:8788/api/posts

---

## 首次部署到 Cloudflare

适用于**全新 fork / 新账号**从零搭建。若你已在用本仓库的 `wrangler.toml`（含 `database_id`），可跳过创建 D1/R2 的步骤。

### 步骤 1：创建 Cloudflare 资源

```bash
# 创建 D1 数据库
npx wrangler d1 create aiovtue-blog

# 创建 R2 存储桶
npx wrangler r2 bucket create aiovtue-blog

# 创建 Pages 项目（若尚未创建）
npx wrangler pages project create aiovtue-blog --production-branch main
```

将 `d1 create` 输出的 `database_id` 填入 `wrangler.toml` 的 `database_id` 字段。

### 步骤 2：应用 D1 表结构

```bash
npm run d1:migrate
```

等价于：

```bash
npx wrangler d1 migrations apply aiovtue-blog --remote
```

迁移文件位于 `migrations/`，当前包含：

1. `0001_posts.sql` — 文章表 + FTS
2. `0002_taxonomy.sql` — 分类/标签表
3. `0003_pin_order.sql` — 置顶字段
4. `0004_notice.sql` — 公告栏
5. `0005_admin_login_attempts.sql` — 登录限速

### 步骤 3：同步内容到 R2 + D1

```bash
npm run migrate:posts
npm run migrate:links
npm run migrate:about
npm run migrate:gallery
npm run migrate:notice
```

### 步骤 4：配置 Pages 环境变量

在 Cloudflare Dashboard → **Workers & Pages** → **aiovtue-blog** → **Settings** → **Environment variables** 中添加：

| 变量名 | 类型 | 说明 |
|--------|------|------|
| `ADMIN_USERNAME` | 变量 | 后台登录用户名 |
| `ADMIN_PASSWORD` | **Secret** | 后台登录密码 |
| `ADMIN_API_TOKEN` | **Secret**（推荐） | API 调用令牌，建议与登录密码不同 |
| `WEBDAV_PASSWORD` | **Secret**（可选） | 相册 WebDAV 代理密码 |
| `SITE_URL` | 变量 | 站点主 URL，如 `https://daily.yybb.us` |

`wrangler.toml` 中 `[vars]` 的 `SITE_URL` 用于构建默认值；生产环境建议在 Dashboard 覆盖为你的自定义域名。

### 步骤 5：构建并部署

```bash
npm run build
npx wrangler pages deploy dist --project-name aiovtue-blog --commit-dirty=true
```

### 步骤 6：绑定自定义域名（可选）

Cloudflare Dashboard → Pages 项目 → **Custom domains** → 添加 `daily.yybb.us` 等域名，按提示配置 DNS。

绑定后请同步修改：

- `site.config.ts` 中的 `url`
- `wrangler.toml` 中 `SITE_URL`（或 Dashboard 环境变量）

---

## 手动部署（日常更新）

> 本节为**命令行**部署。若希望在浏览器里点选操作，见下一节 [在 Cloudflare 控制台部署（网页操作）](#在-cloudflare-控制台部署网页操作)。

日常改代码后的标准发布流程如下。

### 场景 A：只更新前端 / API 代码（不改数据库结构、不迁移内容）

适用于：样式调整、后台 UI、搜索页、评论展示、Functions 逻辑等**不涉及新迁移脚本、不从本地重新导入 Markdown** 的改动。

```bash
# 1. 构建
npm run build

# 2. 部署到 Cloudflare Pages
npx wrangler pages deploy dist --project-name aiovtue-blog --commit-dirty=true
```

部署成功后：

- 默认域名：https://aiovtue-blog.pages.dev
- 终端会输出本次预览地址，形如 `https://xxxxxxxx.aiovtue-blog.pages.dev`

### 场景 B：有新的 D1 迁移（如新增表/字段）

```bash
npm run build
npm run d1:migrate
npx wrangler pages deploy dist --project-name aiovtue-blog --commit-dirty=true
```

### 场景 C：在本地改了 Markdown，要同步到云端

在后台编辑过的内容**一般已直接写入 R2+D1**，无需再跑迁移。

若你直接改了 `content/` 下的文件并希望覆盖云端：

```bash
# 按需执行，例如只同步文章
npm run migrate:posts

# 或全部同步
npm run migrate:posts
npm run migrate:links
npm run migrate:about
npm run migrate:gallery
npm run migrate:notice

# 再部署前端（若同时有代码改动）
npm run build
npx wrangler pages deploy dist --project-name aiovtue-blog --commit-dirty=true
```

### 场景 D：仅通过后台管理内容

1. 部署最新代码（场景 A）
2. 浏览器打开 `https://你的域名/admin`
3. 登录后在后台编辑文章/友链/相册/公告
4. **无需**再执行 migrate 脚本（API 会直接写 R2 + D1）

### 手动部署检查清单

- [ ] `npm run build` 无报错
- [ ] 若有新 `migrations/*.sql`，已执行 `npm run d1:migrate`
- [ ] Cloudflare Dashboard 中 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 已配置
- [ ] `npx wrangler pages deploy` 返回 `Deployment complete`
- [ ] 访问首页、文章页、`/admin` 登录是否正常

---

## 在 Cloudflare 控制台部署（网页操作）

本节介绍**不依赖命令行上传文件**时，如何在 Cloudflare 网页后台完成部署与配置。

> **重要：** 本项目包含 `functions/`（API、后台鉴权、RSS）。仅把 `dist` 文件夹拖进网页上传**不会**带上 Functions，站点会缺 API。推荐用 **「关联 Git 自动构建」**（下方方式 A），或在本地构建后用命令行 `wrangler pages deploy`（上一节）。

### 部署方式对比

| 方式 | 是否需要本地 Node | 是否含 API/后台 | 适合场景 |
|------|-------------------|-----------------|----------|
| **A. 关联 Git 自动构建** | 否（云端构建） | ✅ | 日常更新，推代码即部署 |
| **B. 命令行 wrangler deploy** | 是 | ✅ | 本地调试后精确发布 |
| **C. 控制台仅上传 dist** | 是（需先本地 build） | ❌ | 不推荐，仅静态预览 |

---

### 一、登录并进入 Pages

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧选择 **Workers 和 Pages**（Workers & Pages）
3. 若已有项目，点击 **aiovtue-blog**；否则点击 **创建** → **Pages** → **连接到 Git**

---

### 二、首次创建项目（关联 Git）

1. 选择 **连接到 Git**，授权 GitHub/GitLab
2. 选中本仓库 `aiovtue-blog`
3. 点击 **开始设置**，填写构建配置：

| 配置项 | 填写内容 |
|--------|----------|
| 项目名称 | `aiovtue-blog` |
| 生产分支 | `main`（或你的主分支） |
| 框架预设 | `None`（无预设） |
| 构建命令 | `npm run build` |
| 构建输出目录 | `dist` |
| 根目录 | `/`（仓库根目录） |

4. 点击 **环境变量** → **添加变量**（见下文「四、配置环境变量」），然后 **保存并部署**

首次部署会自动 `npm install` + `npm run build`，并识别仓库根目录的 `functions/` 作为 Pages Functions。

---

### 三、绑定 D1 与 R2（网页操作）

部署完成后，进入项目 **aiovtue-blog** → **设置（Settings）** → **函数（Functions）** → **绑定（Bindings）**：

#### 添加 D1 数据库绑定

1. 点击 **添加** → **D1 database**
2. 变量名填：`DB`（必须与 `wrangler.toml` 一致）
3. 选择数据库：`aiovtue-blog`
4. 保存

若列表中没有 D1，需先到 **Storage & databases** → **D1** → **创建数据库**，名称 `aiovtue-blog`。

#### 添加 R2 存储桶绑定

1. 点击 **添加** → **R2 bucket**
2. 变量名填：`BUCKET`
3. 选择存储桶：`aiovtue-blog`
4. 保存

若尚无 R2，到 **R2** → **创建存储桶**，名称 `aiovtue-blog`。

> 绑定修改后，需在 **部署（Deployments）** 中 **重新部署** 一次生产环境，新绑定才会生效。

---

### 四、配置环境变量（网页操作）

路径：**设置** → **环境变量（Variables and Secrets）** → **添加**

| 变量名 | 类型 | 生产环境值示例 |
|--------|------|----------------|
| `ADMIN_USERNAME` | 文本（Variable） | 你的后台用户名 |
| `ADMIN_PASSWORD` | 加密（Secret） | 你的后台密码 |
| `ADMIN_API_TOKEN` | 加密（Secret） | 随机长字符串（与密码不同） |
| `WEBDAV_PASSWORD` | 加密（Secret） | 相册 WebDAV 密码（可选） |
| `SITE_URL` | 文本（Variable） | `https://daily.yybb.us` |

- **Production** 与 **Preview** 建议都配置（Preview 用于 PR 预览部署）
- 修改环境变量后，点击 **重新部署** 使配置生效

---

### 五、在控制台执行 D1 数据库迁移

关联 Git 不会自动执行 `migrations/` 里的 SQL，**首次部署**或**有新迁移文件**时需处理表结构。

#### 方式 1：网页执行 SQL（适合不用命令行）

1. Dashboard → **Storage & databases** → **D1** → 选择 **aiovtue-blog**
2. 打开 **控制台（Console）** 标签
3. 将 `migrations/` 下各 `.sql` 文件内容**按编号顺序**粘贴执行：
   - `0001_posts.sql`
   - `0002_taxonomy.sql`
   - `0003_pin_order.sql`
   - `0004_notice.sql`
   - `0005_admin_login_attempts.sql`

#### 方式 2：命令行（与 README 其他章节一致）

```bash
npm run d1:migrate
```

#### 导入初始内容

表结构就绪后，内容（文章/友链等）仍需从本地同步到 R2+D1，**目前需在本地执行**：

```bash
npm run migrate:posts
npm run migrate:links
npm run migrate:about
npm run migrate:gallery
npm run migrate:notice
```

之后日常改文章请用 **后台 `/admin`**，会直接写入云端，无需重复 migrate。

---

### 六、绑定自定义域名（网页操作）

1. 进入项目 **aiovtue-blog** → **自定义域（Custom domains）**
2. 点击 **设置自定义域** → 输入域名，如 `daily.yybb.us`
3. 若域名已在当前 Cloudflare 账号下，按提示添加 **CNAME** 或自动配置
4. 等待 SSL 证书生效（通常几分钟）

绑定后记得：

- 将 `SITE_URL` 环境变量改为 `https://你的域名`
- 更新仓库内 `site.config.ts` 的 `url` 并推送（若用 Git 部署）

---

### 七、日常更新（Git 自动部署流程）

配置完成后，日常更新**只需推代码**，无需打开 Cloudflare 网页：

```bash
git add .
git commit -m "更新说明"
git push origin main
```

Cloudflare Pages 会自动：

1. 拉取最新代码
2. 执行 `npm run build`
3. 部署 `dist` + `functions/`
4. 更新 https://aiovtue-blog.pages.dev 及已绑定的自定义域名

#### 在网页查看 / 手动触发部署

1. 项目页 → **部署（Deployments）**
2. 可查看每次构建日志；失败时点开 **构建日志** 排查
3. 点击 **创建部署** → **重新部署最新提交**，可手动触发一次生产部署
4. 某次部署旁 **⋯** → **回滚到此部署**，可快速回退

#### 仅有数据库迁移、没有代码改动时

1. 在 D1 控制台执行新 SQL，或本地运行 `npm run d1:migrate`
2. **无需**重新部署 Pages（除非同时改了 `functions/` 代码）

#### 仅在本地改了 `content/`  Markdown 时

仍需在本地运行对应的 `npm run migrate:*` 命令同步到 R2+D1（见 [数据迁移与同步](#数据迁移与同步)），与是否用 Git 部署无关。

---

### 八、控制台部署检查清单

- [ ] Pages 项目已关联 Git，构建命令 `npm run build`，输出目录 `dist`
- [ ] Functions 绑定：`DB` → D1 `aiovtue-blog`，`BUCKET` → R2 `aiovtue-blog`
- [ ] 环境变量 `ADMIN_USERNAME`、`ADMIN_PASSWORD` 已设置
- [ ] D1 迁移 SQL 已全部执行
- [ ] 初始内容已 `migrate:*` 同步（或已在后台录入）
- [ ] 自定义域名已绑定且 `SITE_URL` 正确
- [ ] 访问 `/admin` 能登录，文章列表能加载

---

## 数据迁移与同步

| 命令 | 作用 | 目标 |
|------|------|------|
| `npm run d1:migrate` | 应用 SQL 迁移 | 远程 D1 |
| `npm run d1:migrate:local` | 应用 SQL 迁移 | 本地 D1（dev:cf 用） |
| `npm run migrate:posts` | 同步 `content/posts` → R2 + D1 + FTS | 远程 |
| `npm run migrate:posts:local` | 同上 | 本地 |
| `npm run migrate:links` | 同步友链 | 远程/本地（加 `:local`） |
| `npm run migrate:about` | 同步关于页 | 远程/本地 |
| `npm run migrate:gallery` | 同步相册 | 远程/本地 |
| `npm run migrate:notice` | 同步公告栏到 D1 | 远程/本地 |
| `npm run d1:backfill-taxonomy` | 从 posts 表重建分类/标签索引 | 远程 |

---

## 环境变量

### 本地（`.dev.vars`）

```ini
WEBDAV_PASSWORD=your_password
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password
ADMIN_API_TOKEN=dev-admin-token
SITE_URL=http://localhost:8788
```

### 生产（Cloudflare Pages 环境变量 / Secrets）

| 变量 | 必填 | 说明 |
|------|------|------|
| `ADMIN_USERNAME` | 是 | 后台用户名 |
| `ADMIN_PASSWORD` | 是 | 后台密码 |
| `ADMIN_API_TOKEN` | 推荐 | 用于 `Authorization: Bearer` 调用 API；未设置时用 `ADMIN_PASSWORD` 签 session |
| `WEBDAV_PASSWORD` | 否 | WebDAV 相册代理 |
| `SITE_URL` | 推荐 | RSS、绝对链接生成用 |

---

## 后台管理

- 地址：`/admin`
- 功能：文章、友链、关于、相册、公告的增删改
- 登录失败 **5 次** 后，同一 IP **锁定 15 分钟**
- 「记住我」在浏览器 `localStorage` 中以 AES 加密保存密码（仅方便个人设备，不能防 XSS）

**安全建议：**

- 为 `/admin` 配置 [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) 额外保护（可选）
- 生产环境设置独立的 `ADMIN_API_TOKEN`
- 勿将 `.dev.vars` 提交到 Git

---

## 常用命令速查

```bash
# 开发
npm run dev              # Vite 热更新 @4859
npm run dev:cf           # 完整本地 Cloudflare 预览 @8788
npm run dev:cf:lite      # 轻量预览（不迁移数据）

# 构建
npm run build            # 生产构建 → dist/

# 数据库
npm run d1:migrate       # 远程 D1 迁移
npm run d1:migrate:local # 本地 D1 迁移

# 内容同步（本地 content/ → 云端）
npm run migrate:posts
npm run migrate:links
npm run migrate:about
npm run migrate:gallery
npm run migrate:notice

# 部署
npx wrangler pages deploy dist --project-name aiovtue-blog --commit-dirty=true
```

---

## 项目结构

```
aiovtue-blog/
├── components/          # 自定义 Vue 组件与布局
│   ├── admin/         # 后台编辑器、登录页
│   └── layouts/       # SakuraSearchLayout 等
├── content/             # 内容源文件（迁移到 R2/D1 的源头）
│   ├── posts/         # 文章 Markdown
│   ├── links/         # 友链
│   ├── about/         # 关于页
│   ├── gallery/       # 相册
│   └── notice.json    # 公告栏种子数据
├── functions/           # Cloudflare Pages Functions（API）
│   └── api/
├── migrations/          # D1 SQL 迁移
├── pages/               # Valaxy 页面路由
│   └── admin/         # 后台路由
├── plugins/             # Vite 插件（本地 API、主题补丁等）
├── scripts/             # 构建、迁移、dev:cf 脚本
├── server/              # 共享服务端逻辑（D1/R2/鉴权/渲染）
├── public/              # 静态资源、_routes.json、_headers
├── styles/              # 全局样式
├── valaxy.config.ts     # Valaxy 主配置
├── site.config.ts       # 站点信息（标题、作者、搜索等）
└── wrangler.toml        # Cloudflare D1/R2/Pages 绑定
```

### 自定义配置入口

- 站点信息：`site.config.ts`
- 主题与插件：`valaxy.config.ts`
- 导航图标：`shared/nav-icons.ts`
- Cloudflare 绑定：`wrangler.toml`

---

## 外部服务依赖

以下服务在配置中引用，需自行部署或申请：

| 服务 | 配置位置 | 用途 |
|------|----------|------|
| Twikoo 评论 | `valaxy.config.ts` → `addonTwikoo` | 文章评论 |
| Vercount 统计 | `valaxy.config.ts` → `addonVercount` | 阅读量统计 |
| 外部 R2/CDN | 文章/主题图片 URL | 媒体资源托管 |
| WebDAV | `WEBDAV_PASSWORD` + 相册配置 | 部分相册远程图片 |

---

## 常见问题

### 本地 `dev:cf` 友链/关于/相册 404？

先跑完整 `npm run dev:cf`（非 lite），或手动执行：

```bash
npm run d1:migrate:local
npm run migrate:links:local
npm run migrate:about:local
npm run migrate:gallery:local
npm run migrate:notice:local
```

### 后台登录 503？

未配置 `ADMIN_USERNAME` / `ADMIN_PASSWORD`。检查 `.dev.vars`（本地）或 Cloudflare 环境变量（生产）。

### 编辑文章正文为空？

硬刷新浏览器；确认已部署最新代码（管理员 API 缓存已改为 `no-store`）。

### 部署后 API 仍返回旧数据？

确认执行了 `migrate:*`（若改了 `content/`）；后台保存的内容直接写 R2，一般无需 migrate。

### Windows 下 migrate 脚本报错？

项目已对 Windows 做 `spawnSync` 兼容；请使用 PowerShell 或 CMD 在项目根目录执行。

---

## 许可证

本项目基于 Valaxy 生态构建。主题与框架请遵循各自开源协议。
