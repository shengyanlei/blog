# 后端二阶段开发任务清单

## 阶段二：核心业务开发 (Core Features)

### 用户认证模块
- [ ] 创建认证相关的DTO (LoginRequest, RegisterRequest, AuthResponse)
- [ ] 实现AuthService接口和ServiceImpl
- [ ] 实现AuthController（注册、登录）

### 基础数据管理
- [ ] 创建Category实体和Repository
- [ ] 创建CategoryService和ServiceImpl
- [ ] 创建CategoryController（CRUD）
- [ ] 创建Tag实体和Repository  
- [ ] 创建TagService和ServiceImpl
- [ ] 创建TagController（查询、创建）

### 文章管理核心功能
- [ ] 创建Article实体（包含与Category、Tag、User的关联关系）
- [ ] 创建ArticleRepository（支持分页、搜索、筛选）
- [ ] 创建文章相关DTO (ArticleCreateRequest, ArticleUpdateRequest, ArticleSummaryDTO, ArticleDetailDTO)
- [ ] 实现ArticleService接口和ServiceImpl
  - [ ] 文章创建（处理标签关联）
  - [ ] 文章更新
  - [ ] 文章删除
  - [ ] 文章发布/下架
  - [ ] 文章列表查询（分页、搜索、筛选）
  - [ ] 文章详情查询（浏览量+1）
- [ ] 实现ArticleController

### 评论管理
- [ ] 创建Comment实体
- [ ] 创建CommentRepository
- [ ] 创建评论相关DTO (CommentCreateRequest, CommentDTO)
- [ ] 实现CommentService接口和ServiceImpl
- [ ] 实现CommentController

### 完善Security配置
- [ ] 更新SecurityConfig，配置各API的访问权限
- [ ] 确保ADMIN权限接口的正确保护

### JPA审计配置
- [ ] 启用JpaAuditing
- [ ] 为Article等实体添加审计字段
