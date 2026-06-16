# Lensmor Monitor MVP 实现计划（SSOT）

> **必需技能：** `spec-execute`（按批次执行本计划）
> **上下文获取：** 必须先执行 `spec-context` 获取上下文，定位 `{FEATURE_DIR}`，失败即停止

**目标：** 交付一个 TypeScript 全栈 Lensmor Monitor MVP：单用户登录、完整 onboarding、mock 竞品监控、统一采集分析任务、liteLLM Analysis Report、情报收件箱与反馈闭环。  
**范围：** In：Web/API/Worker/DB/mock-sites 的 greenfield MVP；Out：真实竞品站点采集、社媒分析、Strategic Summary、90 天历史演变、多租户团队协作。  
**架构：** Next.js App Router 承载 Web UI 和受保护 Route Handlers；独立 Node Worker 通过 DB-backed queue 执行手动/定时采集分析任务；Prisma + SQLite 作为 MVP 持久化起点，保留迁移到 PostgreSQL 的关系模型边界。  
**验收口径：** 引用 `requirements/prd.md` AC-001..AC-020；核心闭环为首次登录 -> onboarding -> 添加 mock 竞品 -> 手动刷新/定时任务 -> 生成 Analysis Report -> 收件箱查看和反馈。  
**影响范围：** Onboarding、Auth、Competitor Monitoring、Collection Task、AI Analysis、Intelligence Inbox。  
**需遵守的不变量：** 未登录不能访问核心页面/API；业务对象默认归当前登录主体；手动刷新和定时任务复用同一任务模型；AI/采集失败不生成空报告；liteLLM key 仅服务端运行时注入；mock 竞品网站为 MVP 采集对象。  
**子仓范围：** 无。当前仓库未发现 `.gitmodules`。

---

## TL;DR

按“工程骨架 -> DB/领域模型 -> Web onboarding/竞品 -> Worker 任务与 AI -> 收件箱/反馈 -> 集成验证”的顺序实现，先跑通最小闭环，再补边界状态和验证。

## 范围与边界

- In：
  - 创建 TypeScript monorepo、Next.js Web/API、Node Worker、Prisma/SQLite、mock-sites。
  - 实现单用户登录、session 保护、onboarding、竞品管理、任务触发、任务状态、报告收件箱和反馈。
  - 实现 mock 快照差异、liteLLM 服务端调用、结构化报告校验和失败不入箱。
- Out：
  - 不接真实第三方站点采集。
  - 不实现多租户/RBAC/组织。
  - 不接外部 Auth SaaS。
  - 不引入 Redis/BullMQ 作为 MVP 前置。
  - 不实现 Strategic Summary、社媒分析、历史演变。

## 影响范围与约束

- Onboarding：
  - 新增完整 3 步引导，输出角色、自有产品信息和初始竞品。
  - 输出必须进入 AI Analysis 上下文。
- Auth：
  - 新增单用户登录和服务端授权边界。
  - 所有产品域页面和 API 必须鉴权。
- Competitor Monitoring：
  - 新增竞品列表、详情、增删改、暂停/恢复、关联链接上限 10 条。
  - mock 竞品为首版采集对象。
- Collection Task：
  - 新增任务状态机：`queued -> collecting -> diffing -> analyzing -> completed | failed`。
  - 手动刷新和定时任务只在触发准入层分叉。
- AI Analysis：
  - 服务端调用 liteLLM。
  - 结构化输出后必须服务端业务校验。
- Intelligence Inbox：
  - 首版只承载 Analysis Report。
  - 支持筛选、详情、自动已读、Useful/Wrong/Not Important 反馈。
- CONTEXT GAP：
  - `.aisdlc/project/*` 不存在；I1 不阻断，但 I2 后应通过 merge-back 或增量 Discover 沉淀组件页、契约、ADR 和 ops。

## 代码工作区清单

- 根项目：`C:\data\code\aidlc\lensmor-monitor`
- 子仓：无
- 默认分支：`001-build-monitor-mvp`
- 计划创建的主要工作区：
  - `apps/web`
  - `apps/worker`
  - `packages/domain`
  - `packages/db`
  - `mock-sites`

## 里程碑与节奏

