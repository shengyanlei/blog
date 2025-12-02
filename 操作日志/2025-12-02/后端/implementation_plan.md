# 后端二阶段开发实施计划

## 目标描述

完成博客系统后端二阶段开发，实现核心业务功能，包括：
1. 用户认证（注册、登录）
2. 基础数据管理（分类、标签）
3. 文章管理（创建、编辑、删除、发布、查询）
4. 评论系统（发表、查询、删除）

严格遵循 `backend.antigravity` 中的架构规范和代码风格要求：
- 分层架构（Controller -> Service -> Repository -> Entity）
- 使用DTO传输数据
- RestController返回`ResponseEntity<ApiResponse<T>>`
- 所有Entity使用JPA注解和Lombok
- Service必须是接口+实现类
- Repository继承JpaRepository

## 用户审核要求

> [!IMPORTANT]
> **数据库依赖**: 此实现需要MySQL数据库环境，请确保数据库已启动并可连接
>
> **现有代码影响**: 将在现有基础架构上添加新的业务模块，不会修改已有的JWT、Security等基础设施代码

## 建议的更改

### 认证模块 (Authentication)

#### [NEW] [LoginRequest.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/dto/auth/LoginRequest.java)
- 登录请求DTO，包含username和password字段
- 使用`@NotBlank`校验

#### [NEW] [RegisterRequest.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/dto/auth/RegisterRequest.java)
- 注册请求DTO，包含username、password、email字段
- 使用`@NotBlank`、`@Email`校验

#### [NEW] [AuthResponse.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/dto/auth/AuthResponse.java)
- 认证响应DTO，包含token和用户基本信息

#### [NEW] [AuthService.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/service/AuthService.java)
- 认证服务接口，定义login和register方法

#### [NEW] [AuthServiceImpl.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/service/impl/AuthServiceImpl.java)
- 认证服务实现类
- login: 校验用户名密码 -> 生成JWT -> 返回AuthResponse
- register: 查重 -> BCrypt加密密码 -> 存库

#### [NEW] [AuthController.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/controller/AuthController.java)
- 认证控制器，提供`/api/auth/login`和`/api/auth/register`接口

---

### 基础数据管理 (Category & Tag)

#### [NEW] [Category.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/entity/Category.java)
- 分类实体，包含id、name、description字段
- 使用`@Entity`、`@Data`、JPA审计

#### [NEW] [CategoryRepository.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/repository/CategoryRepository.java)
- 分类Repository，继承JpaRepository

#### [NEW] [CategoryDTO.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/dto/category/CategoryDTO.java)
- 分类数据传输对象

#### [NEW] [CategoryService.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/service/CategoryService.java)
- 分类服务接口

#### [NEW] [CategoryServiceImpl.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/service/impl/CategoryServiceImpl.java)
- 分类服务实现类，提供CRUD方法

#### [NEW] [CategoryController.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/controller/CategoryController.java)
- 分类控制器，提供`/api/categories`相关接口

#### [NEW] [Tag.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/entity/Tag.java)
- 标签实体，包含id、name字段

#### [NEW] [TagRepository.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/repository/TagRepository.java)
- 标签Repository

#### [NEW] [TagDTO.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/dto/tag/TagDTO.java)
- 标签数据传输对象

#### [NEW] [TagService.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/service/TagService.java)
- 标签服务接口

#### [NEW] [TagServiceImpl.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/service/impl/TagServiceImpl.java)
- 标签服务实现类

#### [NEW] [TagController.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/controller/TagController.java)
- 标签控制器，提供`/api/tags`相关接口

---

### 文章管理 (Article)

#### [NEW] [Article.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/entity/Article.java)
- 文章实体
- 字段：id、title、slug、content、summary、status、views、publishedAt、createdAt、updatedAt
- 关联：ManyToOne User、ManyToOne Category、ManyToMany Tags
- 使用LAZY加载，JPA审计

#### [NEW] [ArticleRepository.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/repository/ArticleRepository.java)
- 文章Repository
- 自定义查询方法支持分页、搜索、筛选
- 使用`@EntityGraph`避免N+1问题

#### [NEW] [ArticleCreateRequest.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/dto/article/ArticleCreateRequest.java)
- 文章创建请求DTO

#### [NEW] [ArticleUpdateRequest.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/dto/article/ArticleUpdateRequest.java)
- 文章更新请求DTO

#### [NEW] [ArticleSummaryDTO.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/dto/article/ArticleSummaryDTO.java)
- 文章列表摘要DTO

#### [NEW] [ArticleDetailDTO.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/dto/article/ArticleDetailDTO.java)
- 文章详情DTO

#### [NEW] [ArticleService.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/service/ArticleService.java)
- 文章服务接口

#### [NEW] [ArticleServiceImpl.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/service/impl/ArticleServiceImpl.java)
- 文章服务实现类
- 实现创建、更新、删除、发布、查询等功能
- 使用`@Transactional`管理事务
- 处理标签关联关系

#### [NEW] [ArticleController.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/controller/ArticleController.java)
- 文章控制器，提供`/api/articles`相关接口
- GET分页查询、GET详情、POST创建（ADMIN）、PUT更新（ADMIN）、POST发布

---

### 评论管理 (Comment)

#### [NEW] [Comment.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/entity/Comment.java)
- 评论实体
- 字段：id、content、authorName、status、createdAt
- 关联：ManyToOne Article、ManyToOne Parent（自关联）

#### [NEW] [CommentRepository.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/repository/CommentRepository.java)
- 评论Repository

#### [NEW] [CommentCreateRequest.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/dto/comment/CommentCreateRequest.java)
- 评论创建请求DTO

#### [NEW] [CommentDTO.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/dto/comment/CommentDTO.java)
- 评论数据传输对象

#### [NEW] [CommentService.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/service/CommentService.java)
- 评论服务接口

#### [NEW] [CommentServiceImpl.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/service/impl/CommentServiceImpl.java)
- 评论服务实现类

#### [NEW] [CommentController.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/controller/CommentController.java)
- 评论控制器，提供评论相关接口

---

### 配置更新

#### [MODIFY] [SecurityConfig.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/security/SecurityConfig.java)
- 更新权限配置
- `/api/auth/**` -> permitAll
- `/api/articles` (GET)、`/api/categories` (GET)、`/api/tags` (GET) -> permitAll
- POST/PUT/DELETE -> hasRole('ADMIN')

#### [MODIFY] [BlogApplication.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/BlogApplication.java)
- 添加`@EnableJpaAuditing`注解

## 验证计划

### 编译验证
```bash
cd backend
mvn clean compile
```
验证所有代码可以成功编译，无语法错误

### 数据库启动验证
需要用户手动确认MySQL数据库是否已启动并可连接（根据application.yml配置的连接信息）

### 应用启动验证
```bash
cd backend
mvn spring-boot:run
```
验证应用可以成功启动，JPA自动建表成功

### API功能测试
使用Postman或curl进行手动接口测试：
1. 测试注册接口：`POST /api/auth/register`
2. 测试登录接口：`POST /api/auth/login`
3. 测试分类CRUD：`GET/POST /api/categories`
4. 测试标签CRUD：`GET/POST /api/tags`
5. 测试文章创建：`POST /api/articles`（需要ADMIN权限）
6. 测试文章查询：`GET /api/articles`
7. 测试评论功能：`POST /api/articles/{id}/comments`

> [!NOTE]
> 由于项目当前没有单元测试框架，验证主要依赖编译验证、启动验证和手动API测试。建议用户在后续阶段添加单元测试和集成测试。
