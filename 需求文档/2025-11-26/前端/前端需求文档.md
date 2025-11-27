# 前端需求文档 - 博客系统

**日期**: 2025-11-26
**角色**: 资深前端工程师 / UI 工程化专家
**来源**: 产品规格文档 (product_spec.md)

## 1. 系统概述
构建一个基于 React 的现代化博客系统前端，包含面向读者的展示端（SPA/SSR）和面向博主的管理后台。系统需极致注重用户体验、性能与可访问性。

## 2. 技术栈约束 (Frontend.antigravity)
- **语言**: TypeScript (Strict Mode)
- **框架**: React (Function Components + Hooks)
- **构建工具**: Vite (SPA) 或 Next.js (如需 SSR)
- **样式**: Tailwind CSS (Utility-first)
- **UI 组件库**: shadcn/ui (Radix UI base)
- **工程结构**: Monorepo
  - `packages/ui`: 通用无业务组件
  - `apps/spa`: 业务应用

## 3. 页面与路由规划

### 3.1 公共展示端 (Public)
- `/`: 首页。展示文章列表、热门推荐、分类导航。支持无限滚动或分页。
- `/post/:slug`: 文章详情页。
  - Markdown 渲染 (代码高亮、数学公式、图表)。
  - 目录导航 (TOC)。
  - 评论区 (嵌套回复)。
- `/category/:name`: 分类文章列表。
- `/tag/:name`: 标签文章列表。
- `/search`: 搜索结果页。
- `/about`: 关于页面。

### 3.2 管理后台 (Admin) - 需鉴权
- `/admin/login`: 管理员登录。
- `/admin/dashboard`: 仪表盘 (PV/UV 图表)。
- `/admin/editor`: 文章编辑器。
  - 双栏布局：左侧 Markdown 编辑，右侧实时预览。
  - 图片拖拽上传。
  - 快捷键支持 (Ctrl+S 保存)。
- `/admin/articles`: 文章管理列表 (状态过滤、操作)。
- `/admin/comments`: 评论审核管理。
- `/admin/settings`: 系统设置 (SEO、个人资料)。

## 4. 核心功能需求

### 4.1 编辑器体验
- 集成高性能 Markdown 编辑器 (如 `@uiw/react-md-editor` 或 `Milkdown`)。
- 支持 Front-matter 元数据编辑 (标题、Slug、标签、发布时间)。
- 自动保存草稿到本地存储 (LocalStorage)。

### 4.2 主题与交互
- **暗色模式**: 系统级自动切换 + 手动切换开关。
- **响应式**: 移动端汉堡菜单，桌面端侧边/顶部导航。
- **动画**: 使用 `framer-motion` 实现页面转场与微交互 (按钮悬停、卡片浮起)。

### 4.3 性能与 SEO
- 图片懒加载 (Lazy loading) + 格式优化 (WebP)。
- 骨架屏 (Skeleton) 加载占位。
- 动态 Meta 标签 (Helmet) 支持 SEO。

## 5. 组件开发规范
遵循 `Frontend.antigravity`：
- **原子化**: 基础组件 (Button, Input) 放 `packages/ui`。
- **类型安全**: 所有 Props 必须定义 Interface。
- **可访问性 (a11y)**:
  - 语义化 HTML 标签。
  - 交互元素具备 `aria-*` 属性。
  - 键盘可导航。

## 6. 数据交互
- 使用 `axios` 或 `fetch` 封装 HTTP 请求客户端。
- 使用 `React Query` (TanStack Query) 管理服务端状态 (缓存、自动重试、乐观更新)。
- 全局状态 (如主题、用户信息) 使用 `Zustand`。

## 7. 安全需求
- XSS 防护: Markdown 渲染需过滤恶意脚本 (DOMPurify)。
- CSRF: 请求头携带 Token。
- 敏感数据不落地: Token 仅存内存或 HttpOnly Cookie (视后端实现而定)。
