# 前端技术设计文档 - 博客系统

**版本**: 1.0
**日期**: 2025-11-27
**状态**: 拟定中
**基于**: `frontend_requirements.md`, `product_spec.md`, `Frontend.antigravity`

## 1. 架构概览

### 1.1 技术栈
严格遵循 `Frontend.antigravity` 规范：
- **核心框架**: React 18+ (Function Components + Hooks)
- **语言**: TypeScript 5+ (Strict Mode)
- **构建工具**: Vite (SPA模式，追求高性能开发体验与构建)
- **样式方案**: Tailwind CSS (Utility-first) + `clsx`/`tailwind-merge`
- **UI 组件库**: shadcn/ui (基于 Radix UI 的 Headless 组件封装)
- **路由管理**: React Router v6+ (Data Router APIs)
- **状态管理**:
  - **服务端状态**: TanStack Query (React Query) v5
  - **全局客户端状态**: Zustand
- **HTTP 客户端**: Axios (封装拦截器)
- **动画库**: Framer Motion
- **Markdown**: `@uiw/react-md-editor` (编辑) + `react-markdown` / `rehype` (渲染)

### 1.2 Monorepo 结构
采用 pnpm workspace 管理：

```text
root/
├── apps/
│   └── spa/                # 博客前台 + 管理后台 (单页应用)
│       ├── src/
│       │   ├── assets/     # 静态资源
│       │   ├── components/ # 业务组件
│       │   ├── hooks/      # 业务 Hooks
│       │   ├── layouts/    # 页面布局
│       │   ├── lib/        # 工具函数 (axios, utils)
│       │   ├── pages/      # 页面视图
│       │   ├── router/     # 路由配置
│       │   ├── store/      # Zustand store
│       │   ├── types/      # 全局类型定义
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── tailwind.config.js
│       └── vite.config.ts
│
└── packages/
    └── ui/                 # 通用 UI 组件库
        ├── src/
        │   ├── components/
        │   │   └── ui/     # shadcn/ui 原子组件 (Button, Input...)
        │   ├── lib/        # utils (cn)
        │   └── index.ts    # 导出入口
        ├── package.json
        └── tsconfig.json
```

## 2. 详细设计

### 2.1 路由设计 (Router)
使用 React Router 的 `createBrowserRouter`，支持 Data API (Loader/Action)。

| 路径 | 组件 | 权限 | 说明 |
|------|------|------|------|
| **Public** | | | |
| `/` | `HomePage` | 公开 | 首页，文章列表 |
| `/post/:slug` | `PostDetailPage` | 公开 | 文章详情 |
| `/category/:name` | `CategoryPage` | 公开 | 分类列表 |
| `/tag/:name` | `TagPage` | 公开 | 标签列表 |
| `/search` | `SearchPage` | 公开 | 搜索结果 |
| `/about` | `AboutPage` | 公开 | 关于页 |
| **Admin** | | | |
| `/admin/login` | `LoginPage` | 公开 | 登录页 |
| `/admin` | `AdminLayout` | **需鉴权** | 后台布局 (侧边栏+Header) |
| ├── `dashboard` | `DashboardPage` | Admin | 仪表盘 |
| ├── `editor` | `EditorPage` | Admin | 文章编辑器 (新建) |
| ├── `editor/:id` | `EditorPage` | Admin | 文章编辑器 (编辑) |
| ├── `articles` | `ArticleListPage` | Admin | 文章管理 |
| ├── `comments` | `CommentListPage` | Admin | 评论管理 |
| └── `settings` | `SettingsPage` | Admin | 设置 |

**路由守卫**: 实现 `RequireAuth` 高阶组件或 Wrapper，检查 Zustand 中的 `auth` 状态或 Token。未登录跳转 `/admin/login`。

### 2.2 状态管理 (State Management)

#### 2.2.1 服务端状态 (React Query)
用于处理 API 数据，利用其缓存、去重、自动重试机制。
- `usePosts(params)`: 获取文章列表
- `usePost(slug)`: 获取文章详情
- `useCategories()`: 获取分类
- `useMutationPost`: 创建/更新文章
- `useMutationLogin`: 登录

