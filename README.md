<h1 align="center">博客系统简介</h1>

<p align="center">
  <a href="#zh-cn">
    <img alt="简体中文" src="https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-FF6B4A?style=for-the-badge&logo=googletranslate&logoColor=white" />
  </a>
  <a href="#en">
    <img alt="English" src="https://img.shields.io/badge/English-2F81F7?style=for-the-badge&logo=googletranslate&logoColor=white" />
  </a>
</p>


---

<a id="zh-cn"></a>
<details open>
<summary><strong>简体中文</strong></summary>

## 项目简介

这是一个面向个人内容创作与长期运营的全栈博客系统，不只是单纯的文章展示模板。

- 访客可浏览首页、文章、归档、关于等页面
- 管理员可在后台管理文章、分类、标签、评论与站点信息
- 支持 Notion 导入，降低从写作工具到发布平台的迁移成本

## 核心能力

### 内容与发布

- Markdown 写作与展示
- 分类/标签体系
- 评论管理与审核流程

### 站点与品牌

- 站点标题、导航、个人资料等可配置
- 后台支持维护运行时站点配置

### Notion 导入

- 支持 Integration / OAuth / Public 模式
- 更容易接入已有写作流程

## 产品结构

### 访客端（Public）

- 首页
- 文章详情
- 归档
- 关于

### 管理端（Admin）

- 登录与鉴权
- 仪表盘
- 文章、分类、标签、评论管理
- 素材池与设置中心

### 服务端（Backend）

- 统一 API 服务
- 认证授权、数据存储、文件上传、配置读写

## 技术选型（简版）

| 层 | 技术 |
| --- | --- |
| 前端 | React + TypeScript + Vite + Tailwind |
| 状态与请求 | React Query + Zustand + Axios |
| 后端 | Spring Boot + Spring Security + JPA + JWT |
| 数据层 | MySQL |
| 工程化 | pnpm workspace + Maven |

## 仓库结构

```text
.
├── apps/spa            # 前端应用（访客端 + 管理端）
├── packages/ui         # 共享 UI 组件包
├── backend             # Spring Boot 后端
│   └── scripts         # 生产增量 SQL
└── docs                # 需求与设计文档
```

## 快速体验

```bash
pnpm install

cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev

cd ../apps/spa
pnpm dev
```

默认访问地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8080`

## 文档导航

- 后端补充文档：[backend/README.md](./backend/README.md)
- 需求与设计资料：[docs](./docs)

</details>

---

<a id="en"></a>
<details>
<summary><strong>English</strong></summary>

## Overview

This is a full-stack blog platform designed for long-term content operations, not just static article pages.

- Public users can browse home, article, archive, and about pages
- Admin users can manage articles, categories, tags, comments, and site info
- Notion import helps bridge writing workflow and publishing workflow

## Core Capabilities

### Content & Publishing

- Markdown-based writing and rendering
- Category/tag taxonomy
- Comment moderation workflow

### Site & Branding

- Configurable site identity (title, nav, profile, etc.)
- Runtime site configuration managed from admin settings

### Notion Import

- Supports Integration / OAuth / Public modes
- Easier migration from existing writing tools

## Product Structure

### Public

- Home
- Article detail
- Archive
- About

### Admin

- Login and authentication
- Dashboard
- Article/category/tag/comment management
- Cover materials and settings center

### Backend

- Unified API service
- Auth, persistence, uploads, and config read/write

## Tech Stack (Concise)

| Layer | Technology |
| --- | --- |
| Frontend | React + TypeScript + Vite + Tailwind |
| State & Request | React Query + Zustand + Axios |
| Backend | Spring Boot + Spring Security + JPA + JWT |
| Data | MySQL |
| Tooling | pnpm workspace + Maven |

## Repository Structure

```text
.
├── apps/spa            # frontend app (public + admin)
├── packages/ui         # shared UI package
├── backend             # Spring Boot backend
│   └── scripts         # production SQL scripts
└── docs                # requirement and design docs
```

## Quick Try

```bash
pnpm install

cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev

cd ../apps/spa
pnpm dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`

## Docs

- Backend supplemental doc: [backend/README.md](./backend/README.md)
- Requirement/design materials: [docs](./docs)
- Blog long-term evolution principles: [docs/博客长期演进原则.md](./docs/博客长期演进原则.md)

</details>

