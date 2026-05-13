# open-upsp 测试计划

> **⚠️ 内部文档 | DO NOT publish to GitHub**
>
> 版本: v0.3.0-test | 日期: 2026-05-12

---

## 1. 测试目标

- **总体行覆盖率**: 45.08% → **≥ 90%**
- **分支覆盖率**: 78.68% → **≥ 85%**
- **函数覆盖率**: 81.01% → **≥ 95%**
- **生产环境验证**: 100% CLI 命令在真实 ZK 环境通过

---

## 2. 当前覆盖率基线

| 模块 | 行覆盖 | 分支覆盖 | 函数覆盖 | 优先级 |
|------|--------|----------|----------|--------|
| `src/cli.ts` | **0%** | 100% | 100% | 🔴 P0 |
| `src/bridge/cli-bridge.ts` | **5.74%** | 100% | 0% | 🔴 P0 |
| `src/context/sync.ts` | **2.38%** | 100% | 0% | 🔴 P0 |
| `src/bridge/sqlite-bridge.ts` | 41.34% | 73.52% | 59.09% | 🟡 P1 |
| `src/config.ts` | 68% | 66.66% | 40% | 🟡 P1 |
| `src/context/builder.ts` | 79.36% | 80.95% | 100% | 🟢 P2 |
| `src/context/distiller.ts` | 80.7% | 72.5% | 100% | 🟢 P2 |
| `src/persona/loader.ts` | 90.21% | 77.08% | 100% | 🟢 P2 |
| `src/persona/saver.ts` | 97.53% | 93.33% | 100% | 🟢 P2 |
| `src/context/state-updater.ts` | 95.65% | 88.88% | 100% | 🟢 P2 |
| `src/utils/file.ts` | 93.33% | 90.9% | 100% | 🟢 P2 |

---

## 3. 测试策略

### 3.1 单元测试（Unit Tests）
- **目标**: 每个模块的纯函数、独立逻辑
- **工具**: vitest
- **覆盖**: PersonaLoader/Saver、Distiller、StateUpdater、Config、File utils

### 3.2 集成测试（Integration Tests）
- **目标**: 模块间协作、数据库交互
- **工具**: vitest + better-sqlite3
- **覆盖**: SQLiteBridge（真实 ZK 数据库）、ContextBuilder、PersonaSync
- **数据隔离**: 标记清理法（sessionKey）

### 3.3 CLI 集成测试（CLI E2E）
- **目标**: 命令行完整链路
- **工具**: `child_process.spawn`
- **覆盖**: 所有 CLI 命令（init / status / search / context / state / distill / sync / session-end / config）
- **环境**: 临时目录 + 可选真实 ZK

### 3.4 错误场景测试（Error Path Testing）
- **目标**: 异常、边界、失败恢复
- **覆盖**: Schema 版本不匹配、数据库锁定、文件缺失、网络超时、无效输入

### 3.5 性能/压力测试（Stress Testing）
- **目标**: 大数据量下的稳定性
- **覆盖**: 1000+ 笔记搜索、100+ 轮状态更新、大体积位格文件

---

## 4. 各模块测试用例设计

### 4.1 CLI (`src/cli.ts`) — 0% → 90%

| # | 测试用例 | 类型 | 说明 |
|---|----------|------|------|
| 1 | `init` 默认模板创建 | E2E | 创建 default 位格，验证七文件存在 |
| 2 | `init -t <template>` 多模板 | E2E | 逐个测试 5 个模板 |
| 3 | `init` 目标已存在 | E2E | 验证错误输出和退出码 |
| 4 | `status` 查看位格 | E2E | 验证输出包含 name / round / axes |
| 5 | `status` 位格不存在 | E2E | 验证错误输出 |
| 6 | `search` 关键词搜索 | E2E | 验证返回结果格式 |
| 7 | `context` 构建上下文 | E2E | 验证输出包含身份/状态/记忆 |
| 8 | `state update` 调整轴 | E2E | 验证 state.json 被正确修改 |
| 9 | `distill` 蒸馏文本 | E2E | 验证输出条目和权重 |
| 10 | `config get` 读取配置 | E2E | 验证嵌套 key 读取 |
| 11 | `config set` 写入配置 | E2E | 验证配置持久化 |
| 12 | `config` 无参数显示全部 | E2E | 验证 JSON 输出 |
| 13 | `session-end` 完整链路 | E2E | distill + state + sync 组合验证 |

