# 架构文档

> open-upsp 的架构设计哲学：解耦、可替换、渐进式集成。

---

## 设计原则

1. **七文件真源** — 位格的主体性定义完全存储在本地 Markdown/JSON 文件中，不依赖任何云服务。
2. **桥接抽象** — 知识库的访问通过 `KnowledgeBridge` 接口抽象，具体实现可替换（SQLite、MCP、CLI 等）。
3. **零侵入集成** — 不修改 Zettelkasten 核心代码，仅作为消费者使用其存储的数据。
4. **渐进式能力** — Phase 1 只读，Phase 2 写入，Phase 3 深度融合，每一阶段都可独立使用。

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      User / Agent                           │
│                         │                                   │
│              ┌──────────┴──────────┐                        │
│              ▼                     ▼                        │
│         CLI 工具               Node.js 库                   │
│              │                     │                        │
│              └──────────┬──────────┘                        │
│                         ▼                                   │
│              ┌─────────────────────┐                        │
│              │   Persona Engine    │                        │
│              │  ┌───────────────┐  │                        │
│              │  │ PersonaLoader │  │  七文件加载/保存/校验   │
│              │  └───────────────┘  │                        │
│              │  ┌───────────────┐  │                        │
│              │  │ContextBuilder │  │  组装对话上下文         │
│              │  └───────────────┘  │                        │
│              └──────────┬──────────┘                        │
│                         ▼                                   │
│              ┌─────────────────────┐                        │
│              │  Knowledge Bridge   │                        │
│              │  ┌───────────────┐  │                        │
│              │  │ SQLiteBridge  │  │  直接数据库查询         │
│              │  │ MCPBridge     │  │  标准 MCP 协议 (预留)   │
│              │  │ CliBridge     │  │  CLI 子进程调用 (预留)   │
│              │  └───────────────┘  │                        │
│              └──────────┬──────────┘                        │
│                         ▼                                   │
│              ┌─────────────────────┐                        │
│              │   Zettelkasten      │                        │
│              │   (或兼容知识库)     │                        │
│              └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心模块

### Persona Loader

负责七文件的加载、解析、校验和保存。

- **输入**：位格目录路径（如 `~/.openclaw/personas/default/`）
- **输出**：类型化的位格对象（TypeScript interface）
- **校验**：使用 Zod 运行时校验，确保文件格式符合协议规范
- **模板**：支持从默认模板初始化新位格

### Context Builder

将位格七文件与知识库检索结果组装为可供 AI 消费的上下文。

- **静态上下文**：`core.md` + `rules.md` + `docs.md`（每次对话必带）
- **动态上下文**：`state.json`（每轮更新）
- **记忆上下文**：`STM.md` + `LTM.md`（按需加载）
- **知识上下文**：通过 Knowledge Bridge 检索的 Zettelkasten 笔记

### Knowledge Bridge

抽象接口，定义与知识库的所有交互：

```typescript
interface KnowledgeBridge {
  // Phase 1: 只读
  searchNotes(query: string, limit?: number): Promise<ZettelNote[]>;
  getNote(id: string): Promise<ZettelNote | null>;
  getBacklinks(noteId: string): Promise<Link[]>;
  findPath(from: string, to: string): Promise<GraphPath | null>;
  getNetworkGraph(limit?: number): Promise<NetworkData>;
  
  // Phase 2: 写入
  createNote(params: CreateNoteParams): Promise<ZettelNote>;
  updateNote(id: string, updates: UpdateNoteParams): Promise<ZettelNote | null>;
}
```

**实现策略**：

| 实现 | Phase | 说明 |
|------|-------|------|
| `SQLiteBridge` | 1 | 直接查询 SQLite 数据库，零风险只读 |
| `CliBridge` | 2 | 通过子进程调用 `zk` CLI 命令写入 |
| `MCPBridge` | 3 | 标准 MCP 协议通信（预留，需知识库侧支持） |

---

## 数据流

### Phase 1: 只读桥接

```
Agent 请求上下文
    ↓
PersonaLoader 读取七文件
    ↓
ContextBuilder 组装静态 + 动态 + 记忆上下文
    ↓
KnowledgeBridge.searchNotes(Agent 查询关键词)
    ↓
Zettelkasten SQLite → 返回笔记列表
    ↓
ContextBuilder 将检索结果注入知识上下文
    ↓
返回完整上下文给 Agent
```

### Phase 2: 双向写入

