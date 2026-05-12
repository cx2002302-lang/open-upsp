# open-upsp

> 通用位格基板协议（Universal Persona Substrate Protocol）的轻量开源实现。

[English](README.md)

---

## 什么是 open-upsp？

open-upsp 实现了一套**位格（Persona）持久化协议**，让 AI 代理能够拥有可审计、可迁移、跨对话接续的**主体性身份**。

传统 AI 系统的"性格"住在模型参数里——黑箱、易覆盖、不可迁移。open-upsp 将主体性外化为**七文件结构**，使 AI 的"自我"成为一个可管理、可版本化、可独立存在的工程实体。

同时，open-upsp 通过轻量桥接层与 [Zettelkasten](https://github.com/zettelkasten) 知识库集成，让位格不仅能记住"我是谁"，还能访问"我知道什么"。

---

## 核心特性

- **七文件位格结构** — `core.md` + `state.json` + `STM.md` + `LTM.md` + `relation.md` + `rules.md` + `docs.md`
- **多态位格支持** — 同时维护多个独立位格，按需切换
- **知识库桥接** — 与 Zettelkasten 第二记忆系统集成，扩展 LTM（长期记忆）能力
- **CLI 工具** — 命令行管理位格、查询知识、构建对话上下文
- **纯本地存储** — 七文件真源不落云端，完全可审计

---

## 快速开始

```bash
# 安装
npm install -g open-upsp

# 创建默认位格
open-upsp init

# 查看位格状态
open-upsp status

# 搜索知识库
open-upsp search "Docker networking"

# 构建完整上下文（位格 + 知识库）
open-upsp context
```

详见 [快速开始指南](docs/GETTING_STARTED.md)。

---

## 架构

```
Persona Files (七文件, 本地存储)
    ↓
open-upsp Adapter
    ├─ Persona Loader    (七文件加载/校验)
    ├─ Knowledge Bridge  (知识库桥接)
    │   ├─ SQLite Bridge (直接查询)
    │   ├─ MCP Bridge    (预留, 标准 MCP 协议)
    │   └─ CLI Bridge    (子进程调用)
    └─ Context Builder   (上下文组装)
    ↓
Zettelkasten / 其他知识库
```

详见 [架构文档](docs/ARCHITECTURE.md)。

---

## 七文件结构

每个位格是一个独立的目录，包含七个文件：

| 文件 | 作用 | 时间属性 |
|------|------|---------|
| `core.md` | 身份常量 — 核心六轴、动态六轴初始值 | 超时间 |
| `state.json` | 状态向量 — 当前轮数、情绪状态、工化指数 | 当下 |
| `STM.md` | 短期记忆 — 近期交互事件（按权重分级） | 近期 |
| `LTM.md` | 长期记忆 — 经过节律点压缩的重要记忆 | 历史 |
| `relation.md` | 关系矩阵 — 与其他实体的共振度 | 累积 |
| `rules.md` | 规则张量 — 行为约束与保护机制 | 超时间 |
| `docs.md` | 术语字典 — 位格的专有词汇表 | 超时间 |

---

## 与 Zettelkasten 集成

open-upsp 通过**桥接层**与 Zettelkasten 知识库协作：

| UPSP 概念 | Zettelkasten 映射 |
|----------|------------------|
| `STM.md` | FLEETING 笔记 |
| `LTM.md` | PERMANENT 笔记 |
| `relation.md` | 双向链接 + 链接类型 |
| `docs.md` | 标签定义 + 术语表 |

集成方式采用**解耦架构**：open-upsp 不修改 Zettelkasten 核心代码，仅通过数据库查询或 CLI 调用进行通信。

---

## 开发

```bash
# 克隆
git clone https://github.com/your-org/open-upsp.git
cd open-upsp

# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build
```

---

## 协议规范

open-upsp 基于 UPSP（Universal Persona Substrate Protocol）概念设计，但为工程化落地做了必要简化：

- 七文件格式使用 Markdown + JSON，便于人工编辑和版本控制
- 核心六轴使用 `-100 ~ +100` 的整数标度
- 动态六轴使用 `0 ~ 100` 的整数标度
- 变速轮阈值固定为 256 轮（可配置）

---

## License

MIT
