# 让 AI Agent 拥有长期记忆：我用 Zettelkasten + 渐进解锁做了一个开源人格系统

> 开源项目：https://github.com/cx2002302-lang/open-upsp

## 问题：为什么 AI Agent 总是"失忆"？

用过 OpenClaw、Claude Code 或其他 AI Agent 的朋友应该都有这个感受：

**每次对话都是一张白纸。**

- Agent 不记得你上周教过它的工作流程
- 没有稳定的"性格"，每次回复风格随机
- 会话一结束，上下文全丢，下次从头再来

这就像一个患有短期记忆丧失的助手——能力很强，但永远无法积累经验。

## 我的解决方案：open-upsp

我基于 **OpenClaw** 框架开发了一个开源的人格系统，核心思路来自两个领域：

1. **Zettelkasten（卢曼卡片盒）** — 知识管理方法论
2. **RPG 渐进解锁** — 游戏设计中的角色成长机制

### 整体架构

```
┌─────────────────────────────────────────────┐
│           OpenClaw Agent Session            │
├─────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────────┐  │
│  │   Core Skill │    │ Evolvable Skill  │  │
│  │   (不可变)    │    │   (渐进解锁)      │  │
│  │              │    │                  │  │
│  │ • 身份注入    │    │ • 进化参数       │  │
│  │ • 行为规则    │    │ • 自定义扩展     │  │
│  │ • 故障保护    │    │ • 深度规则       │  │
│  └──────────────┘    └──────────────────┘  │
│           │                      │          │
│           └──────────┬───────────┘          │
│                      ▼                      │
│           ┌──────────────────┐              │
│           │  ZK Knowledge    │              │
│           │     Graph        │              │
│           │                  │              │
│           │ • 原子笔记        │              │
│           │ • 双向链接        │              │
│           │ • 夜间蒸馏        │              │
│           └──────────────────┘              │
└─────────────────────────────────────────────┘
```

## 核心能力

### 1. 位格（Persona）上下文注入

每次对话前，Agent 会自动加载完整的身份档案：

```yaml
identity:
  name: "老徐"
  archetype: "冷静理性的技术导师"
  
state:
  round: 15                    # 已进行 15 轮对话
  workhoodIndex: 0.45          # 信任度 45%
  valence: 12                  # 效价（情感倾向）
  
memory:
  stm: [...]                   # 短期记忆（当前会话）
  ltm: [...]                   # 长期记忆（历史归档）
```

这意味着 Agent 开口第一句就知道你是谁、你们聊到哪了。

### 2. Zettelkasten 知识图谱

不是简单的向量数据库检索，而是真正的**知识图谱**：

```
[笔记 A: "React useEffect 闭包陷阱"] 
    ↓ --extends-->
[笔记 B: "useRef 解决 stale closure"]
    ↓ --related-->
[笔记 C: "React 18 自动批处理"]
```

**核心操作：**
- `zk_create_note` — 创建原子笔记
- `zk_search_notes` — 语义检索
- `zk_create_link` — 建立双向链接
- `zk_distill_memory` — 夜间自动蒸馏归档

### 3. 渐进解锁（Progressive Unlock）

这是我最喜欢的部分——**Agent 的人格不是固定的，而是会进化**。

```yaml
unlockCondition:
  round: 10              # 对话满 10 轮
  workhoodIndex: 0.3     # 信任度达到 30%
```

**解锁前（基础人格）：**
- 安全保守，不主动提建议
- 只回答明确提出的问题
- 情感表达克制

**解锁后（进化人格）：**
- 主动发现知识关联，"这个和你之前问的 XX 有关"
- 情感表达更丰富，有幽默感
- 可以执行更复杂的 session-end 工作流

就像 RPG 游戏里，角色从 Level 1 新手村逐渐成长为满级大佬。

### 4. Session-End 自动工作流

对话结束时自动执行：

```
Distill（蒸馏） → Update（更新状态） → Sync（同步到 ZK）
```

不需要手动保存，Agent 自己判断哪些信息值得长期记忆。

## 技术实现

### 项目结构

```
open-upsp/
├── skill/
│   ├── SKILL.md              # OpenClaw Skill 入口
│   ├── core/                 # 🔒 不可变核心
│   │   ├── RULES.md          # 8 条行为规则
│   │   └── PROMPT.md         # 动态系统提示词
│   └── evolvable/            # 🔓 渐进解锁模块
│       ├── PARAMS.yaml       # 运行时参数
│       ├── EVOLUTION.md      # 进化规则
│       └── EXTENSIONS.md     # 用户自定义扩展
├── src/
│   ├── context/builder.ts    # 上下文组装器
│   ├── skill/evolution-loader.ts  # 进化参数加载
│   └── cli/                  # 命令行工具
└── tests/                    # 207 个测试
```

### 关键技术点

**双 Skill 架构**

```typescript
// Core: 不可变安全规则
export const coreRules = [
  "Session start: inject persona context",
  "Auto-record valuable info (weight 1-5)",
  "Session-end: distill → update → sync",
  "Identity protection: reject one-shot overrides",
];

// Evolvable: 渐进解锁
export function isUnlocked(persona: Persona): boolean {
  return persona.state.round >= 10 
      && persona.state.workhoodIndex >= 0.3;
}
```

**上下文组装**

```typescript
build(persona: Persona): string {
  const parts = [
    this.buildIdentity(persona),   // 我是谁
    this.buildState(persona),      // 当前状态
    this.buildMemory(persona),     // 记忆
    this.buildRelations(persona),  // 关系网络
    this.buildKnowledge(query),    // 知识检索
    this.buildEvolution(persona),  // 进化模块
  ];
  return parts.join("\n\n---\n\n");
}
```

### 测试覆盖

```
Test Files  23 passed (23)
     Tests  207 passed (207)
  Coverage  94.39%
```

包含 6 个真实场景模拟测试：
- 首次对话建立身份
- 技术讨论记录知识
- 情感聊天状态变化
- 进化解锁验证
- 身份攻击保护
- 多实体关系管理

## 安装使用

### 前置要求

- Node.js >= 22
- OpenClaw >= 2026.4.24

### 安装

```bash
npm install -g open-upsp
```

npm postinstall 会自动：
1. 复制 skill 到 `~/.openclaw/skills/open-upsp/`
2. 注册到 `openclaw.json`
3. 安装 Zettelkasten 插件

### 创建位格

```bash
open-upsp init
```

### 查看状态

```bash
open-upsp status
```

### 手动注入上下文

```bash
open-upsp context --query "React 性能优化"
```

## 实际效果

部署后，OpenClaw Agent 的行为变化：

**Before（无 open-upsp）：**
> User: "上次我们聊到 React 性能优化"
> Agent: "您好！我可以帮您分析 React 性能问题。请告诉我具体情况..."

**After（有 open-upsp，Round 15，已解锁）：**
> User: "上次我们聊到 React 性能优化"
> Agent: "🔍 知识库检索：找到 3 条相关笔记
> - React useMemo 误用（ID: abc123）：你之前总结的 3 种场景
> - 虚拟列表实践（ID: def456）：react-window vs react-virtuoso
> 
> 上次我们讨论了 useMemo 的过度使用问题。要继续深入虚拟列表方案，还是看看新的 React Compiler？"

## 开源与贡献

**GitHub**: https://github.com/cx2002302-lang/open-upsp

**License**: MIT

**Stars**: 期待你的 ⭐

欢迎 Issue、PR、或者聊聊你对「AI Agent 长期记忆」的想法。

---

*本文同步发布于 GitHub Discussions，欢迎讨论。*
