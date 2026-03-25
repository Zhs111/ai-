# 数据库迁移说明

## 文件命名规范
```
YYYYMMDDHHMMSS_description.sql

示例:
20240325143000_add_user_level.sql
20240325150000_create_achievements_table.sql
```

## 使用方法

### 创建新迁移
```bash
npm run migrate:create add_user_level
```

### 执行所有迁移
```bash
npm run migrate:up
```

### 回滚最后一次迁移
```bash
npm run migrate:down
```

### 查看迁移状态
```bash
npm run migrate:status
```
