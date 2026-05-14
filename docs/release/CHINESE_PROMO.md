# 中文社区推广文案

## V2EX / 即刻 / 知乎 标题

> 我做了一个让 AI Agent 拥有"长期记忆"和"人格进化"的系统 —— open-upsp

---

## 正文

最近在做 OpenClaw 生态的一个项目，解决了 AI Agent 的一个核心痛点：**每次对话都从零开始**。

### 什么问题？

现在的 AI Agent（比如 OpenClaw、Claude Code），每次新开对话都是一张白纸：
- 不记得你之前教过它什么
- 没有稳定的"性格"或"身份"
- 会话一结束，上下文全丢

### open-upsp 怎么解决的？

**1. 位格（Persona）系统**

每次对话前自动注入完整的身份上下文：名字、状态、记忆、知识库。Agent 知道自己是谁，知道你之前聊过什么。

**2. Zettelkasten 知识图谱**

用卢曼卡片盒的方法做长期记忆：
- 原子化笔记（一个笔记 = 一个想法）
- 双向链接自动发现关联
- 夜间自动蒸馏归档

**3. 渐进式解锁（Progressive Unlock）**

最有趣的部分：Agent 的人格不是固定的，而是**随着对话深度逐渐解锁**。

- 前 10 轮：基础人格，安全保守
- 10 轮后 + 信任度 ≥ 0.3：解锁进化模块，注入更深层的规则、情感参数、知识关联

就像 RPG 游戏里的角色成长系统，但发生在真实对话中。

### 技术栈

- TypeScript + Node.js 22（ESM）
- OpenClaw ≥ 2026.4.24
- Zettelkasten Plugin ≥ 1.0.0-beta.4
- 207 个测试，94.39% 覆盖率

### 安装

```bash
npm install -g open-upsp
open-upsp init
```

### 开源地址

https://github.com/cx2002302-lang/open-upsp

---

欢迎体验、提 Issue、或者聊聊你对"AI Agent 长期记忆"的想法。