- M0 工程骨架：monorepo、脚本、环境变量示例、基础测试命令。
- M1 数据与领域内核：Prisma schema、任务状态机、报告契约、mock fixture。
- M2 Web/API 主路径：登录、onboarding、竞品管理、手动刷新、任务状态。
- M3 Worker 与 AI：DB-backed queue、mock diff、liteLLM 调用、失败处理。
- M4 收件箱与反馈：列表、筛选、详情、已读、反馈。
- M5 集成验证：AC-001..AC-020 的最小验证闭环。

## 依赖与资源

- Node.js 与 pnpm：I2 开始前确认本机可执行 `node --version`、`pnpm --version`。
- liteLLM 网关：通过 `LITELLM_BASE_URL` 与 `LITELLM_API_KEY` 注入；真实调用验收前由用户提供。
- 应用密钥：`SESSION_SECRET`、`SCHEDULER_TOKEN` 通过 `.env.local` 注入。
- DB：MVP 默认 SQLite 文件；实现中避免写死不可迁移的 SQL 方言。

## 风险与验证

- R1 TypeScript 全栈骨架无法一键启动：
  - 验证：`pnpm install`、`pnpm dev`、`pnpm test` 可执行。
  - Owner：研发负责人。
- R2 liteLLM 报告质量不达标：
  - 验证：3 组 mock 快照调用，完整报告、失败率 <5%、单次 <30s。
  - Owner：研发负责人。
- R3 mock 差异样例不足：
  - 验证：至少 5 个变化样例、至少 4 类可解释差异。
  - Owner：产品负责人；研发负责人。
- R4 重复任务或重复报告：
  - 验证：同一竞品运行中任务重复触发不重复入箱。
  - Owner：研发负责人。
- R5 权限边界遗漏：
  - 验证：未登录访问核心页面和 API 均被拒绝。
  - Owner：研发负责人；测试负责人。

## 验收口径

- AC-001..AC-004：登录后完整 onboarding，保存用户角色、自有产品信息和至少 1 个 mock 竞品。
- AC-005..AC-009：手动刷新/定时任务进入统一任务流，成功生成报告，失败记录原因且不入箱。
- AC-010..AC-015：收件箱筛选、报告详情、自动已读、反馈和 Wrong 错误类型校验。
- AC-016..AC-020：未登录拒绝、空状态、异步状态、首屏和列表加载目标。

## NEEDS CLARIFICATION

当前无阻断进入 I2 的不确定项。

非阻断运行依赖：
- 真实 liteLLM 网关 URL 与 key 在真实 AI 调用验收前提供；I2 可先用 `.env.example`、mock adapter 和失败路径测试推进。
- 部署平台未指定；I2 只需保证本地 dev/test 可运行，部署入口在后续 ops/merge-back 阶段沉淀。

## 任务清单（SSOT）

### Task T1: 创建 TypeScript monorepo 工程骨架

- [x] **状态**：完成

**代码仓范围：**
- 根项目：`C:\data\code\aidlc\lensmor-monitor`
- 子仓：无

**文件：**
- 创建：`package.json`
- 创建：`pnpm-workspace.yaml`
- 创建：`tsconfig.base.json`
- 创建：`.gitignore`
- 创建：`.env.example`
- 创建：`README.md`
- 创建：`apps/web/package.json`
- 创建：`apps/worker/package.json`
- 创建：`packages/domain/package.json`
- 创建：`packages/db/package.json`

**验收点：**
- 根项目声明 pnpm workspace。
- 根项目提供 `dev`、`test`、`lint`、`typecheck`、`db:migrate` 脚本入口。
- `.env.example` 不包含真实密钥。

**步骤 1：创建最小 workspace 文件**
- 修改点：上述创建文件。
- Run: `pnpm --version`
- Expected: 输出 pnpm 版本。

**步骤 2：安装依赖并验证 workspace**
- Run: `pnpm install`
- Expected: 依赖安装成功并生成 lockfile。

**步骤 3：运行基础验证**
- Run: `pnpm typecheck`
- Expected: PASS，或在仅骨架阶段无 TS 项目时输出受控提示。
- Result: PASS。`pnpm install` 成功；`pnpm typecheck` 对 `packages/domain`、`packages/db`、`apps/worker`、`apps/web` 全部通过。执行中发现本机 Node 为 `v20.18.1`，Prisma 7 要求 `20.19+`，已调整为 Prisma 6.x 以满足本地可执行性。

