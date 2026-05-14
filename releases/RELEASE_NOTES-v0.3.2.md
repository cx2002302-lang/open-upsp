# Release Notes — open-upsp v0.3.2

**Release Date**: 2026-05-14  
**Previous**: [v0.3.1](https://github.com/cx2002302-lang/open-upsp/releases/tag/v0.3.1)

---

## 🔄 Dependency Update

### Zettelkasten Plugin upgraded to v1.0.0-beta.4 (fixed)

ZK 项目已修复以下 bug，本版本同步更新 bundled ZK plugin：

| ZK Bug | 修复内容 | 状态 |
|---|---|---|
| ZK-BUG-001 | `tools.alsoAllow` 兼容性 — 移除安装脚本中对 alsoAllow 的无效操作 | ✅ Fixed |
| ZK-BUG-002 | `SKILL.md` 缺少 YAML frontmatter — 添加 OpenClaw 兼容的 frontmatter | ✅ Fixed |
| ZK-BUG-003 | 部署不稳定 — 修复 gateway 启动时的配置验证问题 | ✅ Fixed |

** bundled 包**: `vendor/zettelkasten-plugin-1.0.0-beta.4-fixed.tar.gz`

---

## 📦 Files Changed

- `vendor/zettelkasten-plugin-1.0.0-beta.4-fixed.tar.gz` — **更新** ZK plugin 到修复版
- `skill/SKILL.md` — 更新 ZK 依赖版本标注
- `skill/core/SKILL.md` — 版本号 0.3.1 → 0.3.2
- `skill/core/RULES.md` — 版本号 0.3.1 → 0.3.2
- `skill/evolvable/EVOLUTION.md` — 版本号 0.3.1 → 0.3.2
- `skill/manifest.json` — 版本号 0.3.1 → 0.3.2
- `package.json` / `package-lock.json` — 版本号 0.3.1 → 0.3.2
- 6 个测试文件 — 版本号同步

---

## 🧪 Quality Gates

| Metric | v0.3.1 | v0.3.2 |
|---|---|---|
| Tests | 207 | 207 |
| Test files | 23 | 23 |
| Failures | 0 | 0 |
| ZK Plugin | v1.0.0-beta.4 | v1.0.0-beta.4-fixed |

---

## 🔄 Upgrade

```bash
npm install -g open-upsp
```

postinstall 会自动安装 bundled 的 ZK plugin 修复版。
