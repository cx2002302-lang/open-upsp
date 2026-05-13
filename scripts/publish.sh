#!/usr/bin/env bash
#
# open-upsp 发布打包脚本
# 从开发目录整理必要文件到发布目录
#
# 用法:
#   bash scripts/publish.sh [版本号]
#
# 示例:
#   bash scripts/publish.sh 0.3.0
#

set -euo pipefail

# 配置
DEV_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="${DEV_DIR}/open-upsp-release"
VERSION="${1:-$(node -p "require('${DEV_DIR}/package.json').version" 2>/dev/null || echo "unknown")}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[PUBLISH]${NC} $1"; }
log_ok()   { echo -e "${GREEN}[OK]${NC}  $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err()  { echo -e "${RED}[ERR]${NC}  $1"; }
log_step() { echo -e "${CYAN}[STEP ${1}/7]${NC} $2"; }

banner() {
  echo
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║            open-upsp 发布打包脚本 v${VERSION}                      ║"
  echo "║                                                                ║"
  echo "║  ⚠️  发布前请确保已阅读 PUBLISH.md 并勾选检查清单              ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo
}

# ============ 检查清单验证 ============

check_prerequisites() {
  log_step 1 "检查前置条件"

  local ok=true

  # 检查 package.json version
  if [ "$VERSION" = "unknown" ]; then
    log_err "无法读取 package.json 版本号"
    ok=false
  else
    log_ok "package.json version: ${VERSION}"
  fi

  # 检查 vendor/ 中的 ZK 插件
  local zk_archive
  zk_archive=$(ls "${DEV_DIR}/vendor"/zettelkasten-plugin-*.tar.gz 2>/dev/null | head -1)
  if [ -n "$zk_archive" ]; then
    local zk_version
    zk_version=$(basename "$zk_archive" | sed 's/zettelkasten-plugin-//;s/\.tar\.gz$//')
    log_ok "ZK 插件: ${zk_version}"
  else
    log_warn "未找到 ZK 插件安装包（vendor/zettelkasten-plugin-*.tar.gz）"
    log_warn "  发布包将不包含 ZK 插件，用户需手动安装"
  fi

  # 检查 dist/ 是否存在
  if [ ! -d "${DEV_DIR}/dist" ]; then
    log_warn "dist/ 目录不存在，运行 npm run build..."
    (cd "$DEV_DIR" && npm run build) || {
      log_err "构建失败"
      ok=false
    }
  else
    log_ok "dist/ 目录存在"
  fi

  # 检查必要文件
  for f in README.md CHANGELOG.md LICENSE package.json; do
    if [ ! -f "${DEV_DIR}/${f}" ]; then
      log_err "必要文件缺失: ${f}"
      ok=false
    fi
  done

  if [ "$ok" = false ]; then
    log_err "前置条件检查未通过，请修复后重试"
    exit 1
  fi

  echo
}

# ============ 创建发布目录 ============

prepare_release_dir() {
  log_step 2 "准备发布目录"

  if [ -d "$RELEASE_DIR" ]; then
    log_info "清空现有发布目录: ${RELEASE_DIR}"
    rm -rf "${RELEASE_DIR:?}"
  fi

  mkdir -p "$RELEASE_DIR"
  log_ok "发布目录已创建"
  echo
}

# ============ 复制源码 ============

copy_source() {
  log_step 3 "复制源码"

  # src/ — 只复制 .ts 文件，排除 tests/
  if [ -d "${DEV_DIR}/src" ]; then
    mkdir -p "${RELEASE_DIR}/src"
    find "${DEV_DIR}/src" -name "*.ts" -type f | while read -r f; do
      rel="${f#${DEV_DIR}/src/}"
      dir=$(dirname "${RELEASE_DIR}/src/${rel}")
      mkdir -p "$dir"
      cp "$f" "${RELEASE_DIR}/src/${rel}"
    done
    log_ok "src/ 复制完成 ($(find "${RELEASE_DIR}/src" -name '*.ts' | wc -l) 个文件)"
  fi

  # dist/
  if [ -d "${DEV_DIR}/dist" ]; then
    cp -r "${DEV_DIR}/dist" "${RELEASE_DIR}/"
    log_ok "dist/ 复制完成"
  fi

  # templates/
  if [ -d "${DEV_DIR}/templates" ]; then
    cp -r "${DEV_DIR}/templates" "${RELEASE_DIR}/"
    log_ok "templates/ 复制完成"
  fi

  echo
}

# ============ 复制 Skill ============

copy_skill() {
  log_step 4 "复制 Skill"

  if [ -d "${DEV_DIR}/skill" ]; then
    cp -r "${DEV_DIR}/skill" "${RELEASE_DIR}/"
    log_ok "skill/ 复制完成"
  else
    log_warn "skill/ 目录不存在"
  fi

  echo
}

# ============ 复制脚本和 vendor ============

copy_scripts_and_vendor() {
  log_step 5 "复制脚本和 vendor"

  # scripts/
  if [ -d "${DEV_DIR}/scripts" ]; then
    mkdir -p "${RELEASE_DIR}/scripts"
    for f in install.sh install-zk.sh uninstall.sh postinstall.js; do
      if [ -f "${DEV_DIR}/scripts/${f}" ]; then
        cp "${DEV_DIR}/scripts/${f}" "${RELEASE_DIR}/scripts/"
      fi
    done
    chmod +x "${RELEASE_DIR}/scripts/"*.sh 2>/dev/null || true
    log_ok "scripts/ 复制完成"
  fi

  # vendor/ (ZK 插件)
  if [ -d "${DEV_DIR}/vendor" ]; then
    mkdir -p "${RELEASE_DIR}/vendor"
    cp "${DEV_DIR}/vendor/"*.tar.gz "${RELEASE_DIR}/vendor/" 2>/dev/null || true
    log_ok "vendor/ 复制完成"
  fi

  echo
}

# ============ 复制文档 ============

copy_docs() {
  log_step 6 "复制文档"

  # 根目录文档
  for f in README.md CHANGELOG.md LICENSE PUBLISH.md; do
    if [ -f "${DEV_DIR}/${f}" ]; then
      cp "${DEV_DIR}/${f}" "${RELEASE_DIR}/"
    fi
  done

  # docs/
  if [ -d "${DEV_DIR}/docs" ]; then
    mkdir -p "${RELEASE_DIR}/docs"
    for f in ARCHITECTURE.md DEPLOY.md DEPLOY_QUICK.md EVOLUTION.md GETTING_STARTED.md; do
      if [ -f "${DEV_DIR}/docs/${f}" ]; then
        cp "${DEV_DIR}/docs/${f}" "${RELEASE_DIR}/docs/"
      fi
    done

    # docs/release/
    if [ -d "${DEV_DIR}/docs/release" ]; then
      cp -r "${DEV_DIR}/docs/release" "${RELEASE_DIR}/docs/"
    fi
  fi

  # releases/
  if [ -d "${DEV_DIR}/releases" ]; then
    cp -r "${DEV_DIR}/releases" "${RELEASE_DIR}/"
  fi

  log_ok "文档复制完成"
  echo
}

# ============ 复制配置文件 ============

copy_configs() {
  log_step 7 "复制配置文件"

  for f in package.json tsconfig.json biome.json vitest.config.ts .gitignore; do
    if [ -f "${DEV_DIR}/${f}" ]; then
      cp "${DEV_DIR}/${f}" "${RELEASE_DIR}/"
    fi
  done

  log_ok "配置文件复制完成"
  echo
}

# ============ 安全检查：排除敏感文件 ============

security_check() {
  log_info "安全检查：排除敏感文件..."

  local found=false
  local sensitive_patterns=(
    "AGENTS.md"
    "BRIEFING.md"
    "GOALS.md"
    "METHODOLOGY.md"
    "PROGRESS.md"
    "TEST_PLAN.md"
    "ANALYSIS_UPSP_ZETTELKASTEN.md"
    ".env"
    "*.db"
    "*.log"
    "plans/"
    "tests/"
    "coverage/"
    "node_modules/"
    ".openclaw/"
    ".kimi/"
  )

  for pattern in "${sensitive_patterns[@]}"; do
    if find "$RELEASE_DIR" -name "$pattern" -o -path "*/$pattern" 2>/dev/null | grep -q .; then
      log_err "发现敏感文件: $pattern"
      found=true
    fi
  done

  if [ "$found" = true ]; then
    log_err "安全检查未通过！请检查发布包内容。"
    exit 1
  fi

  log_ok "安全检查通过，未发现敏感文件"
  echo
}

# ============ 生成发布摘要 ============

print_summary() {
  local file_count
  file_count=$(find "$RELEASE_DIR" -type f -not -path '*/.git/*' | wc -l)
  local size
  size=$(du -sh "$RELEASE_DIR" 2>/dev/null | cut -f1)
  local src_lines
  src_lines=$(find "$RELEASE_DIR/src" -name '*.ts' -type f -exec cat {} \; 2>/dev/null | wc -l)
  local dist_files
  dist_files=$(find "$RELEASE_DIR/dist" -type f 2>/dev/null | wc -l)

  echo
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                    📦 发布包生成完成                           ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo
  echo "  版本:     ${VERSION}"
  echo "  目录:     ${RELEASE_DIR}"
  echo "  文件数:   ${file_count}"
  echo "  大小:     ${size}"
  echo "  源码行数: ${src_lines}"
  echo "  构建文件: ${dist_files}"
  echo
  echo "  ZK 插件:"
  ls -lh "${RELEASE_DIR}/vendor/"*.tar.gz 2>/dev/null | awk '{print "    " $9 " (" $5 ")"}' || echo "    未包含"
  echo
  echo "  目录结构:"
  find "$RELEASE_DIR" -maxdepth 2 -type d -not -path '*/.git/*' | sort | sed 's|.*open-upsp-release|.|'
  echo
  echo "  下一步:"
  echo "    1. 检查发布包内容: ls -la ${RELEASE_DIR}"
  echo "    2. 更新 releases/RELEASE_NOTES-v${VERSION}.md"
  echo "    3. 确保 Release Notes 中包含 ZK 版本号"
  echo "    4. npm publish --access public"
  echo "    5. 创建 GitHub Release 并上传"
  echo
  echo "  ⚠️  提醒: 发布前请再次阅读 PUBLISH.md 检查清单"
  echo
}

# ============ 主流程 ============

main() {
  banner
  check_prerequisites
  prepare_release_dir
  copy_source
  copy_skill
  copy_scripts_and_vendor
  copy_docs
  copy_configs
  security_check
  print_summary
}

main "$@"