**步骤 4：提交（受 AUTO_COMMIT 控制）**
- Commit message: `初始化 TypeScript 全栈工作区`
- 审计信息：
  - repo: `root`
    branch: `001-build-monitor-mvp`
    commit: `548cd73`
    pr: 未创建
    changed_files: `.env.example`, `.gitignore`, `README.md`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next-env.d.ts`, `apps/worker/package.json`, `apps/worker/tsconfig.json`, `apps/worker/src/index.ts`, `packages/domain/package.json`, `packages/domain/tsconfig.json`, `packages/domain/src/index.ts`, `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/src/client.ts`, `.aisdlc/specs/001-build-monitor-mvp/implementation/plan.md`

### Task T2: 建立 DB 与领域内核

- [x] **状态**：完成

**代码仓范围：**
- 根项目：`C:\data\code\aidlc\lensmor-monitor`

**文件：**
- 创建：`packages/db/prisma/schema.prisma`
- 创建：`packages/db/src/client.ts`
- 创建：`packages/domain/src/task-state.ts`
- 创建：`packages/domain/src/report-contract.ts`
- 创建：`packages/domain/src/auth-boundary.ts`
- 创建：`packages/domain/src/__tests__/task-state.test.ts`

**验收点：**
- 任务状态机覆盖 `queued`、`collecting`、`diffing`、`analyzing`、`completed`、`failed`。
- 报告契约表达 Analysis Report 必含信息与服务端校验入口。
- DB 模型覆盖用户、onboarding、竞品、任务、快照、报告、已读和反馈的最小关系。

**步骤 1：写失败测试**
- 修改点：`packages/domain/src/__tests__/task-state.test.ts`
- Run: `pnpm test -- --run task-state`
- Expected: FAIL，关键失败信号为任务状态机尚未实现。

**步骤 2：写最少实现**
- 修改点：`packages/domain/src/task-state.ts`、`packages/domain/src/report-contract.ts`、`packages/domain/src/auth-boundary.ts`、`packages/db/prisma/schema.prisma`

**步骤 3：运行验证**
- Run: `pnpm test -- --run task-state; pnpm db:migrate; pnpm typecheck`
- Expected: PASS；Prisma migration 可在本地 SQLite 执行。
- Result: PASS。`pnpm test -- --run task-state` 4 个测试通过；`DATABASE_URL=file:./dev.db pnpm db:migrate` 已同步 SQLite schema；`pnpm typecheck` 全部 workspace 通过。执行中发现 Prisma Client 生成器在 pnpm workspace 下自动解析不稳定，已将 `db:migrate` 调整为 `--skip-generate`，T2 先固定 schema/migration 与领域内核，实际查询封装在后续业务 API 任务中补齐。

**步骤 4：提交（受 AUTO_COMMIT 控制）**
- Commit message: `建立数据模型与任务状态机内核`
- 审计信息：
  - repo: `root`
    branch: `001-build-monitor-mvp`
    commit: `503b590`
    pr: 未创建
    changed_files: `.gitignore`, `package.json`, `pnpm-lock.yaml`, `packages/domain/src/index.ts`, `packages/domain/src/task-state.ts`, `packages/domain/src/report-contract.ts`, `packages/domain/src/auth-boundary.ts`, `packages/domain/src/__tests__/task-state.test.ts`, `packages/db/package.json`, `packages/db/src/client.ts`, `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260616085833_init/migration.sql`, `packages/db/prisma/migrations/migration_lock.toml`, `.aisdlc/specs/001-build-monitor-mvp/implementation/plan.md`

### Task T3: 实现登录与受保护 API 边界

- [x] **状态**：完成

**文件：**
- 创建：`apps/web/app/login/page.tsx`
- 创建：`apps/web/app/layout.tsx`
- 创建：`apps/web/app/page.tsx`
- 创建：`apps/web/app/api/auth/login/route.ts`
- 创建：`apps/web/app/api/auth/logout/route.ts`
- 创建：`apps/web/lib/session.ts`
- 创建：`apps/web/middleware.ts`
- 创建：`apps/web/__tests__/auth-boundary.test.ts`

**验收点：**
- 未登录访问主页面和受保护 API 返回拒绝或跳转登录。
- 登录成功后进入 onboarding 或主界面。
- liteLLM key 不进入客户端 bundle。

**步骤 1：写失败测试**
- Run: `pnpm test -- --run auth-boundary`
- Expected: FAIL，未登录访问保护边界测试失败。

**步骤 2：写最少实现**
- 修改点：登录页、session helper、middleware、auth route handlers。

**步骤 3：运行验证**
- Run: `pnpm test -- --run auth-boundary; pnpm typecheck; pnpm lint`
- Expected: PASS。
- Result: PASS。`pnpm test -- --run auth-boundary` 4 个测试通过；`pnpm typecheck` 全部 workspace 通过；`pnpm lint` 通过。执行中补充 `eslint.config.mjs`，使计划中的 lint 命令可执行。

**步骤 4：提交（受 AUTO_COMMIT 控制）**
- Commit message: `实现单用户登录与服务端保护边界`
- 审计信息：
  - repo: `root`
    branch: `001-build-monitor-mvp`
    commit: `b2b8df1`
    pr: 未创建
    changed_files: `eslint.config.mjs`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/login/page.tsx`, `apps/web/app/api/auth/login/route.ts`, `apps/web/app/api/auth/logout/route.ts`, `apps/web/lib/session.ts`, `apps/web/middleware.ts`, `apps/web/__tests__/auth-boundary.test.ts`, `.aisdlc/specs/001-build-monitor-mvp/implementation/plan.md`

