#!/usr/bin/env bash
# open-upsp 一键安装脚本
# 自动完成：CLI 安装 → Skill 部署 → OpenClaw 配置集成

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
SKILL_ID="open-upsp"
SKILL_DIR="$HOME/.openclaw/skills/$SKILL_ID"
OPENCLAW_CONFIG="$HOME/.openclaw/openclaw.json"
OPENCLAW_DIR="$HOME/.openclaw"

# 工具函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()   { echo -e "${GREEN}[OK]${NC}  $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err()  { echo -e "${RED}[ERR]${NC}  $1"; }

banner() {
  echo
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║          open-upsp — 位格意识安装器 v0.3.0                    ║"
  echo "║          Universal Persona Substrate Protocol                 ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo
}

check_node() {
  log_info "检测 Node.js 环境..."
  if ! command -v node &>/dev/null; then
    log_err "Node.js 未安装。请先安装 Node.js >= 22"
    log_info "  推荐: https://nodejs.org/ 或使用 nvm"
    exit 1
  fi

  NODE_VERSION=$(node --version | sed 's/v//')
  MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

  if [ "$MAJOR" -lt 22 ]; then
    log_err "Node.js 版本过低: v${NODE_VERSION}，需要 >= 22"
    exit 1
  fi

  log_ok "Node.js v${NODE_VERSION} ✓"
}

MIN_OPENCLAW_VERSION="2026.4.24"