### 4.2 CliBridge (`src/bridge/cli-bridge.ts`) — 5.74% → 90%

| # | 测试用例 | 类型 | 说明 |
|---|----------|------|------|
| 1 | 正常创建笔记 | Integration | mock exec，验证参数构建 |
| 2 | 带 resonance 创建笔记 | Integration | 验证 UPSP-META 嵌入 |
| 3 | 带 tags/confidence 创建 | Integration | 验证完整参数传递 |
| 4 | CLI 输出解析失败 | Integration | mock 错误输出，验证 CliBridgeWriteError |
| 5 | exec 抛出异常 | Integration | mock 子进程错误，验证异常包装 |
| 6 | escapeShellArg 安全转义 | Unit | 验证特殊字符处理 |

### 4.3 PersonaSync (`src/context/sync.ts`) — 2.38% → 90%

| # | 测试用例 | 类型 | 说明 |
|---|----------|------|------|
| 1 | 正常同步 STM → ZK | Integration | 权重 ≥3 条目写入 ZK |
| 2 | 低于阈值不写入 | Integration | 权重 1-2 条目被过滤 |
| 3 | 自定义阈值 | Integration | options.threshold 生效 |
| 4 | 去重：同一轮不重复 | Integration | 相同内容只写一次 |
| 5 | 同步后清空 STM | Integration | options.clearStm = true |
| 6 | 空 STM 无操作 | Integration | 无条目时跳过 |
| 7 | CliBridge 写入失败 | Integration | mock 失败，验证错误处理 |

### 4.4 SQLiteBridge (`src/bridge/sqlite-bridge.ts`) — 41.34% → 90%

| # | 测试用例 | 类型 | 说明 |
|---|----------|------|------|
| 1 | searchNotes FTS5 搜索 | Integration | 真实 ZK 数据库查询 |
| 2 | searchNotes LIKE 降级 | Integration | FTS5 不可用时回退 |
| 3 | searchNotes 带 resonanceMap | Integration | 验证加权排序 |
| 4 | getNote 获取单条 | Integration | 验证字段完整 |
| 5 | getNote 不存在 | Integration | 返回 null |
| 6 | getBacklinks | Integration | 验证反向链接 |
| 7 | findPath BFS 最短路径 | Integration | 验证路径查找 |
| 8 | findPath 无路径 | Integration | 返回 null |
| 9 | getNetworkGraph | Integration | 验证图数据结构 |
| 10 | extractUpsMeta 解析元数据 | Unit | 验证 HTML 注释解析 |
| 11 | extractUpsMeta 无元数据 | Unit | 返回 undefined |
| 12 | extractUpsMeta 无效 JSON | Unit | 返回 undefined |

### 4.5 Config (`src/config.ts`) — 68% → 95%

| # | 测试用例 | 类型 | 说明 |
|---|----------|------|------|
| 1 | 读取默认配置 | Unit | 无配置文件时返回默认值 |
| 2 | 读取现有配置 | Unit | 从临时文件读取 |
| 3 | 保存配置 | Unit | 写入后读取验证 |
| 4 | resolvePath 解析 | Unit | `~` 展开为 home |
| 5 | 无效 JSON 配置 | Unit | 验证错误处理 |
| 6 | getPersonasDir | Unit | 验证路径拼接 |

### 4.6 PersonaLoader (`src/persona/loader.ts`) — 90.21% → 95%

| # | 测试用例 | 类型 | 说明 |
|---|----------|------|------|
| 1 | 完整加载七文件 | Unit | 已有 |
| 2 | 解析 memory entries | Unit | 已有 |
| 3 | 缺失 persona 抛错 | Unit | 已有 |
| 4 | frontmatter 解析失败 | Unit | 验证错误信息 |
| 5 | Zod 校验失败 | Unit | 验证字段路径 |
| 6 | 缺失单个文件 | Unit | 部分缺失的处理 |
| 7 | 空内容文件 | Unit | 空 frontmatter 的处理 |

