# 生产与预发布环境隔离

## 环境拓扑

| 环境 | Vercel | Supabase | 数据用途 |
| --- | --- | --- | --- |
| Production | Production Deployment | 现有正式项目 | 仅真实用户与正式运营数据 |
| Staging | Preview/独立 staging 域名 | 新建独立项目 | 回归、迁移、支付沙箱和恢复演练 |
| Local | `localhost` | staging 或本地 Supabase | 开发，不允许连接正式项目 |

## 必填环境变量

每个环境都配置：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
EXPECTED_SUPABASE_PROJECT_REF
PRODUCTION_SUPABASE_PROJECT_REF
DEPLOYMENT_ENVIRONMENT
```

- Production：`EXPECTED_SUPABASE_PROJECT_REF` 等于正式项目 ref，
  `DEPLOYMENT_ENVIRONMENT=production`。
- Staging：`EXPECTED_SUPABASE_PROJECT_REF` 等于 staging 项目 ref，
  `PRODUCTION_SUPABASE_PROJECT_REF` 填正式项目 ref，
  `DEPLOYMENT_ENVIRONMENT=staging`。
- Local：默认连接 staging；禁止将 expected ref 配成正式项目。

运行 `pnpm verify:environment` 检查环境是否误连。

## 建立 staging

1. 在 Supabase 新建独立项目，不复制正式用户密码或敏感数据。
2. 按编号依次执行 `supabase/migrations`。
3. 在 staging 建立专用管理员、画师、个人用户测试账号。
4. 在 Vercel Preview 环境只配置 staging 的 URL 和 anon key。
5. 将生命周期和破坏性测试固定指向 staging。
6. 正式发布前先在 staging 执行迁移、类型检查、构建和回归。

## 生产测试数据清理

先在已登录的 Supabase SQL Editor 运行
`scripts/production-data-cleanup-preview.sql`。它只返回疑似测试账号及关联记录数量，
不读取私信、地址正文，也不会删除任何数据。

清理必须遵守：

1. 导出待清理 ID 和关联数量。
2. 人工确认保留的管理员及演示账号。
3. 生成只针对确认 ID 的事务脚本。
4. 删除前建立数据库和 Storage 备份。
5. 事务内先删除业务关联数据，最后删除 Auth 用户。
6. 执行后重新运行预览并记录审计证据。

未经明确确认，不在生产环境执行删除。