#### 2.2.2 客户端状态 (Zustand)
用于纯前端交互状态。
- `useThemeStore`: 管理主题 (Light/Dark)，持久化到 localStorage。
- `useAuthStore`: 管理用户信息、Token (内存中)、登录状态。
- `useSidebarStore`: 管理后台侧边栏收折状态。

### 2.3 核心模块设计

#### 2.3.1 文章编辑器 (Editor)
- **技术选型**: `@uiw/react-md-editor`
- **功能**:
  - 实时预览
  - Front-matter 编辑区 (自定义 Form 组件)
  - 图片上传: 拦截粘贴/拖拽事件，调用上传 API，返回 URL 插入 Markdown。
  - 自动保存: 监听内容变化，防抖 (debounce) 写入 localStorage。

#### 2.3.2 文章渲染 (Viewer)
- **技术选型**: `react-markdown` + `rehype-highlight` (代码高亮) + `remark-gfm` (表格/任务列表) + `rehype-katex` (公式)。
- **样式**: 使用 `@tailwindcss/typography` 插件 (`prose` 类) 统一排版。
- **目录 (TOC)**: 解析 Markdown AST 生成标题树，实现滚动监听高亮。

#### 2.3.3 主题系统
- 基于 Tailwind CSS 的 `darkMode: 'class'`。
- `packages/ui` 定义 CSS Variables (如 `--background`, `--foreground`)。
- 根节点动态切换 `dark` 类名。

#### 2.3.4 Markdown 文件导入 (MD Import)
- **功能**: 支持从本地上传 `.md` 文件，自动解析内容填充到编辑器。
- **流程**:
  1. 用户点击“导入 Markdown”按钮。
  2. 选择本地文件 (input type="file" accept=".md")。
  3. FileReader 读取文件内容。
  4. 解析 Front-matter (如有) 填充标题/标签等表单。
  5. 将正文内容填充到编辑器区域。
- **解析库**: `gray-matter` (用于分离 Front-matter 与正文)。

### 2.4 数据交互与网络层
- **Axios 实例**: `src/lib/request.ts`
- **拦截器**:
  - **Request**: 注入 `Authorization: Bearer <token>`。
  - **Response**:
    - 统一处理错误 (Toast 提示)。
    - 401 状态码自动登出并跳转登录页。
- **API 定义**: 集中管理在 `src/services` 目录，按模块划分 (`auth.ts`, `post.ts`, `user.ts`)。

### 2.5 安全性设计
- **XSS 防护**:
  - Markdown 渲染使用 `rehype-sanitize` 或 `DOMPurify` 过滤 HTML 标签。
  - 严禁使用 `dangerouslySetInnerHTML`，除非经过严格清洗。
- **CSRF**: 依赖后端 SameSite Cookie 或 Header Token 验证。
- **鉴权**: Token 存储在内存 (Zustand) + 刷新机制 (Refresh Token 存 HttpOnly Cookie，视后端接口而定，若纯 Token 方案则需注意存储安全)。

## 3. 组件开发规范 (补充)
- **文件命名**: PascalCase (如 `ArticleCard.tsx`)。
- **导出**: 使用 Named Export。
- **Props**: 必须定义 Interface `ComponentNameProps`。
- **注释**: 复杂逻辑需写明 Why，不仅仅是 What。
- **A11y**: 按钮必须有 `aria-label`，图片必须有 `alt`，表单必须有 `label` 或 `aria-labelledby`。

## 4. 性能优化
- **代码分割**: 路由级 Lazy Loading (`React.lazy` + `Suspense`)。
- **图片优化**: 封装 `Image` 组件，支持 `loading="lazy"`，配合后端使用 WebP。
- **打包分析**: 使用 `rollup-plugin-visualizer` 分析产物大小。
- **骨架屏**: 为关键页面 (首页、详情页) 制作 Skeleton Loading 状态，避免布局抖动 (CLS)。

## 5. 开发计划 (Roadmap)
1. **初始化**: 搭建 Monorepo，配置 Vite, Tailwind, ESLint, Prettier。
2. **UI 库**: 引入 shadcn/ui，定制基础组件。
3. **公共端开发**: 布局、首页、文章详情、Markdown 渲染。
4. **管理端开发**: 登录、鉴权、Layout、编辑器核心功能。
5. **对接**: 联调后端 API，完善状态管理。
6. **优化**: SEO (Helmet), 性能, A11y 测试。