check_openclaw() {
  log_info "检测 OpenClaw 环境..."
  if [ -f "$OPENCLAW_CONFIG" ]; then
    log_ok "OpenClaw 已安装 ✓"
  else
    log_warn "OpenClaw 未检测到（~/.openclaw/openclaw.json 不存在）"
    log_info "  CLI 工具将正常安装，但 Agent 集成需手动完成"
    return 1
  fi

  # 版本检查
  if ! command -v openclaw &>/dev/null; then
    log_warn "openclaw CLI 不在 PATH 中，无法验证版本"
    return 1
  fi

  local actual_version
  actual_version=$(openclaw --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  if [ -z "$actual_version" ]; then
    log_warn "无法解析 OpenClaw 版本"
    return 1
  fi

  # 版本比较 (sort -V)
  if [ "$(printf '%s\n' "$actual_version" "$MIN_OPENCLAW_VERSION" | sort -V | head -n1)" != "$MIN_OPENCLAW_VERSION" ]; then
    log_err "OpenClaw 版本过低: v${actual_version}，需要 >= ${MIN_OPENCLAW_VERSION}"
    log_info "  请升级 OpenClaw 后重新运行此脚本"
    return 1
  fi

  log_ok "OpenClaw v${actual_version} >= ${MIN_OPENCLAW_VERSION} ✓"
  return 0
}

check_cli() {
  log_info "检测 open-upsp CLI..."
  if command -v open-upsp &>/dev/null; then
    VERSION=$(open-upsp --version 2>/dev/null || echo "unknown")
    log_ok "open-upsp CLI 已安装 (v${VERSION}) ✓"
    return 0
  else
    log_warn "open-upsp CLI 未在 PATH 中找到"
    return 1
  fi
}

find_skill_source() {
  # 尝试多个可能的来源路径
  local candidates=(
    "$(dirname "$0")/../skill"              # 脚本同级目录 ../skill（源码安装）
    "$(npm root -g)/open-upsp/skill"         # npm 全局安装路径
    "$HOME/.local/share/uv/tools/kimi-cli/lib/node_modules/open-upsp/skill"  # uv 安装路径
  )

  for path in "${candidates[@]}"; do
    if [ -f "$path/SKILL.md" ]; then
      echo "$path"
      return 0
    fi
  done

  return 1
}

install_skill() {
  log_info "安装 Skill 到 OpenClaw..."

  local src
  src=$(find_skill_source) || {
    log_err "找不到 skill 源目录（包含 SKILL.md 的目录）"
    log_info "  请确保从源码目录运行此脚本，或通过 npm 安装"
    return 1
  }

  log_info "  Skill 源: $src"

  # 备份已存在的 skill
  if [ -d "$SKILL_DIR" ]; then
    local backup="$SKILL_DIR.backup.$(date +%Y%m%d_%H%M%S)"
    log_warn "检测到已有 skill，备份到: $backup"
    cp -r "$SKILL_DIR" "$backup"
    rm -rf "$SKILL_DIR"
  fi

  mkdir -p "$HOME/.openclaw/skills"
  cp -r "$src" "$SKILL_DIR"
  log_ok "Skill 已安装到 $SKILL_DIR ✓"
}

configure_openclaw() {
  log_info "配置 OpenClaw..."

  if [ ! -f "$OPENCLAW_CONFIG" ]; then
    log_warn "OpenClaw 配置文件不存在，跳过配置"
    return 0
  fi

  # 备份原配置
  local backup="$OPENCLAW_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
  cp "$OPENCLAW_CONFIG" "$backup"
  log_info "  配置已备份: $backup"

  # 使用 Node.js 安全修改 JSON
  node << 'NODE_EOF'
const fs = require('fs');
const path = process.env.HOME + '/.openclaw/openclaw.json';

let data;
try {
  data = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (e) {
  console.error('无法解析 openclaw.json:', e.message);
  process.exit(1);
}

// 确保 agents.defaults 存在
if (!data.agents) data.agents = {};
if (!data.agents.defaults) data.agents.defaults = {};
if (!Array.isArray(data.agents.defaults.skills)) {
  data.agents.defaults.skills = [];
}

// 确保 tools.alsoAllow 存在
if (!data.tools) data.tools = {};
if (!Array.isArray(data.tools.alsoAllow)) {
  data.tools.alsoAllow = [];
}

// 去重追加 open-upsp
if (!data.agents.defaults.skills.includes('open-upsp')) {
  data.agents.defaults.skills.push('open-upsp');
  console.log('[INFO] 已添加 open-upsp 到 agents.defaults.skills');
} else {
  console.log('[INFO] open-upsp 已在 agents.defaults.skills 中');
}

if (!data.tools.alsoAllow.includes('open-upsp')) {
  data.tools.alsoAllow.push('open-upsp');
  console.log('[INFO] 已添加 open-upsp 到 tools.alsoAllow');
} else {
  console.log('[INFO] open-upsp 已在 tools.alsoAllow 中');
}

fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log('[OK]  OpenClaw 配置已更新');
NODE_EOF

  log_ok "OpenClaw 配置完成 ✓"
}

verify_installation() {
  log_info "验证安装..."
  local ok=true

  # 验证 CLI
  if command -v open-upsp &>/dev/null; then
    local ver
    ver=$(open-upsp --version 2>/dev/null || echo "unknown")
    log_ok "CLI: open-upsp v${ver} ✓"
  else
    log_err "CLI: open-upsp 不在 PATH 中"
    ok=false
  fi

  # 验证 Skill
  if [ -f "$SKILL_DIR/SKILL.md" ]; then
    log_ok "Skill: $SKILL_DIR/SKILL.md ✓"
  else
    log_err "Skill: SKILL.md 未找到"
    ok=false
  fi

  # 验证 OpenClaw 配置
  if [ -f "$OPENCLAW_CONFIG" ]; then
    if node -e "
      const d = require('$OPENCLAW_CONFIG');
      const hasSkill = d.agents?.defaults?.skills?.includes('open-upsp');
      process.exit(hasSkill ? 0 : 1);
    " 2>/dev/null; then
      log_ok "OpenClaw: skill 已激活 ✓"
    else
      log_warn "OpenClaw: skill 可能未正确激活，请检查配置"
    fi
  fi

  # 验证位格目录
  if [ -d "$HOME/.openclaw/personas" ]; then
    local count
    count=$(find "$HOME/.openclaw/personas" -maxdepth 1 -type d | wc -l)
    count=$((count - 1))
    log_ok "位格: 已创建 ${count} 个位格 ✓"
  fi

  $ok
}

print_summary() {
  echo
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║                    🎉 安装完成                                ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo
  echo "  快速开始:"
  echo "    open-upsp init              # 创建默认位格"
  echo "    open-upsp status            # 查看位格状态"
  echo "    open-upsp context           # 构建对话上下文"
  echo "    open-upsp search '关键词'    # 搜索知识库"
  echo
  echo "  文档:"
  echo "    docs/DEPLOY_QUICK.md        # 快速参考"
  echo "    docs/DEPLOY.md              # 完整部署指南"
  echo "    docs/GETTING_STARTED.md     # 使用教程"
  echo
  echo "  故障排查:"
  echo "    open-upsp --help            # 查看所有命令"
  echo "    scripts/uninstall.sh        # 卸载"
  echo
}

# ============ ZK 插件安装 ============

install_zk_plugin() {
  local zk_script="$(dirname "$0")/install-zk.sh"
  if [ -f "$zk_script" ]; then
    bash "$zk_script"
  else
    log_warn "install-zk.sh 未找到，跳过 ZK 检测"
  fi
}

# ============ 主流程 ============

banner
check_node

# 如果 CLI 未安装，尝试从当前目录构建
if ! check_cli; then
  log_info "尝试从当前目录安装 CLI..."
  if [ -f "$(dirname "$0")/../package.json" ]; then
    cd "$(dirname "$0")/.."
    npm link 2>/dev/null || npm install -g . 2>/dev/null || {
      log_warn "自动安装 CLI 失败，请手动运行: npm install -g open-upsp"
    }
  fi
fi

# 安装 skill（如果 openclaw 存在）
if check_openclaw; then
  install_skill
  configure_openclaw
else
  log_info "OpenClaw 未安装，仅完成 CLI 工具安装"
  log_info "  如需 Agent 集成，请先安装 OpenClaw，然后重新运行此脚本"
fi

# 安装 ZK 插件（自动检测 + 倒计时提示）
install_zk_plugin

# 验证
if verify_installation; then
  print_summary
  exit 0
else
  log_err "安装验证未完全通过，请查看上方错误信息"
  exit 1
fi
