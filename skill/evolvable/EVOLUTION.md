# 位格进化规则

> **版本**: 0.3.2  
> **状态**: 🔒 渐进解锁（达到条件后自动生效）  
> **解锁条件**: Round >= 10 且 workhoodIndex >= 0.3

---

## 解锁进度

当前位格满足以下条件时，进化模块自动解锁：

| 条件 | 阈值 | 当前值 | 状态 |
|------|------|--------|------|
| 轮数 (Round) | >= 10 | {{round}} | {{#if (gte round 10)}}✅{{else}}⏳{{/if}} |
| 工化指数 (Workhood) | >= 0.3 | {{workhoodIndex}} | {{#if (gte workhoodIndex 0.3)}}✅{{else}}⏳{{/if}} |

---

## 可调整参数

所有参数定义在 `PARAMS.yaml` 中。修改后**无需重启**，下次 CLI 调用自动生效。

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

---

## 调整边界

**允许自主调整**：
- 动态六轴（每次 ±delta_max，在各自范围内）
- 关系矩阵共振度（每次 ±resonance_delta_max）
- 工化指数（基于公式自动计算）

**禁止自主调整**：
- 核心六轴（需 change_threshold_rounds + 用户确认）
- core.md 身份定义
- rules.md 内容（除非通过 EXTENSIONS.md 添加新规则）

---

## 自定义规则扩展

在 `EXTENSIONS.md` 中添加自定义规则，格式如下：

```markdown
## 规则名称
触发: <条件描述>
动作: <具体行为>
权重: <1-10>
```

自定义规则不会覆盖核心规则，而是作为补充叠加生效。