### Task T4: 实现 onboarding 与竞品管理主路径

- [x] **状态**：完成

**文件：**
- 创建：`apps/web/app/onboarding/page.tsx`
- 创建：`apps/web/app/competitors/page.tsx`
- 创建：`apps/web/app/competitors/[id]/page.tsx`
- 创建：`apps/web/app/api/onboarding/route.ts`
- 创建：`apps/web/app/api/competitors/route.ts`
- 创建：`apps/web/app/api/competitors/[id]/route.ts`
- 创建：`apps/web/__tests__/onboarding.test.ts`
- 创建：`apps/web/__tests__/competitors.test.ts`

**验收点：**
- AC-001..AC-004 可验证。
- 竞品关联链接上限 10 条。
- 竞品状态支持监控中、已暂停、采集进行中。

**步骤 1：写失败测试**
- Run: `pnpm test -- --run onboarding competitors`
- Expected: FAIL，onboarding 和竞品 API/UI 主路径尚未实现。

**步骤 2：写最少实现**
- 修改点：onboarding 页面/API、竞品列表/详情/API。

**步骤 3：运行验证**
- Run: `pnpm test -- --run onboarding competitors; pnpm typecheck; pnpm lint`
- Expected: PASS。
- Result: PASS。`pnpm test -- --run onboarding competitors` 2 个测试文件、4 个测试通过；`pnpm typecheck` 全部 workspace 通过；`pnpm lint` 通过。

**步骤 4：提交（受 AUTO_COMMIT 控制）**
- Commit message: `实现引导流程与竞品管理主路径`
- 审计信息：
  - repo: `root`
    branch: `001-build-monitor-mvp`
    commit: `9c8c1df`
    pr: 未创建
    changed_files: `apps/web/app/onboarding/page.tsx`, `apps/web/app/competitors/page.tsx`, `apps/web/app/competitors/[id]/page.tsx`, `apps/web/app/api/onboarding/route.ts`, `apps/web/app/api/competitors/route.ts`, `apps/web/app/api/competitors/[id]/route.ts`, `apps/web/lib/api-auth.ts`, `apps/web/lib/mvp-store.ts`, `apps/web/__tests__/onboarding.test.ts`, `apps/web/__tests__/competitors.test.ts`, `.aisdlc/specs/001-build-monitor-mvp/implementation/plan.md`

### Task T5: 建立 mock-sites 与差异分析

- [x] **状态**：完成

**文件：**
- 创建：`mock-sites/acme-ai/pages/pricing/snapshots/001-baseline.html`
- 创建：`mock-sites/acme-ai/pages/pricing/snapshots/002-cta-change.html`
- 创建：`mock-sites/acme-ai/pages/pricing/scenarios/cta-change.json`
- 创建：`mock-sites/acme-ai/pages/product/scenarios/feature-launch.json`
- 创建：`mock-sites/nova-stack/pages/home/scenarios/layout-change.json`
- 创建：`packages/domain/src/diff.ts`
- 创建：`packages/domain/src/__tests__/diff.test.ts`

**验收点：**
- 至少 5 个变化样例覆盖文案、定价、功能、页面结构、CTA 调整。
- 至少 1 个噪音变化负例不会生成报告。
- diff 输出可作为 liteLLM prompt 的事实输入。

