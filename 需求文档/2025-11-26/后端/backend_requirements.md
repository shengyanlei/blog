# 后端需求文档 - 博客系统

**日期**: 2025-11-26
**角色**: 资深 Java 高级工程师
**来源**: 产品规格文档 (product_spec.md)

## 1. 系统概述
构建一个基于 Java Spring Boot 的现代化博客系统后端，提供 RESTful API 支持前端展示与后台管理。系统需满足高性能、高安全性和易维护性要求。

## 2. 技术栈约束 (Backend.antigravity)
- **语言**: Java 11
- **框架**: Spring Boot 2.7
- **构建工具**: Maven
- **核心依赖**:
  - Spring Web (REST API)
  - Spring Data JPA (ORM)
  - Mysql Driver (Database)
  - Lombok (Boilerplate reduction)
  - Spring Security (Authentication/Authorization)
- **数据库**: Mysql + Redis (缓存)

## 3. 架构设计规范
遵循分层架构与 SOLID 原则：
- **Controller**: 仅负责 HTTP 请求/响应处理，返回 `ApiResponse<T>`。禁止包含业务逻辑。
- **Service (Interface + Impl)**: 核心业务逻辑，事务控制 (`@Transactional`)，DTO 转换。
- **Repository**: 接口继承 `JpaRepository`，仅处理数据访问。
- **Entity**: 数据库映射，使用 JPA 注解。
- **DTO**: 数据传输对象，使用 `record` (Java 14+) 或 `@Data` 类，负责输入校验。

## 4. 数据库设计 (Schema)
基于产品文档的数据模型：

### 4.1 用户 (users)
- `id`: Long (PK)
- `username`: String (Unique)
- `password_hash`: String
- `email`: String (Unique)
- `role`: String (ADMIN, USER)
- `created_at`: Timestamp

### 4.2 文章 (articles)
- `id`: Long (PK)
- `title`: String
- `slug`: String (Unique, URL friendly)
- `content`: Text (Markdown)
- `summary`: String
- `status`: String (DRAFT, PUBLISHED)
- `views`: Long
- `published_at`: Timestamp
- `created_at`: Timestamp
- `updated_at`: Timestamp
- `user_id`: Long (FK -> users.id)

### 4.3 分类 (categories)
- `id`: Long (PK)
- `name`: String
- `description`: String

### 4.4 标签 (tags)
- `id`: Long (PK)
- `name`: String

### 4.5 文章-标签关联 (article_tags)
- `article_id`: Long (FK)
- `tag_id`: Long (FK)

### 4.6 评论 (comments)
- `id`: Long (PK)
- `content`: Text
- `author_name`: String
- `article_id`: Long (FK)
- `parent_id`: Long (Self FK, for nested comments)
- `status`: String (PENDING, APPROVED, SPAM)
- `created_at`: Timestamp

## 5. API 接口需求

### 5.1 认证 (Auth)
- `POST /api/auth/login`: 用户登录，返回 JWT。
- `POST /api/auth/register`: (可选) 用户注册。

### 5.2 文章管理 (Article)
- `GET /api/articles`: 分页获取文章列表 (支持搜索、分类筛选)。
- `GET /api/articles/{id}`: 获取文章详情。
- `POST /api/articles`: 创建文章 (Admin only)。
- `PUT /api/articles/{id}`: 更新文章 (Admin only)。
- `DELETE /api/articles/{id}`: 删除/软删除文章 (Admin only)。
- `POST /api/articles/{id}/publish`: 发布/下架文章。

### 5.3 分类与标签 (Category/Tag)
- `GET /api/categories`: 获取所有分类。
- `POST /api/categories`: 创建分类 (Admin only)。
- `GET /api/tags`: 获取所有标签。

### 5.4 评论 (Comment)
- `GET /api/articles/{id}/comments`: 获取文章评论。
- `POST /api/articles/{id}/comments`: 发表评论。
- `DELETE /api/comments/{id}`: 删除评论 (Admin only)。

### 5.5 统计 (Dashboard)
- `GET /api/dashboard/stats`: 获取 PV/UV、文章数等统计信息 (Admin only)。

## 6. 安全需求 (Security)
- **认证**: 基于 JWT (JSON Web Token) 的无状态认证。
- **授权**: 基于角色的访问控制 (RBAC)。
  - `ROLE_ADMIN`: 拥有所有写权限。
  - `ROLE_USER` / Anonymous: 仅读权限 (评论除外)。
- **防护**:
  - 全局 CSRF 防护 (API 模式可禁用，但需防范)。
  - 输入参数校验 (Validation) 防止 SQL 注入。
  - XSS 过滤 (在输出端或存储端处理)。
  - 密码使用 BCrypt 加密存储。

## 7. 非功能需求
- **统一响应**: 所有 API 返回统一格式 `ApiResponse<T> { code, message, data }`。
- **异常处理**: 全局异常处理器 (`@ControllerAdvice`)，不暴露堆栈信息。
- **日志**: 关键操作 (增删改) 记录日志。
- **Docker**: 提供 `Dockerfile` 支持容器化部署。
