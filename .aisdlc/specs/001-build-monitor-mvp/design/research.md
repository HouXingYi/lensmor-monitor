---
title: Lensmor Monitor MVP D1 Research
status: draft
---

## 基本信息

- Date：2026-06-16
- Feature：Lensmor Monitor MVP
- Spec（分支 / ID）：001-build-monitor-mvp
- 作者：AI Agent

## TL;DR

- 最大风险：当前仓库是 greenfield Spec-first 仓库，除 `.aisdlc` 需求产物与 `docs` 原始需求外没有应用源码、依赖清单、运行脚本、CI 或 `.aisdlc/project/*`。
- 推荐方向：D2 不应停止，也不应把完整 Discover 作为前置；应直接决策 greenfield MVP 工程骨架、技术栈、运行边界与模块落点。
- 机制级架构输入：Web 应用、API/服务层、后台任务执行器、mock 竞品站点、持久化存储、服务端 liteLLM 集成。
- 核心设计不变量：手动刷新与定时任务只在触发准入层分叉，进入任务执行层后复用同一任务状态机。
- 安全边界：单用户不等于无授权；登录态、数据所有权、服务端授权和密钥运行时注入是 MVP 的最低安全边界。

## 未知项到研究任务映射

| 来源 | 未知项 / 依赖 / 集成点 | 任务编号 |
|---|---|---|
| `solution.md` V-005 / Context Gaps | 仓库缺少应用入口、技术栈、运行/测试/部署边界 | T1 |
| `solution.md` Impact Analysis | MVP 模块如何映射到 greenfield 工程骨架 | T1 |
| `solution.md` V-003 / `prd.md` RISK-003 | 定时任务与手动刷新如何共用任务模型 | T2 |
| R1 澄清 2 / `prd.md` F-008 / BR-013 | liteLLM 网关如何服务端集成并处理失败 | T3 |
| `prd.md` BR-009 / AC-008 | Analysis Report 输出如何稳定约束 | T4 |
| R1 澄清 3 / `prd.md` AC-016 / BR-013 | 单用户登录、数据归属、密钥与任务端点安全边界 | T5 |
| `prd.md` RISK-002 / `prototype.md` S-002 | mock 竞品网站、快照差异和样例覆盖如何可重复验证 | T6 |

## Research Tasks Completed

### T1. Greenfield 工程入口与 MVP 骨架方向

**Task**: 针对 Lensmor Monitor MVP 研究当前仓库缺少应用入口时，D2 应如何处理工程骨架、技术栈与模块落点。

**研究发现**：
- 仓库当前仅包含 `.aisdlc/specs/001-build-monitor-mvp/requirements/*` 与 `docs/Lensmor Monitor 原始需求.md`；未发现 `package.json`、`pyproject.toml`、`go.mod`、`.sln`、`.csproj`、`README`、`Dockerfile`、CI workflow 或源码目录。
- `.aisdlc/project/*` 不存在，无法从项目知识库确认产品北极星、术语、模块、契约或运行入口。
- `solution.md#impact-analysis` 已给出 6 个逻辑模块：Onboarding、Auth、Competitor Monitoring、Collection Task、AI Analysis、Intelligence Inbox。
- `prd.md` 与 `prototype.md` 需要重交互 UI、受保护 API、异步任务状态、持久化数据、mock 站点和服务端 AI 集成。

**Decision**：确认当前仓库为 greenfield Spec-first 仓库。D2 应进入工程骨架与技术栈决策，不停止、不前置完整 Project Discover；以 `solution.md#impact-analysis` 的 6 个模块作为逻辑边界，决策 Web、API、Worker、mock sites、DB 与服务端 AI 集成的物理落点。

**Rationale**：
- `V-005` 的触发动作是“先补项目骨架决策，再拆分实现任务”，不是中止 Spec。
- 当前没有可逆向代码，完整 Discover 会生成空索引或重复 Spec 内容，不能关闭技术栈和运行边界缺口。
- D2 若只写逻辑架构而不选技术栈，I1 无法写出明确的 `run/test/dev` 命令和实现批次。
- 6 个逻辑模块已经由 R1/R2/R3 证据化，足以作为 D2 的模块输入。

**Alternatives considered**：
- 先完整 Project Discover：不选。适用于存量代码逆向；当前无 code entry、无 CI、无契约，无法完成有效 Discover。
- 停止等待外部模板或现有仓库：不选。需求 SSOT 已完整，阻塞点是工程决策，不是需求缺失。
- D2 不选技术栈，I1 再决定：不选。技术栈会影响目录、运行命令、任务执行器、DB、部署边界和测试策略，应在 D2 固定。

