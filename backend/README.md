# Blog Backend - 博客系统后端

基于Spring Boot 2.7 + MySQL的现代化博客系统后端API服务。

## 技术栈

- **语言**: Java 11
- **框架**: Spring Boot 2.7.18
- **构建工具**: Maven 3.9+
- **数据库**: MySQL 8.0
- **安全认证**: Spring Security + JWT
- **ORM**: Spring Data JPA
- **其他**: Lombok, Bean Validation

## 项目结构

```
backend/
├── src/main/java/com/blog/
│   ├── controller/     # REST控制器
│   ├── service/        # 业务逻辑接口
│   ├── service/impl/   # 业务逻辑实现
│   ├── repository/     # 数据访问层
│   ├── entity/         # 实体类
│   ├── dto/            # 数据传输对象
│   ├── security/       # 安全配置
│   ├── exception/      # 异常处理
│   ├── common/         # 公共类
│   └── util/           # 工具类
└── src/main/resources/
    └── application.yml # 配置文件
```

## 快速开始

### 前置要求

- Java 11+
- Maven 3.9+
- MySQL 8.0+

### 本地运行

1. **配置数据库**

创建数据库：
```sql
CREATE DATABASE blog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. **修改配置**

编辑 `src/main/resources/application.yml`，修改数据库连接信息：
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/blog_db
    username: root
    password: your_password
```

3. **运行应用**

```bash
cd backend
mvn spring-boot:run
```

应用将在 `http://localhost:8080` 启动。

### Docker运行

使用Docker Compose快速启动（包含MySQL）：

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f backend

# 停止服务
docker-compose down
```

## API文档

### 认证接口

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录（返回JWT token）

### 文章接口

- `GET /api/articles` - 获取文章列表（支持分页、搜索、筛选）
- `GET /api/articles/{id}` - 获取文章详情
- `POST /api/articles` - 创建文章（需ADMIN权限）
- `PUT /api/articles/{id}` - 更新文章（需ADMIN权限）
- `DELETE /api/articles/{id}` - 删除文章（需ADMIN权限）
- `POST /api/articles/{id}/publish` - 发布/下架文章（需ADMIN权限）

### 分类接口

- `GET /api/categories` - 获取所有分类
- `POST /api/categories` - 创建分类（需ADMIN权限）
- `PUT /api/categories/{id}` - 更新分类（需ADMIN权限）
- `DELETE /api/categories/{id}` - 删除分类（需ADMIN权限）

### 标签接口

- `GET /api/tags` - 获取所有标签
- `POST /api/tags` - 创建标签（需ADMIN权限）
- `DELETE /api/tags/{id}` - 删除标签（需ADMIN权限）

### 评论接口

- `GET /api/articles/{id}/comments` - 获取文章评论
- `POST /api/articles/{id}/comments` - 发表评论
- `DELETE /api/comments/{id}` - 删除评论（需ADMIN权限）
- `POST /api/comments/{id}/approve` - 批准评论（需ADMIN权限）

### Dashboard接口

- `GET /api/dashboard/stats` - 获取统计信息（需ADMIN权限）

## 统一响应格式

所有API返回统一的JSON格式：

```json
{
  "result": "success",
  "message": "操作成功",
  "data": { }
}
```

## 权限说明

- **公开接口**: 认证接口、文章查询、分类标签查询、评论查询和发表
- **ADMIN权限**: 所有写操作（创建、更新、删除）、Dashboard统计

## 开发指南

### 代码规范

- 严格遵循SOLID、DRY、KISS、YAGNI原则
- Controller仅负责请求/响应，不包含业务逻辑
- Service处理业务逻辑，使用`@Transactional`管理事务
- Repository仅处理数据访问
- 使用DTO进行数据传输
- 所有公开方法添加日志记录

### 编译打包

```bash
mvn clean package
```

生成的jar包位于 `target/blog-backend-1.0.0.jar`

## 许可证

MIT License
