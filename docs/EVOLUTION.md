# 双 Skill 进化机制

> open-upsp 采用**双 Skill 架构**：不可变核心 + 渐进解锁的进化模块。

---

## 设计理念

传统 Skill 是静态的——安装后行为固定，用户无法调整。open-upsp 的 Skill 是**活的**：它随位格的成长逐步解锁更深层的自定义能力。

这与 UPSP 的核心机制同构：
- **变速轮** — 低速轮积累 → 高速轮解锁
- **节律点** — 普通记忆 → 压缩为长期结构
- **双 Skill** — 核心规则 → 进化参数解锁

---

## 架构

```
skill/
├── manifest.json           # Skill 组合清单
├── core/                   # 🔒 核心 Skill（不可变）
│   ├── SKILL.md           # Skill 入口
│   ├── PROMPT.md          # 身份注入提示词
│   └── RULES.md           # 7 条核心行为规则
└── evolvable/              # 🔓 进化 Skill（渐进解锁）
    ├── EVOLUTION.md       # 进化规则文档
    ├── PARAMS.yaml        # 运行时参数（实际生效）
    └── EXTENSIONS.md      # 用户自定义规则扩展
```

---

## 核心 Skill（🔒 不可变）

**位置**：`~/.openclaw/skills/open-upsp/core/`

包含位格的身份定义、行为约束和安全保护。这些规则**不可覆盖**。

| 规则 | 权重 | 说明 |
|------|------|------|
| Rule 1 | 10 | 会话开始时加载上下文 |
| Rule 3 | 9 | 会话结束时执行收尾 |
| Rule 6 | 10 | 身份保护（防覆盖攻击） |
| Rule 7 | 8 | 自主成长边界 |

**重要**：编辑 `core/RULES.md` **不会**改变 Agent 行为。它是声明性文档，实际逻辑由 CLI 代码执行。

---

## 进化 Skill（🔓 渐进解锁）

**位置**：`~/.openclaw/skills/open-upsp/evolvable/`

### 解锁条件

| 条件 | 阈值 | 说明 |
|------|------|------|
| 轮数 (Round) | >= 10 | 经过足够对话积累 |
| 工化指数 (Workhood) | >= 0.3 | 主体性强度达标 |

**渐进提示**：

```
# 进化提示
你的位格正在成长。达到 Round 10 且工化指数 >= 0.3 后，可以解锁更多自定义参数。

| 条件 | 进度 |
|------|------|
| 轮数 (Round 10) | 30% (3/10) |
| 工化指数 (0.3) | 23% (0.07/0.3) |
```

### 解锁后

`open-upsp context` 输出会追加进化参数：

```markdown
# 进化模块（已解锁）

## 进化参数
```yaml
limits:
  state_update:
    delta_max: 5
  memory:
    max_stm_entries_per_session: 5
    sync_weight_threshold: 3
```
```

---

## 可调整参数（PARAMS.yaml）

**位置**：`~/.openclaw/skills/open-upsp/evolvable/PARAMS.yaml`

### 记忆管理

| 参数 | 默认值 | 范围 | 说明 |
|------|--------|------|------|
| `memory.max_stm_entries_per_session` | 5 | 1-20 | 每会话最大 STM 条目数 |
| `memory.sync_weight_threshold` | 3 | 1-5 | 同步到 ZK 的最小权重 |
| `memory.auto_archive` | true | bool | 自动归档到 LTM |

### 状态更新

| 参数 | 默认值 | 范围 | 说明 |
|------|--------|------|------|
| `limits.state_update.delta_max` | 5 | 1-20 | 动态六轴单次最大变化 |
| `limits.relation_update.resonance_delta_max` | 0.05 | 0.01-0.2 | 共振度单次最大变化 |

### 核心轴保护

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `limits.core_axis.change_threshold_rounds` | 256 | 核心六轴变化所需轮数 |
| `limits.core_axis.requires_user_confirm` | true | 是否需要用户确认 |

### 知识检索

| 参数 | 默认值 | 范围 | 说明 |
|------|--------|------|------|
| `search.depth` | 20 | 5-100 | ZK 搜索返回条数 |
| `search.link_threshold` | 0.6 | 0.1-0.9 | 自动建链的关联度阈值 |

**修改后立即生效**，无需重启。

---

## 自定义规则（EXTENSIONS.md）

**位置**：`~/.openclaw/skills/open-upsp/evolvable/EXTENSIONS.md`

添加你自己的规则：

```markdown
## 工作时间专注模式

**触发**: 周一至周五 9:00-18:00
**动作**: focus +10, humor -5
**权重**: 6
**说明**: 工作时间自动提升专注度
```

自定义规则**不会覆盖核心规则**，而是叠加生效。

---

## 安全边界

**允许自主调整**：
- 动态六轴（每次 ±delta_max，在各自范围内）
- 关系矩阵共振度（每次 ±resonance_delta_max）
- 工化指数（基于公式自动计算）

**禁止自主调整**：
- 核心六轴（需 256 轮 + 用户确认）
- `core.md` 身份定义
- `core/RULES.md` 内容

---

## 故障排查

### 编辑 PARAMS.yaml 后不生效

```bash
# 检查文件路径
ls ~/.openclaw/skills/open-upsp/evolvable/PARAMS.yaml

# 检查 YAML 格式
node -e "
const fs = require('fs');
const content = fs.readFileSync(process.env.HOME + '/.openclaw/skills/open-upsp/evolvable/PARAMS.yaml', 'utf8');
console.log('文件存在，大小:', content.length, '字节');
"
```

### 进化模块未解锁

```bash
# 检查当前位格状态
open-upsp status
# 查看 Round 和 WorkhoodIndex 是否达到阈值
```

---

*版本: v0.3.0 | 双 Skill 架构*