**Evidence**：
- `requirements/solution.md#impact-analysis`
- `requirements/solution.md#context-gaps`
- `requirements/prd.md` RISK-005
- `requirements/prototype.md` 页面清单 P-001..P-011
- 仓库 Glob 结果：未发现应用源码入口、依赖清单、CI 或 `.aisdlc/project/*`

### T2. 统一采集分析任务模型

**Task**: 研究手动刷新与定时任务如何复用同一任务状态流，并满足排队、采集中、完成、失败可见，失败可追踪且不生成空报告。

**研究发现**：
- PRD 将手动刷新与定时任务都列为 P0，并要求复用同一任务状态流。
- 竞品状态包含监控中、已暂停、采集进行中；暂停状态不执行定时采集。
- 原型任务流已经把手动刷新与定时触发合并到 T-011，然后进入 T-012..T-016。

**Decision**：采用单一“采集分析任务”状态机。触发准入层区分 `manual` 与 `scheduled`，负责检查竞品状态、运行中任务和调度窗口；任务创建或复用后，采集、差异分析、liteLLM 调用、失败记录、报告入箱都走同一执行管道。

**Rationale**：
- 分叉应发生在“是否允许创建任务”阶段，而不是执行阶段。暂停竞品、重复触发、调度窗口去重都属于触发准入判断。
- 统一状态机能避免重复报告、失败原因不一致、手动和定时路径行为漂移。
- 对用户可见状态应保持稳定：排队、采集中、完成、失败；内部阶段可用于任务面板展示和排障。
- AI 失败、采集失败或结构校验失败都应进入失败状态，不进入收件箱；无有意义变化可完成任务但不生成报告。

**Alternatives considered**：
- 手动刷新与定时任务两套 pipeline：不选。违反 RISK-003，会导致状态、重试、失败和报告生成逻辑重复。
- 定时任务直接生成报告，手动刷新走任务队列：不选。定时路径难以展示任务状态和失败原因。
- 失败时生成占位报告：不选。违反 AC-009，并污染 Analysis Report 收件箱。

**Evidence**：
- `requirements/solution.md` V-003
- `requirements/prd.md` BR-006、BR-008、AC-005..AC-009
- `requirements/prototype.md` T-011..T-016、P-007、AC 映射

### T3. liteLLM 网关集成与失败处理

**Task**: 研究 liteLLM 网关应由同步请求、异步任务内调用还是队列 worker 调用，并明确失败、重试、超时与密钥边界。

**研究发现**：
- liteLLM Proxy 提供 OpenAI 兼容 `/v1/chat/completions` 调用，可通过 `Authorization: Bearer ...` 或 `x-litellm-api-key` 认证。
- liteLLM 文档支持 `num_retries`、`request_timeout`、`fallbacks`、`allowed_fails`、`cooldown_time` 等可靠性配置。
- PRD 要求单次生成目标不超过 30 秒，失败率低于 5%，失败时记录原因且不生成空报告。
- 浏览器直接调用 liteLLM 会暴露系统级 key，并绕过鉴权、审计、限流和任务状态。

**Decision**：liteLLM 调用必须发生在服务端后台任务执行器中。手动刷新和定时任务只创建或复用采集分析任务；Worker 在差异生成后调用 liteLLM，并把成功报告或失败原因写回统一任务状态流。MVP 可用轻量单 worker 起步，但设计语义必须是异步任务执行，而不是页面请求内同步生成。

**Rationale**：
- AI 生成耗时和失败模式不适合绑定前端请求生命周期；否则容易导致超时、重复提交和状态不可追踪。
- Worker 可集中处理端到端时间预算、有限重试、网关 fallback、结构降级、失败落库和日志脱敏。
- 服务端调用能保证 liteLLM key 不进入仓库、客户端构建产物、浏览器日志或错误响应。
- 任务状态流天然承接 PRD 的加载、失败、重试和“不生成空报告”要求。

**Alternatives considered**：
- 前端直接调用 liteLLM：不选。密钥暴露且无法可靠限制调用范围。
- API 请求同步调用 liteLLM：不选。30 秒目标接近常见请求超时边界，也不适配定时任务。
- 仅依赖 liteLLM 网关重试：不选。网关不理解本系统的任务状态、报告入箱规则和 UI 兜底口径。

**Evidence**：
- `requirements/solution.md` V-001
- `requirements/prd.md` BR-013、E-001、AC-007..AC-009
- `docs/Lensmor Monitor 原始需求.md` 系统运行机制与安全要求
- LiteLLM Context7 文档：Proxy 认证头、OpenAI compatible chat completions、retries、timeouts、fallbacks、cooldowns

