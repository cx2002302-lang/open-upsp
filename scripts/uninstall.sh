#!/usr/bin/env bash
# open-upsp 卸载脚本
# 安全移除：Skill → 配置 → CLI（可选）

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()   { echo -e "${GREEN}[OK]${NC}  $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err()  { echo -e "${RED}[ERR]${NC}  $1"; }

SKILL_ID="open-upsp"
SKILL_DIR="$HOME/.openclaw/skills/$SKILL_ID"
OPENCLAW_CONFIG="$HOME/.openclaw/openclaw.json"
PERSONAS_DIR="$HOME/.openclaw/personas"

echo
log_info "open-upsp 卸载程序"
echo

# 询问是否删除位格数据
delete_personas="n"
read -p "是否同时删除位格数据 (~/.openclaw/personas/)？[y/N] " delete_personas < /dev/tty || true
echo

# 1. 删除 Skill
if [ -d "$SKILL_DIR" ]; then
  rm -rf "$SKILL_DIR"
  log_ok "已删除 Skill: $SKILL_DIR"
else
  log_warn "Skill 目录不存在: $SKILL_DIR"
fi

# 2. 清理 OpenClaw 配置
if [ -f "$OPENCLAW_CONFIG" ]; then
  log_info "清理 OpenClaw 配置..."

  # 备份
  local backup="$OPENCLAW_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
  cp "$OPENCLAW_CONFIG" "$backup"
  log_info "  配置已备份: $backup"

  # 使用 Node.js 安全移除
  node << 'NODE_EOF'
const fs = require('fs');
const path = process.env.HOME + '/.openclaw/openclaw.json';

let data;
try {
  data = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (e) {
  console.error('[ERR]  无法解析 openclaw.json:', e.message);
  process.exit(1);
}

let modified = false;

// 从 skills 移除
if (data.agents?.defaults?.skills) {
  const before = data.agents.defaults.skills.length;
  data.agents.defaults.skills = data.agents.defaults.skills.filter(s => s !== 'open-upsp');
  if (data.agents.defaults.skills.length < before) {
    console.log('[OK]  已从 agents.defaults.skills 移除 open-upsp');
    modified = true;
  }
}

// 从 alsoAllow 移除
if (data.tools?.alsoAllow) {
  const before = data.tools.alsoAllow.length;
  data.tools.alsoAllow = data.tools.alsoAllow.filter(s => s !== 'open-upsp');
  if (data.tools.alsoAllow.length < before) {
    console.log('[OK]  已从 tools.alsoAllow 移除 open-upsp');
    modified = true;
  }
}

if (!modified) {
  console.log('[INFO] open-upsp 不在 OpenClaw 配置中');
}

fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log('[OK]  OpenClaw 配置已更新');
NODE_EOF

else
  log_warn "OpenClaw 配置文件不存在，跳过配置清理"
fi

# 3. 删除位格数据（可选）
if [ "${delete_personas:-n}" = "y" ] || [ "${delete_personas:-n}" = "Y" ]; then
  if [ -d "$PERSONAS_DIR" ]; then
    rm -rf "$PERSONAS_DIR"
    log_ok "已删除位格数据: $PERSONAS_DIR"
  fi
else
  log_info "保留位格数据: $PERSONAS_DIR"
fi

# 4. 提示卸载 CLI
echo
log_info "CLI 工具卸载方式:"
echo "  npm uninstall -g open-upsp"
echo
log_ok "卸载完成"
echo