### 4.7 PersonaSaver (`src/persona/saver.ts`) — 97.53% → 98%

| # | 测试用例 | 类型 | 说明 |
|---|----------|------|------|
| 1 | 保存完整位格 | Unit | 已有 |
| 2 | 保存后加载一致性 | Unit | 已有 |
| 3 | 目录自动创建 | Unit | 已有 |

### 4.8 ContextBuilder (`src/context/builder.ts`) — 79.36% → 95%

| # | 测试用例 | 类型 | 说明 |
|---|----------|------|------|
| 1 | 构建完整上下文 | Unit | 已有 |
| 2 | resonanceMap 传递到 search | Unit | 已有 |
| 3 | skip memory/links | Unit | 已有 |
| 4 | 空记忆/空关系展示 | Unit | 验证空状态文案 |
| 5 | rhythmPoints 展示 | Unit | 有节律点时的输出 |
| 6 | 知识检索失败降级 | Unit | bridge 抛错时返回提示 |

### 4.9 SessionDistiller (`src/context/distiller.ts`) — 80.7% → 95%

| # | 测试用例 | 类型 | 说明 |
|---|----------|------|------|
| 1 | 权重 5 提取 | Unit | 已有 |
| 2 | 权重 4 提取 | Unit | 已有 |
| 3 | 权重 3 提取 | Unit | 已有 |
| 4 | 权重 2 提取 | Unit | 已有 |
| 5 | 无匹配返回空 | Unit | 已有 |
| 6 | 多行混合 | Unit | 不同权重混合场景 |
| 7 | 状态信号：正负效价 | Unit | 已有 |
| 8 | 状态信号：激活/平静 | Unit | 已有 |
| 9 | 状态信号：专注/跳脱 | Unit | 已有 |
| 10 | relationDelta 多实体 | Unit | 已有 |

### 4.10 StateUpdater (`src/context/state-updater.ts`) — 95.65% → 98%

| # | 测试用例 | 类型 | 说明 |
|---|----------|------|------|
| 1 | clamp ±5 | Unit | 已有 |
| 2 | 边界 0/100 | Unit | 负值 clamp 到 0 |
| 3 | 变速轮周期 | Unit | 已有 |
| 4 | workhoodIndex 计算 | Unit | 已有 |
| 5 | 无变化返回 | Unit | delta 为空时 |

---

## 5. 数据隔离方案

### 5.1 单元测试
- 使用临时目录（`os.tmpdir()` + `mkdtempSync`）
- 测试后 `rmSync` 清理

### 5.2 集成测试（ZK 数据库）
- **标记清理法**: 写入时使用 `sessionKey = "open-upsp-test-" + Date.now()`
- **测试后清理**: `afterAll` 中删除 `session_key = TEST_SESSION_KEY` 的笔记
- **禁止**: 不修改已有 PERMANENT 笔记，不 ALTER/DROP 表

### 5.3 CLI E2E 测试
- 使用临时目录作为 `--dir` 参数
- 位格数据全部在临时目录中，测试后删除
- ZK 相关命令使用标记清理法

---

## 6. 执行计划

| 阶段 | 内容 | 预计时间 | 目标覆盖率 |
|------|------|----------|------------|
| 1 | Config + File utils + Loader/Saver 补充 | 30min | +5% |
| 2 | SQLiteBridge 补充（搜索/路径/图） | 45min | +15% |
| 3 | CliBridge + Sync 测试 | 45min | +15% |
| 4 | CLI E2E 测试 | 60min | +20% |
| 5 | 错误场景 + 边界条件 | 30min | +5% |
| 6 | 性能/压力测试 | 20min | — |
| 7 | 整体回归 + 覆盖率验证 | 15min | **≥ 90%** |

---

## 7. 验收标准

- [x] 所有测试通过（0 失败）
- [x] 行覆盖率 ≥ 90%（实际: 94.39%）
- [x] 分支覆盖率 ≥ 85%（实际: 88.47%）
- [x] 函数覆盖率 ≥ 95%（实际: 97.7%）
- [x] biome lint 0 错误 0 警告
- [x] TypeScript 编译 0 错误
- [x] 真实 ZK 环境 CLI 命令全部可用

---

*版本: 1.0.0 | 最后更新: 2026-05-12*
