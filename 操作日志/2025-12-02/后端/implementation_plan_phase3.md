# 后端后续开发实施计划

## 目标描述

完成博客系统后端的剩余功能开发，包括：
1. **Dashboard统计功能**：提供后台管理所需的统计数据
2. **Docker部署配置**：实现容器化部署，简化部署流程

继续严格遵循`backend.antigravity`规范。

## 建议的更改

### Dashboard统计模块

#### [NEW] [DashboardStatsDTO.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/dto/dashboard/DashboardStatsDTO.java)
Dashboard统计数据DTO，包含：
- 文章总数（总数、已发布数、草稿数）
- 评论总数（总数、待审核数）
- 总浏览量（PV）
- 分类统计（每个分类的文章数）
- 热门文章列表（前10篇）

#### [NEW] [DashboardService.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/service/DashboardService.java)
Dashboard服务接口，定义`getStatistics()`方法

#### [NEW] [DashboardServiceImpl.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/service/impl/DashboardServiceImpl.java)
Dashboard服务实现类：
- 聚合各Repository的统计查询
- 计算总浏览量（sum所有文章的views）
- 查询每个分类的文章数量
- 查询浏览量最高的前10篇文章

#### [NEW] [DashboardController.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/controller/DashboardController.java)
Dashboard控制器：
- `GET /api/dashboard/stats` - 获取统计信息（需ADMIN权限）

---

### Docker部署配置

#### [NEW] [Dockerfile](file:///d:/需求开发/blog/blog/backend/Dockerfile)
应用容器化配置：
```dockerfile
# 多阶段构建
# 阶段1：构建
FROM maven:3.9-eclipse-temurin-11 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# 阶段2：运行
FROM eclipse-temurin:11-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### [NEW] [docker-compose.yml](file:///d:/需求开发/blog/blog/docker-compose.yml)
Docker Compose配置，包含：
- MySQL服务（8.0版本）
- 后端应用服务
- 网络配置
- 卷挂载（MySQL数据持久化）

#### [NEW] [.dockerignore](file:///d:/需求开发/blog/blog/backend/.dockerignore)
Docker构建时忽略的文件：
- `target/`
- `*.log`
- `.git/`
- 等

#### [NEW] [init.sql](file:///d:/需求开发/blog/blog/backend/docker/init.sql)（可选）
数据库初始化脚本：
- 创建数据库
- 创建初始管理员用户

---

### Repository增强

需要为Dashboard统计添加一些查询方法：

#### [MODIFY] [ArticleRepository.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/repository/ArticleRepository.java)
添加统计查询方法：
```java
// 统计已发布文章数
long countByStatus(String status);

// 计算总浏览量
@Query("SELECT SUM(a.views) FROM Article a")
Long getTotalViews();

// 获取热门文章（按浏览量排序）
@Query("SELECT a FROM Article a WHERE a.status = 'PUBLISHED' ORDER BY a.views DESC")
Page<Article> findTopArticlesByViews(Pageable pageable);

// 按分类统计文章数
@Query("SELECT c.name, COUNT(a) FROM Article a JOIN a.category c GROUP BY c.id, c.name")
List<Object[]> countArticlesByCategory();
```

#### [MODIFY] [CommentRepository.java](file:///d:/需求开发/blog/blog/backend/src/main/java/com/blog/repository/CommentRepository.java)
添加统计查询方法：
```java
// 统计待审核评论数
long countByStatus(String status);
```

## 验证计划

### Dashboard功能测试

1. **启动应用并登录获取ADMIN token**
2. **测试统计接口**：
```bash
curl -X GET http://localhost:8080/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

预期返回：
```json
{
  "result": "success",
  "message": "操作成功",
  "data": {
    "totalArticles": 10,
    "publishedArticles": 8,
    "draftArticles": 2,
    "totalComments": 25,
    "pendingComments": 5,
    "totalViews": 1520,
    "categoryStats": [...],
    "topArticles": [...]
  }
}
```

### Docker部署测试

1. **构建并启动服务**：
```bash
docker-compose up -d
```

2. **检查服务状态**：
```bash
docker-compose ps
```

3. **查看日志**：
```bash
docker-compose logs -f backend
```

4. **测试API可访问性**：
```bash
curl http://localhost:8080/api/articles
```

5. **停止服务**：
```bash
docker-compose down
```

## 实施优先级

1. **高优先级**（必须实现）：
   - Dashboard统计功能
   - Docker部署配置

2. **中优先级**（建议实现）：
   - 数据库初始化脚本
   - README文档更新

3. **低优先级**（可选实现）：
   - Redis缓存
   - 单元测试
   - API文档（Swagger）

> [!NOTE]
> Redis缓存和测试编写虽然重要，但不影响系统核心功能。建议在完成高优先级任务后，根据实际需求决定是否实现。
