# 生产自动发布指南（CentOS/RHEL）

本文档说明当前仓库已实现的发布流程：

- 触发：`push` 到 `main`（或手动 `workflow_dispatch`）
- 构建：GitHub Actions 构建前端和后端
- 部署：上传 `release-<sha>.tgz` 到 ECS 并执行部署脚本
- 切换：将 `/opt/blog/current` 软链接切到新版本
- 验证：健康检查 `/api/categories`
- 回滚：发布失败时自动回滚，也支持手动回滚

## 1. 仓库文件

- 流水线：`.github/workflows/deploy-prod.yml`
- 部署脚本：`deploy/server/deploy_release.sh`
- 回滚脚本：`deploy/server/rollback_release.sh`

## 2. 服务器目录结构

```text
/opt/blog/
  incoming/                 # GitHub Actions 上传的发布包
  releases/<git_sha>/       # 解压后的版本目录
  current -> releases/...   # 当前生效版本软链接
  shared/runtime/           # 持久化运行数据
    application.yml
    uploads/
    site-config-backups/
```

## 3. 服务器一次性初始化

### 3.1 安装依赖

```bash
sudo dnf install -y nginx java-11-openjdk curl tar
```

如果你的系统使用 `yum`，请将命令中的 `dnf` 替换为 `yum`。

### 3.2 创建目录

```bash
sudo mkdir -p /opt/blog/{incoming,releases,bin,shared/runtime}
sudo mkdir -p /opt/blog/shared/runtime/{uploads,site-config-backups}
```

如果使用非 root 的 SSH 用户部署，请授予目录权限：

```bash
sudo chown -R <deploy-user>:<deploy-user> /opt/blog
```

### 3.3 创建后端环境变量文件

创建 `/etc/blog/blog-backend.env`：

```bash
sudo mkdir -p /etc/blog
sudo tee /etc/blog/blog-backend.env >/dev/null <<'EOF'
SPRING_DATASOURCE_URL=jdbc:mysql://127.0.0.1:3306/blog_db?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8&allowPublicKeyRetrieval=true
SPRING_DATASOURCE_USERNAME=YOUR_DB_USER
SPRING_DATASOURCE_PASSWORD=YOUR_DB_PASSWORD

JWT_SECRET=YOUR_STRONG_JWT_SECRET
APP_FRONTEND_URL=https://your-domain.com

APP_SITE_CONFIG_PATH=/opt/blog/shared/runtime/application.yml
APP_SITE_CONFIG_BACKUP_DIR=/opt/blog/shared/runtime/site-config-backups
APP_SITE_CONFIG_MAX_BACKUPS=20

# 可选：Notion 集成
NOTION_TOKEN=
NOTION_VERSION=2025-09-03
NOTION_PUBLIC_IMPORT_ENABLED=false
NOTION_OAUTH_CLIENT_ID=
NOTION_OAUTH_CLIENT_SECRET=
NOTION_OAUTH_REDIRECT_URI=
NOTION_OAUTH_SUCCESS_REDIRECT=/admin/upload
EOF
```

### 3.4 创建 systemd 服务

创建 `/etc/systemd/system/blog-backend.service`：

```ini
[Unit]
Description=Blog Backend Service
After=network.target

[Service]
Type=simple
EnvironmentFile=/etc/blog/blog-backend.env
WorkingDirectory=/opt/blog/shared/runtime
ExecStart=/usr/bin/java -jar /opt/blog/current/backend/blog-backend.jar --spring.profiles.active=prod
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
```

然后重新加载并启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable blog-backend.service
```

### 3.5 配置 Nginx

创建 `/etc/nginx/conf.d/blog.conf`：

```nginx
server {
    listen 80;
    server_name 39.102.139.140;

    root /opt/blog/current/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /opt/blog/shared/runtime/uploads/;
        access_log off;
    }

    location = /application.yml {
        alias /opt/blog/shared/runtime/application.yml;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    }
}
```

检查并重载 Nginx：

```bash
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
```

## 4. GitHub Secrets 配置

在仓库 `Settings > Secrets and variables > Actions` 中添加：

- `ALIYUN_HOST`
- `ALIYUN_PORT`（建议 `22`）
- `ALIYUN_USER`
- `ALIYUN_SSH_KEY`（与服务器 `authorized_keys` 配对的私钥）

## 5. 自动发布流程

1. 推送代码到 `main`。
2. 流水线构建：
   - 前端：`apps/spa/dist`
   - 后端：`backend/target/blog-backend-*.jar`
3. 打包 `release-<sha>.tgz`。
4. 上传发布包到 `/opt/blog/incoming`。
5. 上传脚本到 `/opt/blog/bin`。
6. 远程执行 `/opt/blog/bin/deploy_release.sh <sha>`。

### 部署脚本行为

- 解压到 `/opt/blog/releases/<sha>`
- 若缺失则初始化 `/opt/blog/shared/runtime/application.yml`
- 原子切换 `/opt/blog/current`
- 重启 `blog-backend.service`
- 在 60 秒内健康检查 `http://127.0.0.1:8080/api/categories`
- 失败自动回滚到上一个版本
- 仅保留最近 5 个版本目录

## 6. 手动回滚

查看可回滚版本：

```bash
ls -1 /opt/blog/releases
```

回滚到指定版本：

```bash
/opt/blog/bin/rollback_release.sh <sha>
```

## 7. 发布后验收清单

1. 执行 `curl -f http://127.0.0.1:8080/api/categories`
2. 打开首页确认前端改动已生效
3. 确认 `/application.yml` 保留了管理端更新内容
4. 确认已有 `/uploads/...` 图片链接仍可访问

## 8. 故障排查

- 在 GitHub Actions 查看构建和上传日志。
- 查看后端日志：
  - `sudo journalctl -u blog-backend.service -n 200 --no-pager`
- 查看 Nginx 日志：
  - `sudo tail -n 200 /var/log/nginx/error.log`
- 如果脚本中的重启失败，确认部署用户可执行 `systemctl`（root 登录或免密 sudo）。

## 9. 数据库变更策略

当前策略为发布前手工执行 SQL：

- 先执行迁移 SQL，再发布应用。
- 避免在同一次发布中做破坏性变更。
- 采用两阶段迁移：
  1. 兼容版本（新增字段/兼容逻辑）
  2. 稳定后清理旧结构