### T4. Analysis Report 输出结构约束

**Task**: 研究 Analysis Report 如何稳定包含 PRD 必需信息，同时避免模型输出格式漂移影响收件箱和详情页。

**研究发现**：
- PRD 要求 Analysis Report 包含变更摘要、战略意图、行动建议、关联竞品、优先级、生成时间和原始链接。
- LiteLLM 文档支持通过 `response_format` 使用 `json_schema` 与 `strict` 请求结构化输出。
- 结构化 JSON 仍不能替代业务校验：模型可能输出无效链接、错误竞品关联、空内容或低相关内容。
- 报告输出会影响收件箱卡片、详情页、筛选、已读和反馈入口。

**Decision**：采用“报告契约 + 结构化输出 + 服务端业务校验 + 降级契约”的机制。主路径使用结构化响应约束输出形态；服务端入箱前校验必含信息、优先级合法性、原始链接可追溯、竞品关联一致性与内容非空。校验失败时进入重试或降级生成；仍失败则任务失败，不入收件箱。

**Rationale**：
- 结构化输出降低字段缺失和 UI 解析失败风险。
- 服务端业务校验是最后安全边界，可阻断模型幻觉、无效链接和错误竞品关联。
- 降级契约允许在复杂结构失败时保住核心价值，但不牺牲“不生成空报告”的规则。
- D1 固定机制即可；具体报告契约和版本化位置留给 D2。

**Alternatives considered**：
- 纯自然语言 prompt：不选。格式漂移高，难以支撑列表字段、筛选和详情结构。
- 只依赖 `json_schema strict`：不选。格式合法不代表业务语义有效。
- 前端解析原始模型输出：不选。会把质量控制推到客户端，增加安全和展示风险。

**Evidence**：
- `requirements/prd.md` BR-009、AC-008、AC-014
- `requirements/prototype.md` P-009、P-010
- LiteLLM Context7 文档：`response_format`、`json_schema`、`strict` structured output

### T5. 单用户登录、密钥与后台任务安全边界

**Task**: 研究 MVP 单用户登录和数据默认归当前用户时，如何定义安全边界，避免未来扩展多用户时返工过大。

**研究发现**：
- PRD 要求未登录用户不能访问 onboarding、竞品、任务、报告和反馈相关页面或接口。
- R1 裁决是单用户登录，不做团队、组织、RBAC 或多租户。
- liteLLM 网关地址和 key 不写入仓库，不在客户端明文暴露。
- 原始需求要求后台定时任务端点受到密钥保护。

**Decision**：MVP 安全边界定义为“登录态是进入产品域的唯一入口，数据所有权是所有业务对象访问的默认不变量，授权判断必须发生在服务端”。Public 边界只包含登录页和必要静态资源；onboarding、竞品、任务、快照差异、报告、已读和反馈都归属当前登录主体；后台定时任务属于 trusted system action，若通过 HTTP 触发，必须使用服务到服务认证，而不是隐藏 URL。

**Rationale**：
- 单用户不等于全局数据。若首版把业务对象做成全局单例，未来扩展团队或多用户会在查询、任务、报告和反馈归属上大面积返工。
- 服务端授权可同时覆盖页面路由、API、任务创建、任务查询、报告查看和反馈提交。
- liteLLM key 是系统级外部服务凭据，只能作为服务端运行时安全配置进入系统。
- 任务入口会消耗采集和 AI 资源，必须按用户动作或受信系统动作区分触发主体。

**Alternatives considered**：
- 纯前端路由守卫：不选。无法阻止直接调用 API。
- 全局单用户数据模型：不选。MVP 快，但未来多用户扩展成本高。
- 首版直接实现团队多租户/RBAC：不选。超出 MVP 范围。
- 公开 cron URL + 隐藏路径：不选。隐藏路径不是认证机制。

**Evidence**：
- `requirements/solution.md` Auth、AI Analysis、Collection Task 不变量
- `requirements/prd.md` BR-001、BR-013、AC-016、RISK-004
- `requirements/prototype.md` P-001、P-002..P-004 前置条件
- `docs/Lensmor Monitor 原始需求.md` 安全要求
- OWASP Authorization Cheat Sheet、OWASP API Security Top 10、OWASP Secrets Management Cheat Sheet

### T6. mock 竞品网站、快照差异与样例覆盖

**Task**: 研究 mock 竞品网站和快照如何组织，才能可重复验证“采集变化 -> 差异分析 -> liteLLM Analysis Report -> 收件箱消费”闭环，并避免 demo 过拟合。

