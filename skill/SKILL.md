---
name: open-upsp
description: Zettelkasten knowledge graph with progressive persona evolution for OpenClaw Agent
version: "0.3.3"
---

# open-upsp Persona Skill

为 OpenClaw Agent 注入**位格（Persona）意识**——稳定的身份、记忆与知识库，实现跨对话的身份连续性。

## 核心能力

- 🎭 **位格上下文注入** — 每次对话前加载身份、状态、记忆和知识
- 📝 **智能信息记录** — 自动识别并保存对话中的有价值信息（权重 1-5）
- 🔄 **会话结束同步** — 自动执行 distill → update → sync 流程
- 🧠 **ZK 知识扩展** — 基于 Zettelkasten 知识库的持久化长期记忆
- 🔒 **身份保护** — 拒绝一次性身份覆盖，维护位格一致性

## 渐进解锁

当位格达到 **Round ≥ 10** 且 **workhoodIndex ≥ 0.3** 时，进化模块自动解锁，注入更深层的行为规则和知识关联。

## 依赖

- OpenClaw ≥ 2026.4.24
- Zettelkasten Plugin ≥ 1.0.0-beta.7

---

*版本: 0.3.2 | 双 Skill 架构 | 核心不可变 + 进化可编辑*
