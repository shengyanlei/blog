# 后端后续开发任务清单

## 阶段三：互动与优化 (Interaction & Optimization)

### Dashboard统计功能
- [ ] 创建DashboardDTO（统计数据传输对象）
- [ ] 创建DashboardService接口和ServiceImpl
  - [ ] 实现获取文章总数
  - [ ] 实现获取评论总数
  - [ ] 实现获取总浏览量（PV）
  - [ ] 实现获取分类统计
  - [ ] 实现获取热门文章排行
- [ ] 创建DashboardController（仅ADMIN权限）

### 性能优化（可选）
- [ ] 引入Redis依赖
- [ ] 配置Redis连接
- [ ] 实现热点文章缓存
- [ ] 实现缓存失效策略

## 阶段四：测试与部署 (Test & Deploy)

### Docker部署
- [ ] 创建Dockerfile
- [ ] 创建docker-compose.yml（包含MySQL、应用）
- [ ] 添加.dockerignore文件
- [ ] 创建数据库初始化脚本（可选）

### 测试（可选）
- [ ] 添加测试依赖（JUnit、MockMvc）
- [ ] 编写Controller层单元测试
- [ ] 编写Service层单元测试
- [ ] 编写集成测试

### 文档完善
- [ ] 更新README.md（包含启动说明、API文档链接）
- [ ] 创建API文档（可选，使用Swagger/OpenAPI）