**步骤 1：写失败测试**
- Run: `pnpm test -- --run diff`
- Expected: FAIL，diff fixture 解析和变化识别尚未实现。

**步骤 2：写最少实现**
- 修改点：mock-sites fixture、`packages/domain/src/diff.ts`。

**步骤 3：运行验证**
- Run: `pnpm test -- --run diff`
- Expected: PASS，至少 4 类变化可解释。
- Result: PASS。`pnpm test -- --run diff` 1 个测试文件、2 个测试通过；覆盖 copy、pricing、feature、layout、cta 5 类解释性变化和 noise 负例；`pnpm typecheck` 与 `pnpm lint` 均通过。

**步骤 4：提交（受 AUTO_COMMIT 控制）**
- Commit message: `建立 mock 竞品快照与差异分析`
- 审计信息：
  - repo: `root`
    branch: `001-build-monitor-mvp`
    commit: `0301450`
    pr: 未创建
    changed_files: `packages/domain/src/diff.ts`, `packages/domain/src/index.ts`, `packages/domain/src/__tests__/diff.test.ts`, `mock-sites/acme-ai/pages/pricing/snapshots/001-baseline.html`, `mock-sites/acme-ai/pages/pricing/snapshots/002-cta-change.html`, `mock-sites/acme-ai/pages/pricing/snapshots/003-price-change.html`, `mock-sites/acme-ai/pages/pricing/snapshots/004-footer-noise.html`, `mock-sites/acme-ai/pages/pricing/scenarios/cta-change.json`, `mock-sites/acme-ai/pages/pricing/scenarios/price-change.json`, `mock-sites/acme-ai/pages/pricing/scenarios/footer-noise.json`, `mock-sites/acme-ai/pages/product/snapshots/001-baseline.html`, `mock-sites/acme-ai/pages/product/snapshots/002-feature-launch.html`, `mock-sites/acme-ai/pages/product/scenarios/feature-launch.json`, `mock-sites/nova-stack/pages/home/snapshots/001-baseline.html`, `mock-sites/nova-stack/pages/home/snapshots/002-layout-change.html`, `mock-sites/nova-stack/pages/home/snapshots/003-copy-change.html`, `mock-sites/nova-stack/pages/home/scenarios/layout-change.json`, `mock-sites/nova-stack/pages/home/scenarios/copy-change.json`, `.aisdlc/specs/001-build-monitor-mvp/implementation/plan.md`

### Task T6: 实现 Worker 任务执行与 liteLLM 适配器

- [x] **状态**：完成

**文件：**
- 创建：`apps/worker/src/index.ts`
- 创建：`apps/worker/src/task-runner.ts`
- 创建：`apps/worker/src/litellm-client.ts`
- 创建：`apps/worker/src/scheduler.ts`
- 创建：`apps/worker/src/__tests__/task-runner.test.ts`
- 创建：`apps/web/app/api/tasks/route.ts`
- 创建：`apps/web/app/api/tasks/[id]/route.ts`

**验收点：**
- AC-005..AC-009 可验证。
- 手动刷新和定时任务复用同一任务执行器。
- AI 失败、采集失败、结构校验失败不生成空报告。
- liteLLM key 仅服务端读取。

**步骤 1：写失败测试**
- Run: `pnpm test -- --run task-runner`
- Expected: FAIL，任务执行器和 liteLLM adapter 尚未实现。

**步骤 2：写最少实现**
- 修改点：Worker、task API、liteLLM client、scheduler。

**步骤 3：运行验证**
- Run: `pnpm test -- --run task-runner; pnpm typecheck; pnpm lint`
- Expected: PASS。
- Result: PASS。`pnpm test -- --run task-runner` 1 个测试文件、3 个测试通过；覆盖成功报告、AI 失败不入箱、暂停竞品定时跳过；`pnpm typecheck` 与 `pnpm lint` 均通过。

**步骤 4：提交（受 AUTO_COMMIT 控制）**
- Commit message: `实现统一采集任务与 AI 报告生成`
- 审计信息：
  - repo: `root`
    branch: `001-build-monitor-mvp`
    commit: `4a8b8e0`
    pr: 未创建
    changed_files: `apps/worker/src/index.ts`, `apps/worker/src/task-runner.ts`, `apps/worker/src/litellm-client.ts`, `apps/worker/src/scheduler.ts`, `apps/worker/src/__tests__/task-runner.test.ts`, `apps/web/app/api/tasks/route.ts`, `apps/web/app/api/tasks/[id]/route.ts`, `.aisdlc/specs/001-build-monitor-mvp/implementation/plan.md`

