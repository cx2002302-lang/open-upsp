#!/usr/bin/env bash
# Zettelkasten 插件检测与自动安装脚本
# 检测系统是否已部署 ZK，未部署时倒计时提示安装

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[ZK]${NC} $1"; }
log_ok()   { echo -e "${GREEN}[ZK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[ZK]${NC} $1"; }
log_err()  { echo -e "${RED}[ZK]${NC} $1"; }

# 配置
ZK_PLUGIN_ID="zettelkasten"
ZK_PLUGIN_DIR="$HOME/.openclaw/zettelkasten-plugin"
OPENCLAW_CONFIG="$HOME/.openclaw/openclaw.json"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 查找 vendor 目录中的 ZK tar.gz
find_zk_archive() {
  local vendor_dir="$SCRIPT_DIR/../vendor"
  if [ ! -d "$vendor_dir" ]; then
    return 1
  fi
  local archive
  archive=$(ls "$vendor_dir"/zettelkasten-plugin-*.tar.gz 2>/dev/null | head -1)
  if [ -n "$archive" ] && [ -f "$archive" ]; then
    echo "$archive"
    return 0
  fi
  return 1
}

MIN_OPENCLAW_VERSION="2026.4.24"

# 检测 openclaw 是否可用
check_openclaw() {
  command -v openclaw &>/dev/null
}

