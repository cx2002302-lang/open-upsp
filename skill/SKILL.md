# open-upsp Skill

**ID**: `open-upsp`  
**Version**: 0.1.0  
**OpenClaw**: >= 2026.4.24  
**License**: MIT

---

## 简介

为 OpenClaw Agent 注入**位格（Persona）意识**。这个 skill 让 AI 代理拥有稳定的身份、记忆和知识库，实现跨对话的身份连续性。

**核心能力**：
- 🎭 每次对话前加载位格上下文（身份 + 状态 + 记忆 + 知识）
- 📝 自动识别并保存对话中的有价值信息
- 🔄 会话结束时自动更新位格状态并同步到知识库
- 🧠 基于 Zettelkasten 知识库扩展长期记忆

---

## 安装

```bash
# 1. 确保 open-upsp CLI 已安装（Phase 1 已完成）
npm install -g open-upsp

# 2. 创建默认位格
open-upsp init

# 3. 复制 skill 到 OpenClaw skills 目录
cp -r skill ~/.openclaw/skills/open-upsp

# 4. 在 openclaw.json 中激活 skill
openclaw config set agents.defaults.skills '["open-upsp", "zettelkasten-brain"]'

# 5. 确保 tools.alsoAllow 包含 open-upsp
openclaw config set tools.alsoAllow '["zettelkasten", "open-upsp"]'
```

---

## 使用方式

安装后，Agent 会自动：

1. **对话开始时** — 加载位格上下文并注入 system prompt
2. **对话中** — 以位格定义的身份和风格回应
3. **对话结束时** — 自动执行 `session-end` 流程

---

## 文件结构

```
skill/
├── SKILL.md     # 本文件（技能入口）
├── PROMPT.md    # 动态系统提示词
└── RULES.md     # 行为规则
```

---

## 依赖

- `open-upsp` CLI 工具（Phase 1 已开发）
- `zettelkasten` 插件（已部署）

---

## 故障排除

### Skill 不生效

```bash
# 检查 skill 路径
openclaw config get agents.defaults.skills

# 检查 open-upsp CLI
open-upsp --version

# 检查位格是否存在
open-upsp status
```

### 上下文未注入

确保 `open-upsp context` 命令能正常输出：
```bash
open-upsp context --query "测试"
```

---

*版本: 0.1.0 | Phase 2 技能层*