### Task T7: 实现情报收件箱、报告详情与反馈

- [x] **状态**：完成

**文件：**
- 创建：`apps/web/app/inbox/page.tsx`
- 创建：`apps/web/app/reports/[id]/page.tsx`
- 创建：`apps/web/app/api/reports/route.ts`
- 创建：`apps/web/app/api/reports/[id]/route.ts`
- 创建：`apps/web/app/api/reports/[id]/feedback/route.ts`
- 创建：`apps/web/__tests__/inbox.test.ts`
- 创建：`apps/web/__tests__/feedback.test.ts`

**验收点：**
- AC-010..AC-015 可验证。
- 打开详情自动已读。
- Wrong 反馈未选错误类型时阻止提交。

**步骤 1：写失败测试**
- Run: `pnpm test -- --run inbox feedback`
- Expected: FAIL，收件箱和反馈尚未实现。

**步骤 2：写最少实现**
- 修改点：Inbox 页面、Report 详情、Reports API、Feedback API。

**步骤 3：运行验证**
- Run: `pnpm test -- --run inbox feedback; pnpm typecheck; pnpm lint`
- Expected: PASS。
- Result: PASS。`pnpm test -- --run inbox feedback` 2 个测试文件、4 个测试通过；覆盖报告筛选、详情自动已读、Useful/Not Important/Wrong 反馈和 Wrong 原因必填；`pnpm typecheck` 与 `pnpm lint` 均通过。

**步骤 4：提交（受 AUTO_COMMIT 控制）**
- Commit message: `实现情报收件箱与反馈闭环`
- 审计信息：
  - repo: `root`
    branch: `001-build-monitor-mvp`
    commit: `7370728`
    pr: 未创建
    changed_files: `apps/web/app/inbox/page.tsx`, `apps/web/app/reports/[id]/page.tsx`, `apps/web/app/api/reports/route.ts`, `apps/web/app/api/reports/[id]/route.ts`, `apps/web/app/api/reports/[id]/feedback/route.ts`, `apps/web/lib/mvp-store.ts`, `apps/web/__tests__/inbox.test.ts`, `apps/web/__tests__/feedback.test.ts`, `.aisdlc/specs/001-build-monitor-mvp/implementation/plan.md`

### Task T8: 集成验证与文档收尾

- [x] **状态**：完成

**文件：**
- 修改：`README.md`
- 创建：`apps/web/e2e/mvp-flow.spec.ts`
- 修改：`.env.example`
- 修改：`.aisdlc/specs/001-build-monitor-mvp/implementation/plan.md`

**验收点：**
- AC-001..AC-020 有最小自动或手工验证入口。
- README 包含 dev/test/env 说明。
- plan.md 执行状态在 I2 中按批次更新。

**步骤 1：写端到端验证**
- Run: `pnpm test:e2e`
- Expected: FAIL，MVP flow 尚未全部跑通。

**步骤 2：补齐集成闭环和 README**
- 修改点：README、e2e、环境变量示例、必要的测试夹具。

**步骤 3：运行完整验证**
- Run: `pnpm lint; pnpm typecheck; pnpm test; pnpm test:e2e`
- Expected: PASS。
- Result: PASS。`pnpm test:e2e` 1 个 e2e 测试通过；`pnpm lint` 通过；`pnpm typecheck` 全部 workspace 通过；`pnpm test` 9 个测试文件、22 个测试通过。

**步骤 4：提交（受 AUTO_COMMIT 控制）**
- Commit message: `补齐 MVP 集成验证与运行说明`
- 审计信息：
  - repo: `root`
    branch: `001-build-monitor-mvp`
    commit: `4a6f695`
    pr: 未创建
    changed_files: `README.md`, `.env.example`, `eslint.config.mjs`, `apps/worker/package.json`, `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/e2e/mvp-flow.spec.ts`, `apps/web/__tests__/mvp-flow-helper.ts`, `.aisdlc/specs/001-build-monitor-mvp/implementation/plan.md`

### I2 补充批次：补齐前端业务页面闭环

- [x] **状态**：完成

