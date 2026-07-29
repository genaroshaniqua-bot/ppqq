# 监控、告警、客服与灾备运行手册

## 当前接入

- `GET /api/health`：公开、无敏感信息、禁止缓存；检查应用与数据库连通性。
- `operations_events`：记录去重后的登录用户端运行错误；管理员在 `/admin/operations` 处理。
- `support_tickets` / `support_ticket_messages`：用户在 `/support` 提交并跟踪，管理员统一受理。
- `recovery_runs`：记录数据库、Storage、部署回滚、密钥轮换与完整恢复演练。
- 管理员处理告警和工单会写入 `platform_audit_logs`。

## 告警分级

| 级别 | 例子 | 目标响应 |
| --- | --- | --- |
| Critical | 健康检查失败、核心流程持续 5xx、数据库不可用 | 15 分钟内确认 |
| Warning | 同一路由客户端错误集中出现、客服工单标记紧急 | 4 小时内处理 |
| Info | 单次非阻断异常、演练和变更记录 | 下个工作日检查 |

生产外部告警建议依次接入：

1. 免费阶段：独立可用性探针每 5 分钟请求 `/api/health`，失败两次再通知，避免瞬时抖动。
2. Vercel Pro + Observability Plus：启用 Error Anomaly 与 Usage Anomaly，通知到运营邮箱。
3. Supabase Pro：按成本决定是否启用 Log Drain；仅在需要跨系统检索、S3 长期归档或实时告警时开启。

## 灾备目标

- 上线初期目标 RPO：24 小时；目标 RTO：4 小时。
- 订单、委托、工单等核心表进入真实交易后，目标调整为 RPO 1 小时、RTO 2 小时。
- Supabase 数据库备份不包含 Storage 对象；数据库与 Storage 必须分别备份和恢复验证。
- 每季度至少执行一次演练，演练默认使用 staging 或新 Supabase 项目，禁止直接覆盖生产。

## 每日与每周检查

每日：

1. 访问 `/admin/operations`，确认应用、数据库均为正常。
2. 处理 Critical 告警与 urgent 工单。
3. 检查 Vercel 部署与 Supabase 服务状态。

每周：

1. 检查未关闭客服工单与重复错误。
2. 核实最新数据库备份时间。
3. 导出或同步新增的 Storage 文件清单。
4. 检查管理员审计记录中是否存在异常权限变更。

## 恢复顺序

1. 宣布进入故障处理，记录开始时间与影响范围。
2. 如为前端发布故障，优先在 Vercel 回滚到最近一个已验证部署。
3. 如为数据库误操作，先冻结写入，再选择最近恢复点恢复到新项目或演练环境核验。
4. 单独恢复 Storage 对象，核对数据库中的对象路径与实际文件。
5. 执行登录、约稿、交付、客服、管理员权限和健康检查回归。
6. 恢复流量，记录实际 RPO、RTO、根因和改进项。

## 需要人工配置的外部能力

- Vercel Alerts：需要符合套餐条件并在 Observability > Alerts 中选择邮件、Slack 或 Webhook。
- Supabase 自动备份/PITR：需要确认项目套餐与恢复保留期。
- Supabase Log Drains：属于付费能力，需要目标系统凭据；不得把 DSN、API Key 或 S3 Secret 写入仓库。
- Storage 异地备份：需准备独立对象存储账户和最小权限密钥后再接入。
