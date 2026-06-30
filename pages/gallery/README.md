# 相册配置说明

本文档说明 `pages/gallery/` 目录下各 `index.md` 的写法与字段含义。

## 目录结构

```text
pages/gallery/
├── index.md              # 相册列表页（/gallery）
├── README.md             # 本说明文档
└── {slug}/
    └── index.md          # 单个相册详情页（/gallery/{slug}）
```

- **slug**：文件夹名，即相册 URL 路径。例如 `daily-life` 对应 `/gallery/daily-life`。
- 照片/视频**没有单独的页面文件**，统一写在各相册的 `index.md` 里（本地相册），或由 WebDAV 云端自动拉取。

---

## 一、相册列表页 `pages/gallery/index.md`

相册首页，展示所有相册卡片。

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `layout` | 是 | 固定为 `gallery` |
| `title` | 是 | 页面标题，显示在页头 |
| `icon` | 否 | 导航栏图标，如 `i-ri-gallery-line` |
| `cover` | 否 | 页头封面图 URL |
| `comment` | 否 | 是否开启评论，相册一般设为 `false` |
| `albums` | 否 | 要展示的相册 slug 列表；不填则自动列出本目录下所有相册 |

### 示例

```yaml
---
layout: gallery
title: 相册
icon: i-ri-gallery-line
cover: https://example.com/cover.jpg
comment: false
albums:
  - daily-life
  - cloud-travel
  - demo
---
```

列表卡片上的标题、描述、封面、地点、标签、是否带锁等信息，**请在各相册自己的 `index.md` 里配置**，列表页只负责登记 slug。

---

## 二、相册详情页 `pages/gallery/{slug}/index.md`

单个相册的配置，同时作为该相册的照片页。

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `layout` | 是 | 固定为 `gallery-album` |
| `title` | 是 | 相册名称，显示在页头标题 |
| `date` | 建议 | 相册排序时间，格式如 `2025-12-01`；列表页按此倒序排列 |
| `cover` | 否 | 页头封面图；也用作列表卡片封面 |
| `desc` | 否 | 相册描述，显示在列表卡片上 |
| `location` | 否 | 拍摄地点，如 `杭州市 上城区` |
| `tags` | 否 | 标签数组，显示在列表卡片上 |
| `comment` | 否 | 是否开启评论，一般设为 `false` |
| `encrypted` | 否 | 是否带锁相册。`true` 进入时需输入密码，列表卡片显示 🔒 |
| `password` | 条件 | 相册访问密码，与 `encrypted: true` 配合使用 |
| `source` | 是 | 相册类型：`local`（本地图床）或 `webdav`（云端 WebDAV） |

### 页头显示规则

- 页头标题下方会自动显示：**相册共有 X 张照片**（加载完成后统计）。
- 本地相册：按 `photos` 数量统计。
- WebDAV 相册：从云端加载完成后统计。
- 列表卡片右上角的照片数量：**仅本地相册显示**，WebDAV 相册不显示角标。

---

## 三、本地相册（`source: local`）

照片/视频链接直接写在 `photos` 数组中，无需手动填写数量。

| `photos` 子字段 | 必填 | 说明 |
| --- | --- | --- |
| `url` | 是 | 图片或视频的直链地址 |
| `date` | 建议 | 拍摄/上传日期，用于详情页按月分组，格式 `YYYY-MM-DD` |
| `type` | 否 | 媒体类型：`image` 或 `video`；省略时按 URL 后缀自动识别 |
| `poster` | 否 | 视频封面图 URL，仅 `type: video` 时有效 |

### 示例

```yaml
---
layout: gallery-album
title: 日常随拍
date: 2025-12-01
cover: https://example.com/cover.jpg
desc: 记录生活中的小美好
location: 杭州市 上城区
tags:
  - 随拍
  - 生活
comment: false
encrypted: false
source: local
photos:
  - url: https://example.com/photo-1.jpg
    date: 2025-12-01
  - url: https://example.com/photo-2.png
    date: 2025-11-18
  - url: https://example.com/video.mp4
    type: video
    poster: https://example.com/video-cover.jpg
    date: 2025-10-22
---
```

---

## 四、WebDAV 云端相册（`source: webdav`）

照片/视频存放在 WebDAV 服务器，博客自动读取目录下的图片和视频文件，**无需写 `photos` 数组**。

| `webdav` 子字段 | 必填 | 说明 |
| --- | --- | --- |
| `url` | 是 | WebDAV 目录地址，如 `https://example.com/dav/album` |
| `username` | 否 | WebDAV 登录账号 |

WebDAV **登录密码**不要写在 md 里，统一放在环境变量：

服务端代理仅根据 `slug` 读取已登记的 WebDAV 地址与账号，**不会**接受浏览器传入的 `webdavUrl`，避免 WebDAV 登录密码被发往恶意地址。

```bash
WEBDAV_PASSWORD=your_password
```

所有 WebDAV 相册共用这一个密码。本地开发写在 `.env.local`，线上在部署平台环境变量中配置 `WEBDAV_PASSWORD`，修改后需重新部署（本地需重启 `pnpm dev`）。

| 平台 | 配置位置 | 说明 |
| --- | --- | --- |
| Netlify | Site settings → Environment variables | 已有 `netlify/functions/album-webdav` |
| Vercel | Project Settings → Environment Variables | 勾选 Production / Preview，保存后 Redeploy |
| Cloudflare Pages | Settings → Environment variables | 需启用 Pages Functions（本项目已提供 `functions/api/album-webdav`） |

### 示例

```yaml
---
layout: gallery-album
title: 云端旅行
date: 2025-03-20
cover: https://example.com/cover.jpg
desc: 存放在 WebDAV 的相册
location: 杭州市 西湖区
tags:
  - 旅行
  - 云端
comment: false
encrypted: false
source: webdav
webdav:
  url: https://example.com/dav/album
  username: your_username
---
```

---

## 五、带锁相册（加密访问）

进入相册前需输入访问密码。在相册 `index.md` 中配置：

```yaml
encrypted: true
password: "你的密码"
```

| 字段 | 说明 |
| --- | --- |
| `encrypted: true` | 标记为带锁相册，列表卡片显示 🔒，详情页弹出密码门 |
| `password` | 访客需输入的访问密码 |

本地相册与 WebDAV 相册均支持。WebDAV 相册解锁后才会请求云端数据。

> 注意：`password` 是**访客访问密码**（写在 md 里），与 WebDAV 服务端密码（`WEBDAV_PASSWORD` 环境变量）是两套不同的东西。

---

## 六、快速对照

| 需求 | 怎么配 |
| --- | --- |
| 新建相册 | 创建 `pages/gallery/新slug/index.md`，并在列表页 `albums` 中登记 slug |
| 本地图片 | `source: local` + `photos` 数组 |
| 云端图片 | `source: webdav` + `webdav.url` / `webdav.username` + 环境变量 `WEBDAV_PASSWORD` |
| 带锁相册 | `encrypted: true` + `password` |
| 列表显示照片数 | 本地相册自动统计，无需写 `count` |
| 详情页显示总数 | 自动统计，无需配置 |
| 按月分组 | 给每张照片填写 `date` 字段 |

---

## 七、完整示例汇总

### 列表页

见 [index.md](./index.md)。

### 本地普通相册

见 [daily-life/index.md](./daily-life/index.md)。

### 本地带锁相册

见 [secret-moments/index.md](./secret-moments/index.md)。

### WebDAV 带锁相册

见 [cloud-travel/index.md](./cloud-travel/index.md)。

### WebDAV 普通相册

见 [demo/index.md](./demo/index.md)。