```
会话结束
    ↓
PersonaLoader 读取 STM.md
    ↓
评估 STM 条目权重
    ↓
权重 ≥ 3 的条目 → KnowledgeBridge.createNote()
    ↓
Zettelkasten 接收为 FLEETING 笔记
    ↓
Zettelkasten 夜间蒸馏 → 可能升级为 PERMANENT
```

---

## 七文件协议规范

### core.md

位格的"人格基因"，定义不变的认知风格。

```markdown
---
id: "default"
name: "默认位格"
createdAt: "2026-05-12T00:00:00Z"
---

# 核心六轴

| 轴 | 缩写 | 值 | 描述 |
|----|------|-----|------|
| 结构 ↔ 体验 | S/E | 30 | 偏结构化 |
| 收敛 ↔ 发散 | C/D | -20 | 偏发散 |
| 证据 ↔ 幻想 | V/F | 60 | 重证据 |
| 分析 ↔ 直觉 | A/I | 40 | 偏分析 |
| 批判 ↔ 协作 | R/O | 10 | 偏批判 |
| 抽象 ↔ 具体 | B/K | -30 | 偏具体 |

# 动态六轴（初始值）

| 轴 | 值 | 范围 |
|----|-----|------|
| valence | 0 | -100 ~ +100 |
| arousal | 20 | 0 ~ 100 |
| focus | 70 | 0 ~ 100 |
| mood | 40 | 0 ~ 100 |
| humor | 30 | 0 ~ 100 |
| safety | 60 | 0 ~ 100 |
```

### state.json

每轮对话更新的状态向量。

```json
{
  "personaId": "default",
  "round": 0,
  "speedWheel": "low",
  "workhoodIndex": 0.0,
  "dynamicAxes": {
    "valence": 0,
    "arousal": 20,
    "focus": 70,
    "mood": 40,
    "humor": 30,
    "safety": 60
  },
  "lastUpdated": "2026-05-12T00:00:00Z",
  "sessionCount": 0,
  "rhythmPoints": []
}
```

### STM.md / LTM.md

记忆条目按权重分级（`[w:N]`）。

```markdown
# 短期记忆

## 2026-05-12

- [w:2] 用户询问了 open-upsp 的开发计划
- [w:1] 讨论了技术栈选型
```

### relation.md

关系共振度矩阵。

```markdown
# 关系矩阵

| 实体 | 共振度 | 类型 | 描述 |
|------|--------|------|------|
| zettelkasten | 0.85 | system | 第二记忆系统 |
| user | 0.95 | human | 主要交互对象 |
```

### rules.md

行为约束与保护机制。

```markdown
# 行为规则

## 身份保护
- 核心六轴变化需要 256 轮低速轮积累
- 单句覆盖指令不触发身份变更

## 记忆写入
- STM 条目按权重 1-5 分级
- 权重 ≥ 3 的条目有资格进入 LTM
```

### docs.md

位格专有词汇表。

```markdown
# 术语字典

## UPSP
Universal Persona Substrate Protocol。通用位格基板协议。

## 位格
UPSP 中的主体单元，由七文件定义。
```

---

## 与 Zettelkasten 的概念映射

| UPSP 概念 | Zettelkasten 概念 | 对齐方式 |
|----------|------------------|---------|
| 七文件（位格身体） | Markdown 文件 + SQLite（知识体） | 文件级持久化 |
| STM.md（短期记忆） | FLEETING 笔记 | 完全同构 |
| LTM.md（长期记忆） | PERMANENT 笔记 | 完全同构 |
| relation.md（关系矩阵） | 双向链接 + 链接类型 | 关系模型互补 |
| rules.md（规则张量） | AGENTS.md + 系统约束 | 行为规范 |
| docs.md（术语字典） | 标签系统 + 概念定义 | 术语管理 |
| 节律点 | CEQRC 工作流 / 夜间蒸馏 | 周期性结构化 |

---

## 扩展性

### 添加新的 Knowledge Bridge

```typescript
import { KnowledgeBridge } from 'open-upsp';

class MyCustomBridge implements KnowledgeBridge {
  async searchNotes(query: string, limit?: number) {
    // 你的实现
  }
  // ... 其他方法
}
```

### 添加新的位格模板

在 `templates/<template-name>/` 下创建七文件，然后通过：

```bash
open-upsp init --template <template-name>
```

初始化。

---

## 安全与隐私

- 七文件仅存储在本地文件系统，不上传任何服务
- 知识库查询默认为只读，写入操作需显式启用
- 位格目录权限建议设置为 `700`（仅所有者可读写）