# 检测 openclaw 版本是否满足要求
check_openclaw_version() {
  if ! check_openclaw; then
    return 1
  fi

  local actual_version
  actual_version=$(openclaw --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  if [ -z "$actual_version" ]; then
    log_warn "无法解析 OpenClaw 版本"
    return 1
  fi

  if [ "$(printf '%s\n' "$actual_version" "$MIN_OPENCLAW_VERSION" | sort -V | head -n1)" != "$MIN_OPENCLAW_VERSION" ]; then
    log_warn "OpenClaw 版本过低: v${actual_version}，需要 >= ${MIN_OPENCLAW_VERSION}"
    log_info "  ZK 插件需要 OpenClaw >= ${MIN_OPENCLAW_VERSION} 的插件 SDK API"
    return 1
  fi

  return 0
}

# 检测 ZK 是否已安装
check_zk_installed() {
  # 方法 1: openclaw plugins list
  if check_openclaw; then
    if openclaw plugins list 2>/dev/null | grep -q "$ZK_PLUGIN_ID"; then
      return 0
    fi
  fi
  # 方法 2: 检查插件目录
  if [ -f "$ZK_PLUGIN_DIR/plugin/openclaw.plugin.json" ]; then
    return 0
  fi
  return 1
}

# 获取已安装 ZK 的版本
get_zk_version() {
  if [ -f "$ZK_PLUGIN_DIR/plugin/openclaw.plugin.json" ]; then
    node -e "
      try {
        const p = require('$ZK_PLUGIN_DIR/plugin/openclaw.plugin.json');
        console.log(p.version || 'unknown');
      } catch { console.log('unknown'); }
    " 2>/dev/null || echo "unknown"
  else
    echo "unknown"
  fi
}

# 获取打包的 ZK 版本
get_bundled_version() {
  local archive
  archive=$(find_zk_archive) || { echo "unknown"; return; }
  # 从文件名提取版本
  basename "$archive" | sed 's/zettelkasten-plugin-//;s/\.tar\.gz$//'
}

# 倒计时提示（默认 Y，10 秒）
countdown_prompt() {
  local prompt_msg="$1"
  local timeout_sec="${2:-10}"
  local response=""

  echo
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  🔮 Zettelkasten 第二记忆系统${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo
  echo -e "$prompt_msg"
  echo

  # 检测是否为非交互式环境
  if [ ! -t 0 ]; then
    log_info "非交互式环境 detected，默认安装 ZK"
    return 0
  fi

  # 倒计时读取输入
  echo -n "  请输入 [Y/n]（${timeout_sec} 秒后默认 Y）: "

  local timed_out=false
  read -t "$timeout_sec" -r response < /dev/tty || timed_out=true

  if [ "$timed_out" = true ]; then
    echo
    log_info "超时，默认安装 ZK"
    return 0
  fi

  response=$(echo "$response" | tr '[:upper:]' '[:lower:]')
  if [ -z "$response" ] || [ "$response" = "y" ] || [ "$response" = "yes" ]; then
    return 0
  else
    return 1
  fi
}

# 安装 ZK 插件
install_zk() {
  local archive
  archive=$(find_zk_archive) || {
    log_err "找不到 ZK 插件安装包（vendor/zettelkasten-plugin-*.tar.gz）"
    log_info "  请确保通过 npm 或源码正确安装 open-upsp"
    return 1
  }

  log_info "安装包: $(basename "$archive")"

  if ! check_openclaw_version; then
    log_warn "openclaw CLI 不可用或版本不满足，无法自动安装 ZK"
    log_info "  请先安装 OpenClaw，然后手动运行: openclaw plugins install <archive>"
    return 1
  fi

  log_info "正在安装 ZK 插件（通过 openclaw plugins install）..."
  if openclaw plugins install "$archive" 2>/dev/null; then
    log_ok "ZK 插件安装成功"
  else
    log_warn "openclaw plugins install 返回非零，尝试手动解压..."
    mkdir -p "$ZK_PLUGIN_DIR"
    tar -xzf "$archive" -C "$ZK_PLUGIN_DIR" --strip-components=1
    log_ok "ZK 插件已手动解压到 $ZK_PLUGIN_DIR"
  fi

  # 启用插件
  log_info "启用 ZK 插件..."
  openclaw plugins enable zettelkasten 2>/dev/null || {
    log_warn "openclaw plugins enable 失败，尝试手动配置..."
    node << 'NODE_EOF'
const fs = require('fs');
const path = process.env.HOME + '/.openclaw/openclaw.json';
if (!fs.existsSync(path)) { console.log('[WARN] openclaw.json 不存在'); process.exit(1); }
const d = JSON.parse(fs.readFileSync(path, 'utf8'));
if (!d.plugins) d.plugins = {};
if (!d.plugins.entries) d.plugins.entries = {};
if (!d.plugins.entries.zettelkasten) d.plugins.entries.zettelkasten = {};
d.plugins.entries.zettelkasten.enabled = true;
fs.writeFileSync(path, JSON.stringify(d, null, 2) + '\n');
console.log('[OK]  ZK 插件已手动启用');
NODE_EOF
  }

  # 初始化数据库
  log_info "初始化 ZK 数据库..."
  if openclaw zk init 2>/dev/null; then
    log_ok "ZK 数据库初始化成功"
  else
    log_warn "ZK 数据库初始化可能需要手动执行: openclaw zk init"
  fi

  return 0
}

# ============ 主流程 ============

main() {
  log_info "检测 Zettelkasten 插件..."

  # 1. 检查 ZK 是否已安装
  if check_zk_installed; then
    local installed_ver
    installed_ver=$(get_zk_version)
    local bundled_ver
    bundled_ver=$(get_bundled_version)
    log_ok "ZK 已安装 (版本: ${installed_ver})"
    if [ "$installed_ver" != "$bundled_ver" ] && [ "$bundled_ver" != "unknown" ]; then
      log_info "  打包版本: ${bundled_ver}，如需更新请运行: openclaw plugins update"
    fi
    return 0
  fi

  # 2. 检查 openclaw 是否可用且版本满足
  if ! check_openclaw_version; then
    log_warn "OpenClaw 未检测到或版本不满足，跳过 ZK 安装"
    log_info "  open-upsp CLI 仍可独立运行（无知识库集成）"
    log_info "  如需知识库功能，请先安装 OpenClaw 后重新运行安装脚本"
    return 0
  fi

  # 3. 检查是否有安装包
  if ! find_zk_archive >/dev/null; then
    log_warn "未找到 ZK 安装包，跳过"
    return 0
  fi

  # 4. 倒计时提示
  local bundled_ver
  bundled_ver=$(get_bundled_version)
  local msg="  未检测到 Zettelkasten 知识库插件。\n\n  Zettelkasten 是 open-upsp 的**第二记忆系统**，提供：\n    • 原子笔记管理\n    • 双向链接图谱\n    • FTS5 全文搜索\n    • 夜间知识蒸馏\n\n  是否安装 Zettelkasten ${bundled_ver}？"

  if countdown_prompt "$msg" 10; then
    install_zk
  else
    log_info "用户选择跳过 ZK 安装"
    log_info "  稍后可通过以下命令手动安装:"
    log_info "    openclaw plugins install $(find_zk_archive 2>/dev/null || echo '<path-to-tar.gz>')"
  fi
}

main "$@"