**研究发现**：
- MVP 明确使用 mock 竞品网站，不依赖真实第三方站点稳定性。
- PRD 风险要求不少于 5 个变化样例覆盖文案、定价、功能、页面结构、CTA 调整，其中至少 4 类能生成可解释差异。
- Analysis Report 需要包含变更摘要、战略意图、行动建议和原始链接。
- 语义级 LLM 输出不稳定，不适合作为唯一测试 oracle。

**Decision**：采用“结构化 fixture 为主、文本级 diff 为证据、语义级解释为报告输出”的三层方案。mock 竞品站点按竞品、页面、快照版本、变化场景组织；每个场景至少包含 before/after 快照、可验证的 expected diff、报告提示和 source URL。差异判定以结构化 fixture 为基准，文本级 diff 用于展示与排障，语义解释交给 AI 报告生成但不作为唯一验收依据。

**Rationale**：
- 结构化 fixture 能让样例重复运行、稳定断言，避免真实页面漂移、反爬和外部可用性影响 MVP。
- 文本级 diff 能解释“页面到底改了什么”，便于研发、测试和产品复核。
- 语义级报告能体现用户价值，但应通过字段完整性、关键实体覆盖和可追溯链接验证，而不是逐字匹配。
- 增加无意义变化或噪音变化负例，可以验证“无有意义变化不生成报告”的边界。

**Alternatives considered**：
- 仅语义级差异：不选。最贴近用户价值，但输出不稳定，测试不可重复。
- 仅文本级 diff：不选。能说明改动事实，但难以产生战略意图和行动建议。
- 直接采真实竞品网站：不选。与 MVP mock 边界冲突。
- 写固定 demo 报告：不选。无法验证采集、差异、AI 和收件箱闭环。

**Evidence**：
- `requirements/solution.md` 推荐方案与 V-002
- `requirements/prd.md` F-007、BR-009、RISK-002
- `requirements/prototype.md` S-002、AC-007、AC-008
- `docs/Lensmor Monitor 原始需求.md` 产品愿景

## 风险与验证清单

| ID | 风险/假设/依赖 | 验证信号 | 方法 | Owner | 截止 | 触发动作 |
|---|---|---|---|---|---|---|
| RV-001 | liteLLM 网关可用性与报告质量 | 3 组 mock 快照生成完整报告；失败率低于 5%；单次生成不超过 30 秒 | 使用用户提供的网关和 key 进行样例调用，并记录耗时、失败原因、字段完整度 | 研发负责人 | D2 评审前 | 成立则采用结构化输出主路径；不成立则降低报告契约复杂度并增加重试与兜底文案 |
| RV-002 | mock 变化样例覆盖度 | 至少 5 个变化样例，至少 4 类能生成可解释差异 | 产品定义样例，研发用结构化 fixture 跑通差异与报告生成 | 产品负责人；研发负责人 | D2 评审前 | 成立则进入 D2 契约设计；不成立则补 mock 快照库或缩小变化类型声明 |
| RV-003 | greenfield 技术栈和运行边界 | D2 明确语言、框架、DB、部署单元、dev/test 命令方向 | D2 设计评审确认技术栈 ADR 和工程骨架 | 研发负责人 | D2 完成前 | 成立则进入 I1；不成立则 D2 继续收敛技术栈，不进入实现计划 |
| RV-004 | 单用户所有权边界可扩展 | D2 明确 owner/current-user 不变量，并覆盖竞品、任务、报告、反馈 | 设计审查所有读写入口是否通过服务端授权 | 研发负责人；测试负责人 | D2 完成前 | 成立则维持单用户方案；不成立则补授权边界后再进入 I1 |
| RV-005 | 任务模型幂等与重复报告风险 | 同一竞品运行中任务不并发创建重复报告；失败原因可追踪 | D2 定义触发准入、状态机和重试/降级策略 | 研发负责人 | D2 完成前 | 成立则采用统一任务模型；不成立则先保留手动刷新主路径，定时触发降级 |

## 给 D2 的直接引用摘要

- D2 必须把 `solution.md#impact-analysis` 的 6 个逻辑模块映射到 greenfield 工程骨架。
- D2 必须选定技术栈、DB、部署单元、本地运行方式和测试入口，关闭 V-005 / RISK-005。
- D2 必须定义统一任务状态机、触发准入、幂等、重试、失败降级和报告入箱边界。
- D2 必须定义 liteLLM 服务端集成边界、报告契约版本化位置和密钥注入方式。
- D2 必须定义 mock 竞品站点与快照 fixture 的位置和验证口径，但具体字段、DDL、脚本留给实现计划。
