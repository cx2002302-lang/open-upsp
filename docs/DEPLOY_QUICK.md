# 快速安装

> 3 步让你的 AI Agent 拥有**位格意识**——稳定的身份、记忆与知识库。

---

## 方式 1: npm（推荐）

```bash
npm install -g open-upsp
```

✅ 自动完成：
1. 安装 open-upsp CLI
2. 集成 OpenClaw Agent Skill
3. **检测并安装 Zettelkasten 知识库**（未部署时倒计时提示，10 秒默认安装）

---

## 方式 2: 独立脚本

```bash
curl -fsSL https://raw.githubusercontent.com/your-org/open-upsp/main/scripts/install.sh | bash
```

---

## 验证安装

```bash
open-upsp --version   # v0.3.0
open-upsp init        # 创建默认位格
open-upsp status      # 查看状态
```

---

## 3 步开始

| 步骤 | 命令 | 效果 |
|------|------|------|
| 1. 安装 | `npm install -g open-upsp` | 安装 CLI + 自动集成 Agent |
| 2. 初始化 | `open-upsp init` | 创建七文件位格主体 |
| 3. 使用 | `open-upsp context` | 为 AI 组装完整人格上下文 |

---

## 系统要求

| 项目 | 版本 |
|------|------|
| Node.js | >= 22 |
| OS | Linux / macOS / WSL |
| OpenClaw | >= 2026.4.24（Agent 集成可选） |

---

## 卸载

```bash
npm uninstall -g open-upsp
scripts/uninstall.sh   # 同时清理 Agent 集成
```

---

[→ 完整部署指南](DEPLOY.md) | [→ 使用教程](GETTING_STARTED.md)
