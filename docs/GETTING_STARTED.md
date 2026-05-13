# 快速开始

## 安装

### 方式 1: npm（推荐，自动集成 OpenClaw Agent）

```bash
npm install -g open-upsp
```

npm postinstall 会自动检测 OpenClaw 环境并集成 skill。

### 方式 2: 独立脚本

```bash
curl -fsSL https://raw.githubusercontent.com/your-org/open-upsp/main/scripts/install.sh | bash
```

### 方式 3: 源码安装

```bash
git clone https://github.com/your-org/open-upsp.git
cd open-upsp
npm install
npm run build
npm link
./scripts/install.sh   # 手动执行 Agent 集成
```

---

## 初始化位格

创建你的第一个位格：

```bash
open-upsp init
# 或指定位格 ID
open-upsp init --persona researcher

# 位格存储在 ~/.openclaw/openupsp/personas/ 下
```

这会在默认位格目录下创建七文件模板：

```
~/.openclaw/personas/default/
├── core.md
├── state.json
├── STM.md
├── LTM.md
├── relation.md
├── rules.md
└── docs.md
```

你可以直接编辑这些 Markdown/JSON 文件来调整位格属性。

---

## 查看位格状态

```bash
open-upsp status
# 或
open-upsp status --persona researcher
```

输出示例：

```
位格: default
轮数: 42
变速轮: low
工化指数: 0.35

动态六轴:
  valence:  10  (冷静←→热烈)
  arousal:  30  (低振幅←→高振幅)
  focus:    75  (专注←→跳脱)
  mood:     50  (悲伤←→兴奋)
  humor:    40  (无聊←→有趣)
  safety:   65  (警惕←→放松)
```

---

## 搜索知识库

如果已配置 Zettelkasten 集成：

```bash
open-upsp search "Docker 网络配置"
```

输出示例：

```
找到 3 条相关笔记:

[20260510120000] Docker Bridge 配置 | zettels | score: 0.92
  使用 bridge 模式，子网 172.18.0.0/16...

[20260509080000] Docker Compose 网络 | zettels | score: 0.78
  docker-compose 中定义自定义网络...

[20260508093000] 容器间通信原理 | references | score: 0.65
  同一 bridge 网络内的容器可以直接通过容器名通信...
```

---

## 构建对话上下文

将位格七文件与知识库检索结果组装为 AI 可用的上下文：

```bash
open-upsp context --persona default --query "Docker 网络"
```

这会输出一段结构化的文本，包含：
- 位格身份定义（来自 `core.md`）
- 当前状态（来自 `state.json`）
- 相关记忆（来自 `STM.md` / `LTM.md`）
- 知识库检索结果（来自 Zettelkasten）

你可以将这段文本直接注入 AI 的系统提示词中。

---

## 多态位格管理

### 列出所有位格

```bash
open-upsp list
```

### 切换默认位格

```bash
open-upsp config set defaultPersona researcher
```

### 复制位格

```bash
open-upsp clone default --to experiment
```

---

## 配置

### 配置文件位置

```bash
~/.openclaw/openupsp.json
```

### 配置项

```json
{
  "defaultPersona": "default",
  "personasDir": "~/.openclaw/personas",
  "zettelkasten": {
    "enabled": true,
    "databasePath": "~/.openclaw/zettelkasten/zettelkasten.db",
    "notesDir": "~/.openclaw/zettelkasten/notes"
  }
}
```

---

## 下一步

- 阅读 [架构文档](ARCHITECTURE.md) 了解内部设计
- 编辑你的 `core.md` 定义位格的认知风格
- 在 `rules.md` 中添加自定义行为约束

---

## 故障排除

### 找不到位格目录

```bash
# 检查默认路径
ls ~/.openclaw/personas/

# 或指定自定义路径
open-upsp init --dir /path/to/personas
```

### 知识库查询无结果

```bash
# 确认 Zettelkasten 数据库存在
ls ~/.openclaw/zettelkasten/zettelkasten.db

# 检查配置
open-upsp config get bridge.sqlite.databasePath
```

### 权限问题

```bash
# 确保位格目录权限正确
chmod 700 ~/.openclaw/personas
```
