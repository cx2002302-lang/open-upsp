#!/usr/bin/env node
/**
 * open-upsp npm postinstall 钩子
 * 在 `npm install -g open-upsp` 后自动执行，完成 OpenClaw Agent 集成
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKILL_ID = "open-upsp";
const OPENCLAW_DIR = path.join(process.env.HOME || process.env.USERPROFILE || "", ".openclaw");
const OPENCLAW_CONFIG = path.join(OPENCLAW_DIR, "openclaw.json");
const SKILL_DIR = path.join(OPENCLAW_DIR, "skills", SKILL_ID);

const MIN_OPENCLAW_VERSION = "2026.4.24";

function parseOpenClawVersion(output) {
  const match = output.match(/OpenClaw\s+(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

function compareVersion(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

function checkOpenClawVersion() {
  let output;
  try {
    output = execSync("openclaw --version", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
  } catch {
    log("warn", "无法获取 OpenClaw 版本");
    return false;
  }

  const actual = parseOpenClawVersion(output);
  if (!actual) {
    log("warn", `无法解析 OpenClaw 版本: ${output.trim()}`);
    return false;
  }

  const required = parseOpenClawVersion(`OpenClaw ${MIN_OPENCLAW_VERSION}`);
  if (compareVersion(actual, required) < 0) {
    log("warn", `OpenClaw 版本过低: ${actual.join(".")}，需要 >= ${MIN_OPENCLAW_VERSION}`);
    log("info", "  请升级 OpenClaw 后重新运行安装");
    return false;
  }

  log("ok", `OpenClaw v${actual.join(".")} ✓`);
  return true;
}

const COLORS = {
  info: "\x1b[34m",
  ok: "\x1b[32m",
  warn: "\x1b[33m",
  err: "\x1b[31m",
  reset: "\x1b[0m",
};

function log(level, msg) {
  const c = COLORS[level] || "";
  const r = COLORS.reset;
  const label = level === "ok" ? "[OK]" : level === "warn" ? "[WARN]" : level === "err" ? "[ERR]" : "[INFO]";
  console.log(`${c}${label}${r} ${msg}`);
}

function isGlobalInstall() {
  // 检测是否为全局安装：检查当前脚本是否在全局 node_modules 中
  const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  return __dirname.startsWith(globalRoot);
}

function findSkillSource() {
  // 可能的 skill 源路径
  const candidates = [
    path.join(__dirname, "..", "skill"), // 源码/本地安装
    path.join(process.cwd(), "skill"), // 当前工作目录
  ];

  for (const p of candidates) {
    if (fs.existsSync(path.join(p, "SKILL.md"))) {
      return p;
    }
  }
  return null;
}

function backupIfExists(target) {
  if (fs.existsSync(target)) {
    const backup = `${target}.backup.${new Date().toISOString().replace(/[:.]/g, "")}`;
    fs.cpSync(target, backup, { recursive: true });
    log("warn", `已有目录已备份: ${backup}`);
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function installSkill() {
  const src = findSkillSource();
  if (!src) {
    log("warn", "找不到 skill 源目录，跳过 Skill 安装");
    log("info", "  如需 Agent 集成，请手动复制 skill/ 到 ~/.openclaw/skills/open-upsp/");
    return false;
  }

  log("info", `Skill 源: ${src}`);
  backupIfExists(SKILL_DIR);
  fs.mkdirSync(path.dirname(SKILL_DIR), { recursive: true });
  fs.cpSync(src, SKILL_DIR, { recursive: true });
  log("ok", `Skill 已安装到 ${SKILL_DIR}`);
  return true;
}

function configureOpenClaw() {
  if (!fs.existsSync(OPENCLAW_CONFIG)) {
    log("warn", "OpenClaw 配置文件不存在，跳过配置");
    return false;
  }

  // 备份
  const backup = `${OPENCLAW_CONFIG}.backup.${new Date().toISOString().replace(/[:.]/g, "")}`;
  fs.copyFileSync(OPENCLAW_CONFIG, backup);
  log("info", `配置已备份: ${backup}`);

  let data;
  try {
    const raw = fs.readFileSync(OPENCLAW_CONFIG, "utf8");
    data = JSON.parse(raw);
  } catch (e) {
    log("err", `无法解析 openclaw.json: ${e.message}`);
    return false;
  }

  // 确保结构存在
  if (!data.agents) data.agents = {};
  if (!data.agents.defaults) data.agents.defaults = {};
  if (!Array.isArray(data.agents.defaults.skills)) {
    data.agents.defaults.skills = [];
  }
  // 去重追加 skill
  let modified = false;
  if (!data.agents.defaults.skills.includes(SKILL_ID)) {
    data.agents.defaults.skills.push(SKILL_ID);
    log("info", `已添加 ${SKILL_ID} 到 agents.defaults.skills`);
    modified = true;
  }

  if (!modified) {
    log("info", `${SKILL_ID} 已在配置中，无需修改`);
  }

  try {
    fs.writeFileSync(OPENCLAW_CONFIG, JSON.stringify(data, null, 2) + "\n");
    log("ok", "OpenClaw 配置已更新");
    return true;
  } catch (e) {
    log("err", `写入配置失败: ${e.message}`);
    return false;
  }
}

function verify() {
  let ok = true;

  if (fs.existsSync(SKILL_DIR)) {
    log("ok", `Skill 目录: ${SKILL_DIR}`);
  } else {
    log("warn", "Skill 目录未找到");
    ok = false;
  }

  if (fs.existsSync(OPENCLAW_CONFIG)) {
    try {
      const data = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, "utf8"));
      const hasSkill = data.agents?.defaults?.skills?.includes(SKILL_ID);
      if (hasSkill) {
        log("ok", "OpenClaw skill 已激活");
      } else {
        log("warn", "OpenClaw skill 可能未正确激活");
        ok = false;
      }
    } catch {
      log("warn", "无法验证 OpenClaw 配置");
    }
  }

  return ok;
}

// ============ 主流程 ============

function installZkPlugin() {
  const vendorDir = path.join(__dirname, "..", "vendor");
  if (!fs.existsSync(vendorDir)) {
    log("info", "vendor/ 目录不存在，跳过 ZK 检测");
    return;
  }

  const archives = fs.readdirSync(vendorDir).filter((f) => f.startsWith("zettelkasten-plugin-") && f.endsWith(".tar.gz"));
  if (archives.length === 0) {
    log("info", "未找到 ZK 插件包，跳过");
    return;
  }

  const archive = path.join(vendorDir, archives[0]);

  // 检测 ZK 是否已安装
  const zkPluginDir = path.join(OPENCLAW_DIR, "zettelkasten-plugin");
  if (fs.existsSync(path.join(zkPluginDir, "plugin", "openclaw.plugin.json"))) {
    log("info", "ZK 插件已安装，跳过");
    return;
  }

  // 检测 openclaw 是否可用
  try {
    execSync("which openclaw", { stdio: "ignore" });
  } catch {
    log("warn", "openclaw CLI 不可用，跳过 ZK 安装");
    return;
  }

  log("info", "正在安装 Zettelkasten 插件（非交互模式，默认安装）...");
  try {
    execSync(`openclaw plugins install "${archive}"`, { stdio: "inherit" });
    execSync("openclaw plugins enable zettelkasten", { stdio: "ignore" });
    log("ok", "ZK 插件安装成功");
  } catch (e) {
    log("warn", `ZK 插件安装失败: ${e.message}`);
    log("info", "  可稍后手动运行: openclaw plugins install <archive>");
  }
}

function ensureCliInPath() {
  // 找到全局 npm bin 目录，创建 CLI symlink
  let globalBin;
  try {
    globalBin = execSync("npm bin -g", { encoding: "utf8" }).trim();
  } catch {
    // Fallback: npm bin -g may not work on all npm versions
    try {
      const prefix = execSync("npm prefix -g", { encoding: "utf8" }).trim();
      globalBin = path.join(prefix, "bin");
    } catch {
      log("warn", "无法获取 npm global bin 目录，跳过 CLI symlink");
      return false;
    }
  }

  const cliSource = path.join(__dirname, "..", "dist", "cli.js");
  if (!fs.existsSync(cliSource)) {
    log("warn", `CLI 源文件不存在: ${cliSource}，跳过 symlink`);
    log("info", "  提示: 如需 CLI，请先运行 npm run build");
    return false;
  }

  // Ensure CLI source is executable (dist/ is gitignored, build may not set +x)
  try {
    fs.chmodSync(cliSource, 0o755);
    log("ok", `CLI 源文件已设为可执行: ${cliSource}`);
  } catch (e) {
    log("warn", `设置 CLI 执行权限失败: ${e.message}`);
  }

  const symlinkOpenUpsp = path.join(globalBin, "open-upsp");
  const symlinkUpsp = path.join(globalBin, "upsp");

  try {
    if (fs.existsSync(symlinkOpenUpsp)) fs.unlinkSync(symlinkOpenUpsp);
    fs.symlinkSync(cliSource, symlinkOpenUpsp);
    log("ok", `CLI symlink 已创建: ${symlinkOpenUpsp} → ${cliSource}`);
  } catch (e) {
    log("warn", `创建 open-upsp symlink 失败: ${e.message}`);
  }

  try {
    if (fs.existsSync(symlinkUpsp)) fs.unlinkSync(symlinkUpsp);
    fs.symlinkSync(cliSource, symlinkUpsp);
    log("ok", `CLI symlink 已创建: ${symlinkUpsp} → ${cliSource}`);
  } catch (e) {
    log("warn", `创建 upsp symlink 失败: ${e.message}`);
  }

  // 同时尝试添加到 ~/.local/bin（备用 PATH）
  const localBin = path.join(process.env.HOME || "", ".local", "bin");
  if (fs.existsSync(path.dirname(localBin))) {
    fs.mkdirSync(localBin, { recursive: true });
    try {
      const localSymlink = path.join(localBin, "open-upsp");
      if (fs.existsSync(localSymlink)) fs.unlinkSync(localSymlink);
      fs.symlinkSync(cliSource, localSymlink);
      log("ok", `CLI symlink 已创建: ${localSymlink} → ${cliSource}`);
    } catch (e) {
      // ignore
    }
  }

  return true;
}

function main() {
  // 仅全局安装时执行
  if (!isGlobalInstall()) {
    log("info", "本地安装 detected，跳过 OpenClaw 集成（全局安装时自动执行）");
    return;
  }

  log("info", "open-upsp postinstall — 正在配置 OpenClaw Agent 集成...");

  // 确保 CLI 在 PATH 中
  ensureCliInPath();

  // 检测 OpenClaw
  if (!fs.existsSync(OPENCLAW_CONFIG)) {
    log("warn", "OpenClaw 未检测到，跳过 Agent 集成");
    log("info", "  CLI 工具已安装。如需 Agent 集成，请先安装 OpenClaw >= 2026.4.24。");
    return;
  }

  // 检查 OpenClaw 版本
  if (!checkOpenClawVersion()) {
    log("warn", "OpenClaw 版本不满足要求，跳过 Agent 集成");
    return;
  }

  installSkill();
  configureOpenClaw();
  installZkPlugin();

  if (verify()) {
    console.log();
    log("ok", "🎉 OpenClaw Agent 集成完成！");
    console.log();
    console.log("  快速开始:");
    console.log("    open-upsp init          # 创建默认位格");
    console.log("    open-upsp status        # 查看位格状态");
    console.log();
  } else {
    log("warn", "集成验证未完全通过，请查看上方信息");
  }
}

main();
