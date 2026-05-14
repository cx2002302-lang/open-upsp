# Release Notes — open-upsp v0.3.1

**Release Date**: 2026-05-14  
**Previous**: [v0.3.0](https://github.com/cx2002302-lang/open-upsp/releases/tag/v0.3.0)

---

## 🐛 Critical Bug Fixes

### OpenClaw Deployment Crash (Fixed)

v0.3.0 deployment could cause the OpenClaw gateway to crash on config hot-reload. Three cascading bugs were identified and fixed:

| Bug | Impact | Fix |
|---|---|---|
| **SKILL.md in wrong location** | OpenClaw scans `skills/<name>/SKILL.md` at the skill root; our file was at `core/SKILL.md` → skill never loaded | Added `skill/SKILL.md` with proper YAML frontmatter as the OpenClaw entry point |
| **Missing YAML frontmatter** | OpenClaw `parseFrontmatter()` requires `name` + `description` in `---` block; missing frontmatter caused `return null` → skill silently skipped | Added frontmatter: `name: open-upsp`, `description: Zettelkasten knowledge graph...` |
| **Invalid `tools.alsoAllow` entry** | `postinstall.js` and `install.sh` added `"open-upsp"` (a skill ID) to `tools.alsoAllow`, which only accepts **tool names**. OpenClaw tool policy validation rejected the unknown entry during config reload → gateway exit | Removed `alsoAllow` manipulation from install scripts. `alsoAllow` must contain actual tool names (e.g. `zk_create_note`), not skill IDs |

### Verification

- ✅ 3/3 uninstall → install → restart cycles passed with zero failures
- ✅ Gateway starts normally after deployment
- ✅ Skill correctly loaded as `✓ ready` in `openclaw skills list`
- ✅ 207 tests, 0 failures

---

## 📁 Files Changed

- `skill/SKILL.md` — **new** OpenClaw-compatible skill entry with YAML frontmatter
- `scripts/postinstall.js` — removed invalid `alsoAllow` manipulation
- `scripts/install.sh` — removed invalid `alsoAllow` manipulation
- `skill/core/SKILL.md` — version bump
- `skill/core/RULES.md` — version bump
- `skill/evolvable/EVOLUTION.md` — version bump
- `skill/manifest.json` — version bump

---

## 🔄 Upgrade from v0.3.0

### Existing deployments (manual fix)

```bash
# 1. Fix alsoAllow (remove invalid skill ID)
python3 -c "
import json
with open('\$HOME/.openclaw/openclaw.json') as f:
    cfg = json.load(f)
if 'tools' in cfg and 'alsoAllow' in cfg['tools']:
    cfg['tools']['alsoAllow'] = [x for x in cfg['tools']['alsoAllow'] if x not in ('open-upsp', 'zettelkasten')]
with open('\$HOME/.openclaw/openclaw.json', 'w') as f:
    json.dump(cfg, f, indent=2)
print('Fixed')
"

# 2. Ensure SKILL.md is at skill root
cp ~/.openclaw/skills/open-upsp/core/SKILL.md ~/.openclaw/skills/open-upsp/SKILL.md

# 3. Restart gateway
openclaw gateway stop && openclaw gateway start
```

### Fresh install

```bash
npm install -g open-upsp
```

---

## 📊 Quality Gates

| Metric | v0.3.0 | v0.3.1 |
|---|---|---|
| Tests | 207 | 207 |
| Test files | 23 | 23 |
| Failures | 0 | 0 |
| OpenClaw deploy crash | ❌ | ✅ Fixed |
| Skill load on restart | ❌ | ✅ Verified (3/3) |

---

*Full changelog: see [v0.3.0 release notes](RELEASE_NOTES-v0.3.0.md) for feature details.*
