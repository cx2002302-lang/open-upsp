# 更新日志

## v0.3.0 — Phase 3 完成（2026-05-12）

### 🎯 本次交付

Phase 3（多态位格 + 关系融合）全部完成。open-upsp 现在支持多个人格模板、关系矩阵自动演化、关系感知检索和链接权重映射。

### ✨ 新增功能

- **多态位格模板** — 内置 5 套模板：`default`、`professional`、`emotional`、`creative`、`companion`
  - `open-upsp init -t <template>` 从指定模板初始化
- **关系矩阵自动演化** — `session-end` 命令自动检测文本中的实体提及频率，更新共振度
- **关系感知检索** — `ContextBuilder` 根据关系矩阵的共振度提升相关笔记的搜索排名
- **链接权重映射** — `CliBridge.createNote` 支持 `resonance` 和 `relationType` 参数，嵌入 UPSP-META 注释
- **配置管理 CLI** — `open-upsp config get <key>` / `open-upsp config set <key> --value <val>`
- **变速轮周期** — StateUpdater 根据轮数自动推断 speedWheel 档位（256 轮周期）

### 🏗️ 架构改进

- `SessionDistiller` 新增 `relationDelta` 提取（Map<entity, resonanceDelta>）
- `StateUpdater` 新增 `inferSpeedWheel` 和 `calculateWorkhoodIndex`
- `SQLiteBridge.searchNotes` 支持 `resonanceMap` 参数，实现共振度加权排序
- `ZettelNote` 新增 `upsMeta` 字段，解析笔记内容中的 UPSP-META 注释

### 📊 质量指标

- TypeScript 编译：0 错误
- 测试通过率：18/18（100%，新增 11 个测试）
- 代码规范：biome 检查通过
- 解耦合规：零侵入 ZK

### ⚠️ 已知限制

- 关系矩阵自动演化仅基于提及频率，未使用语义分析
- 多态模板切换需手动执行（暂不支持自动场景检测）
- 链接权重映射仅嵌入笔记内容，未映射到 ZK 链接系统

---

## v0.2.0 — Phase 2 完成（2026-05-12）

### 🎯 本次交付

Phase 2（双向写入 + Skill）全部完成。open-upsp 现在能将会话摘要自动流入 Zettelkasten，并作为 OpenClaw Skill 注入位格上下文。

### ✨ 新增功能

- **会话蒸馏** (`open-upsp distill`) — 基于规则的轻量蒸馏，权重 1-5 分级
- **自动状态更新** (`open-upsp state update`) — 动态六轴 ±5/轮自动调整，变速轮周期 256 轮
- **STM → ZK 同步** (`open-upsp sync`) — 权重 ≥3 的 STM 条目同步为 FLEETING 笔记
- **会话收尾** (`open-upsp session-end`) — distill + state update + sync 一键完成
- **OpenClaw Skill** — SKILL.md / PROMPT.md / RULES.md，支持位格上下文注入

### 🏗️ 架构实现

- **CliBridge** — 通过 `openclaw zk new` CLI 子进程写入 ZK
- **SessionDistiller** — 关键词模式匹配提取记忆条目和状态变化信号
- **StateUpdater** — 动态六轴自动调整，边界保护
- **PersonaSync** — STM 筛选 + CliBridge 写入 + 去重

### 📊 质量指标

- TypeScript 编译：0 错误
- 测试通过率：7/7（100%）
- 代码规范：biome 检查通过
- ZK 写入验证：笔记成功创建并可在数据库中查询

---

## v0.1.0 — Phase 1 完成（2026-05-12）

### 🎯 本次交付

Phase 1（只读桥接 + 位格骨架）全部完成。open-upsp 现在是一个可用的 CLI 工具，能够管理 UPSP 位格并只读查询 Zettelkasten 知识库。

### ✨ 新增功能

- **位格初始化** (`open-upsp init`) — 从模板创建七文件位格
- **状态查看** (`open-upsp status`) — 查看位格当前状态（轮数、工化指数、动态六轴）
- **知识搜索** (`open-upsp search`) — 全文搜索 Zettelkasten 笔记（支持 FTS5 / LIKE 降级）
- **上下文构建** (`open-upsp context`) — 将身份 + 状态 + 记忆 + 知识组装为 AI 可用的 prompt
- **状态更新** (`open-upsp state update`) — 手动调整轮数和动态六轴

### 🏗️ 架构实现

- **七文件 Schema** — 统一 camelCase，Zod 运行时校验，gray-matter YAML frontmatter 解析
- **PersonaLoader/Saver** — 位格的加载、校验、保存全套能力
- **SQLiteBridge** — 只读桥接 ZK 数据库，含 Schema 版本检测和错误重试
- **ContextBuilder** — 多维度上下文组装（静态/动态/记忆/知识）
- **CLI 骨架** — commander 框架，6 个子命令

### 📊 质量指标

- TypeScript 编译：0 错误
- 测试通过率：7/7（100%）
- 代码规范：biome 检查通过
- 解耦合规：零侵入 ZK

### ⚠️ 已知限制

- 仅支持手动状态更新（自动更新需 Phase 2）
- 情绪感知仅存储/传递，不识别（需外部 LLM）
- 自主成长仅在动态六轴层面（核心身份用户控制）

### 🔒 解耦承诺

- ❌ 不修改 ZK 核心代码
- ❌ 不引入 ZK 为 npm 依赖
- ❌ 不修改 ZK 数据库 Schema
- ✅ 仅通过 SQLite 只读查询和 CLI 子进程通信

---

*版本: 0.3.0 | 日期: 2026-05-12 | 状态: Phase 3 完成*
