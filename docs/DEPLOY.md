# 部署指南

> open-upsp v0.3.0 完整部署文档。覆盖所有安装方式、配置详解与故障排查。

---

## 目录

- [系统要求](#系统要求)
- [安装方式](#安装方式)
  - [npm 安装（推荐）](#npm-安装推荐)
  - [源码安装](#源码安装)
  - [独立脚本安装](#独立脚本安装)
- [OpenClaw Agent 集成](#openclaw-agent-集成)
- [配置详解](#配置详解)
- [故障排查](#故障排查)
- [卸载](#卸载)

---

## 系统要求

| 项目 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 22 | ES Module 必需 |
| npm | >= 10 | 包管理 |
| OS | Linux / macOS / WSL2 | Windows 原生未测试 |
| OpenClaw | >= 2026.4.24 | Agent 集成必需（可选） |
| Zettelkasten | >= 2.0.0 | 知识库集成可选 |

### 验证环境

```bash
node --version    # 应输出 v22.x.x 或更高
npm --version     # 应输出 10.x.x 或更高
```

---

## 安装方式

### npm 安装（推荐）

```bash
npm install -g open-upsp
```

**npm postinstall 会自动完成以下操作：**

1. 检测 OpenClaw 环境（检查 `~/.openclaw/openclaw.json`）
2. 将 `skill/` 复制到 `~/.openclaw/skills/open-upsp/`
3. 安全修改 `openclaw.json`：
   - 将 `"open-upsp"` 追加到 `agents.defaults.skills`（去重）
   - 将 `"open-upsp"` 追加到 `tools.alsoAllow`（去重）
4. **检测 Zettelkasten 插件**：
   - 如果已安装 → 跳过
   - 如果未安装 → 倒计时提示（10 秒，默认安装）
   - 如果 OpenClaw 不可用 → 跳过（纯 CLI 模式）
5. 验证安装：运行 `open-upsp --version`

**安装前无需手动准备任何文件。**

#### Zettelkasten 自动安装

open-upsp 打包了兼容的 Zettelkasten 插件（Schema v2.0.0）。安装时会自动检测：

```
[ZK] 检测 Zettelkasten 插件...
[ZK] ZK 已安装 (版本: v1.0.0-beta.4) ✓
# 或
[ZK] 未检测到 Zettelkasten 知识库插件。
[ZK] 是否安装 ZK（第二记忆系统）？[Y/n]（10 秒后默认 Y）
[ZK] ZK 插件安装成功
[ZK] ZK 数据库初始化成功
```

**跳过 ZK 安装**：在倒计时期间输入 `n` 或按 Ctrl-C。稍后手动安装：

```bash
openclaw plugins install $(npm root -g)/open-upsp/vendor/zettelkasten-plugin-*.tar.gz
openclaw plugins enable zettelkasten
openclaw zk init
```

---

### 源码安装

适用于开发者或需要修改源码的场景：

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/open-upsp.git
cd open-upsp

# 2. 安装依赖
npm install

# 3. 构建
npm run build

# 4. 链接到全局
npm link

# 5. 执行 Agent 集成（如果已安装 OpenClaw）
./scripts/install.sh
```

---

### 独立脚本安装

适用于没有 npm 或需要快速部署的场景：

```bash
curl -fsSL https://raw.githubusercontent.com/your-org/open-upsp/main/scripts/install.sh | bash
```

**脚本内部逻辑：**

```
检测 Node.js >= 22
  ↓
检测 open-upsp CLI（如未安装尝试 npm link）
  ↓
检测 OpenClaw
  ├─ 存在 → 安装 Skill → 修改 openclaw.json → 验证
  └─ 不存在 → 仅安装 CLI，提示手动集成
```

---

## OpenClaw Agent 集成

### 自动集成（npm 安装时已完成）

安装后验证：

```bash
# 检查 skill 是否注册
openclaw config get agents.defaults.skills
# 预期输出包含 "open-upsp"

# 检查工具命名空间
openclaw config get tools.alsoAllow
# 预期输出包含 "open-upsp"
```

### 手动集成（自动集成失败时）

如果 npm postinstall 因权限或其他原因失败：

```bash
# 1. 找到 skill 目录
SKILL_SRC="$(npm root -g)/open-upsp/skill"

# 2. 复制到 OpenClaw skills 目录
cp -r "$SKILL_SRC" ~/.openclaw/skills/open-upsp

# 3. 修改 openclaw.json（使用 openclaw CLI）
openclaw config set agents.defaults.skills '["open-upsp", "zettelkasten-brain"]'
openclaw config set tools.alsoAllow '["zettelkasten", "open-upsp"]'
```

### 多 Skill 共存

open-upsp 的 install.sh 和 postinstall.js 采用**去重追加**策略，不会覆盖已有的 skills：

```json
// 安装前
{
  "agents": {
    "defaults": {
      "skills": ["zettelkasten-brain", "my-custom-skill"]
    }
  }
}

// 安装后（open-upsp 被追加到末尾）
{
  "agents": {
    "defaults": {
      "skills": ["zettelkasten-brain", "my-custom-skill", "open-upsp"]
    }
  }
}
```

---

## 配置详解

### open-upsp 配置

**位置**：`~/.openclaw/openupsp.json`

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

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `defaultPersona` | string | `"default"` | 默认位格 ID |
| `personasDir` | string | `"~/.openclaw/personas"` | 位格存储根目录 |
| `zettelkasten.enabled` | boolean | `true` | 是否启用 ZK 集成 |
| `zettelkasten.databasePath` | string | `"~/.openclaw/zettelkasten/zettelkasten.db"` | SQLite 数据库路径 |
| `zettelkasten.notesDir` | string | `"~/.openclaw/zettelkasten/notes"` | Markdown 笔记目录 |

### OpenClaw 配置

**位置**：`~/.openclaw/openclaw.json`

open-upsp 安装时会自动修改以下字段：

```json
{
  "agents": {
    "defaults": {
      "skills": ["open-upsp", "zettelkasten-brain"]
    }
  },
  "tools": {
    "alsoAllow": ["zettelkasten", "open-upsp"]
  }
}
```

| 字段 | 说明 |
|------|------|
| `agents.defaults.skills` | Agent 加载的 skill 列表。open-upsp 必须在此列表中才会生效。 |
| `tools.alsoAllow` | 允许的工具命名空间。open-upsp 的 CLI 命令需要在此列表中才能被 Agent 调用。 |

---

## 故障排查

### "open-upsp: command not found"

**原因**：npm 全局 bin 目录不在 PATH 中。

**解决**：

```bash
# 找到全局 bin 路径
npm bin -g

# 临时添加（当前终端）
export PATH="$(npm bin -g):$PATH"

# 永久添加（写入 ~/.bashrc 或 ~/.zshrc）
echo 'export PATH="'"$(npm bin -g)"':$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### "Skill 未生效"

**排查步骤**：

```bash
# 1. 检查 skill 文件是否存在
ls ~/.openclaw/skills/open-upsp/SKILL.md

# 2. 检查 openclaw.json 配置
openclaw config get agents.defaults.skills
openclaw config get tools.alsoAllow

# 3. 检查 openclaw.json 是否有效 JSON
node -e "JSON.parse(require('fs').readFileSync(process.env.HOME + '/.openclaw/openclaw.json'))"

# 4. 重启 Agent（配置修改后需要重启）
```

### "ZK 搜索无结果"

**排查步骤**：

```bash
# 1. 检查数据库文件是否存在
ls ~/.openclaw/zettelkasten/zettelkasten.db

# 2. 检查配置路径
open-upsp config get bridge.sqlite.databasePath

# 3. 手动测试搜索
open-upsp search "test" -l 3

# 4. 检查数据库权限
ls -la ~/.openclaw/zettelkasten/zettelkasten.db
```

### "postinstall 修改 openclaw.json 失败"

**原因**：权限不足或 JSON 格式异常。

**解决**：

```bash
# 1. 检查备份文件（安装脚本会自动备份）
ls ~/.openclaw/openclaw.json.backup.*

# 2. 恢复备份
cp ~/.openclaw/openclaw.json.backup.YYYYMMDD_HHMMSS ~/.openclaw/openclaw.json

# 3. 手动执行集成
./scripts/install.sh
```

### "安装后位格初始化失败"

**原因**：位格目录权限问题。

**解决**：

```bash
# 创建并设置权限
mkdir -p ~/.openclaw/personas
chmod 700 ~/.openclaw/personas

# 重新初始化
open-upsp init
```

---

## 卸载

### 方式 1: npm 卸载

```bash
npm uninstall -g open-upsp
```

npm 不会自动清理 OpenClaw skill 和配置。如需彻底清理：

```bash
# 运行卸载脚本（清理 skill + 配置，保留位格数据）
$(npm root -g)/open-upsp/scripts/uninstall.sh

# 或手动清理
rm -rf ~/.openclaw/skills/open-upsp
# 手动编辑 ~/.openclaw/openclaw.json 移除 open-upsp
```

### 方式 2: 彻底清理（包括位格数据）

```bash
# 1. 卸载 CLI
npm uninstall -g open-upsp

# 2. 运行卸载脚本并删除位格数据
# uninstall.sh 会询问是否删除 ~/.openclaw/personas/

# 3. 手动清理配置
# 编辑 ~/.openclaw/openclaw.json 移除 open-upsp
```

### 卸载验证

```bash
# CLI 应不存在
open-upsp --version   # 应报错 "command not found"

# Skill 应不存在
ls ~/.openclaw/skills/open-upsp   # 应报错 "No such file"

# 配置应已清理
openclaw config get agents.defaults.skills   # 不应包含 open-upsp
```

---

## Zettelkasten 版本兼容性

open-upsp 与 Zettelkasten 的集成基于 **Schema v2.0.0**。

| open-upsp 版本 | 兼容 ZK Schema | 打包 ZK 插件版本 |
|---------------|---------------|----------------|
| v0.3.0 | v2.0.0 | v1.0.0-beta.4 |

**Schema 耦合说明**：

open-upsp 通过只读 SQLite 查询访问 ZK 数据库。以下表名和列名是硬编码的耦合点：

```
zettel_notes     (id, title, content, type, status, ...)
zettel_links     (from_note_id, to_note_id, type, ...)
zettel_tags      (id, name)
zettel_note_tags (note_id, tag_id)
zettel_fts       (id, content)  -- FTS5 虚拟表
zettel_meta      (key, value)   -- schema_version
```

如果 ZK 未来版本修改了这些表结构，open-upsp 需要同步更新。

运行时会在每次连接时检查 `zettelkasten.db` 中的 `schema_version`，不匹配时抛出清晰的错误信息。

---

## 发布检查清单

如果你是维护者，发布前请验证：

- [ ] `npm install -g open-upsp` 在干净机器上成功
- [ ] 安装后自动检测/安装 Zettelkasten
- [ ] 安装后 `open-upsp --version` 输出正确版本
- [ ] 安装后 `open-upsp init` 成功创建七文件
- [ ] OpenClaw 配置正确包含 open-upsp
- [ ] `scripts/uninstall.sh` 成功卸载且不破坏其他 skill / ZK
- [ ] 源码安装路径（git clone + npm link）正常工作
- [ ] 多 skill 共存场景下安装不覆盖已有配置
- [ ] 进化参数（PARAMS.yaml）修改后 CLI 自动生效
- [ ] Round >= 10 + workhoodIndex >= 0.3 时进化模块解锁

---

*版本: v0.3.0 | 最后更新: 2026-05-13*
