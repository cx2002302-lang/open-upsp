# 更新日志

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

*版本: 0.1.0 | 日期: 2026-05-12 | 状态: Phase 1 完成，准备 Phase 2*