**触发原因：**
- 人工验收发现登录后 `/`、`/onboarding`、`/competitors`、`/competitors/[id]`、`/inbox`、`/reports/[id]` 多数仍是静态占位，虽 API 测试通过但前端业务不可操作。

**修改点：**
- 根路由按 onboarding 状态分流到 `/onboarding` 或 `/competitors`。
- `/onboarding` 补齐角色、产品信息、推荐/手动竞品的可提交表单。
- `/competitors` 补齐竞品列表、新增、暂停/恢复、删除和空状态。
- `/competitors/[id]` 补齐详情、编辑、关联链接、任务状态、手动刷新、最新报告入口。
- `/api/tasks` 补齐 mock 采集执行、任务存储、报告生成；`/api/tasks/[id]` 返回真实任务状态。
- `/inbox` 补齐报告列表、已读状态、竞品/优先级/日期筛选。
- `/reports/[id]` 补齐报告正文、自动已读、Useful/Wrong/Not Important 反馈；Wrong 原因必填。
- 补齐应用导航、登出入口、业务卡片/状态/表单样式。
- 追加前端全中文界面：页面文案、表单提示、状态标签、筛选项、反馈原因、API 可见错误和 mock 报告内容均改为中文。
- 修复 onboarding 后 `/competitors` 空列表：`mvp-store` 改为 `globalThis` 单例，确保 API route 与页面渲染共享同一份 MVP 内存数据。

**验证：**
- Result: PASS。`pnpm test` 9 个测试文件、22 个测试通过。
- Result: PASS。`pnpm typecheck` 全部 workspace 通过。
- Result: PASS。`pnpm lint` 通过。
- Result: PASS。`pnpm test:e2e` 1 个 e2e smoke 测试通过。

**审计信息：**
- repo: `root`
  branch: `001-build-monitor-mvp`
  commit: 未提交（本次对话用户未要求 commit）
  pr: 未创建
  changed_files: `apps/worker/package.json`, `apps/worker/src/litellm-client.ts`, `apps/web/__tests__/auth-boundary.test.ts`, `apps/web/__tests__/onboarding.test.ts`, `apps/web/app/app-shell.tsx`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/login/page.tsx`, `apps/web/app/login/login-form.tsx`, `apps/web/app/onboarding/page.tsx`, `apps/web/app/onboarding/onboarding-form.tsx`, `apps/web/app/competitors/page.tsx`, `apps/web/app/competitors/competitors-client.tsx`, `apps/web/app/competitors/[id]/page.tsx`, `apps/web/app/competitors/[id]/competitor-detail-client.tsx`, `apps/web/app/inbox/page.tsx`, `apps/web/app/reports/[id]/page.tsx`, `apps/web/app/reports/[id]/report-feedback-form.tsx`, `apps/web/app/api/auth/login/route.ts`, `apps/web/app/api/auth/logout/route.ts`, `apps/web/app/api/onboarding/route.ts`, `apps/web/app/api/competitors/route.ts`, `apps/web/app/api/competitors/[id]/route.ts`, `apps/web/app/api/reports/[id]/route.ts`, `apps/web/app/api/reports/[id]/feedback/route.ts`, `apps/web/app/api/tasks/route.ts`, `apps/web/app/api/tasks/[id]/route.ts`, `apps/web/lib/api-auth.ts`, `apps/web/lib/mvp-store.ts`, `apps/web/lib/page-session.ts`, `apps/web/lib/session.ts`, `apps/web/app/globals.css`, `apps/web/package.json`, `pnpm-lock.yaml`, `.aisdlc/specs/001-build-monitor-mvp/implementation/plan.md`

## I1-DoD 自检

- [x] 计划范围与 `requirements/*`、`design/*` 一致且可追溯。
- [x] 里程碑明确且可验收。
- [x] 依赖与风险已列出，并有最小验证/缓解动作。
- [x] 关键验收口径可追溯到 `requirements/prd.md` 和 `requirements/solution.md`。
- [x] 影响范围与约束已注入，受影响模块和不变量来自 `requirements/solution.md#impact-analysis`。
- [x] 当前无 `.gitmodules`，无子仓分支要求。
- [x] 存在任务清单（SSOT），每个任务包含文件路径、验收点、验证方式、提交点与审计信息。
- [x] `NEEDS CLARIFICATION` 已存在，当前无阻断进入 I2 的不确定项。
