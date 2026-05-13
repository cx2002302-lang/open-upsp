# open-upsp v0.3.0 — Production Beta

> **Universal Persona Substrate Protocol** — Give your AI a persistent identity.

---

## 🎯 Release Highlights

This is the first **production-grade beta** of open-upsp, featuring a complete dual-skill evolution architecture, bundled Zettelkasten deep-memory plugin, and a full test suite with 207 passing tests.

### Quality Gate — All Green

| Metric | Value | Status |
|--------|-------|--------|
| Unit Tests | **207** passed | ✅ |
| Line Coverage | **94.39%** | ✅ |
| Function Coverage | **97.7%** | ✅ |
| Branch Coverage | **88.47%** | ✅ |
| Lint Errors | **0** (Biome) | ✅ |
| Lint Warnings | **0** (Biome) | ✅ |
| Stress Scenarios | **10/10** passed | ✅ |

---

## ✨ What's New

### 1. Dual-Skill Evolution Architecture

A revolutionary two-layer skill system that separates immutable identity from mutable behavior:

- **`skill/core/`** — Immutable identity files (name, version, base personality). Locked after initialization.
- **`skill/evolvable/`** — Mutable parameters unlocked after **Round ≥ 10** and **Workhood Index ≥ 0.3**
  - `PARAMS.yaml` — User-editable runtime parameters (delta limits, sync thresholds, axis change rounds)
  - `EXTENSIONS.md` — User-defined rule extensions
  - Changes take effect **immediately** without restart

### 2. Zettelkasten One-Click Deployment

The Zettelkasten deep-memory plugin is now **bundled** with open-upsp:

- Located at: `vendor/zettelkasten-plugin-v1.0.0-beta.4.tar.gz`
- Auto-installs on `npm install` with a 10-second countdown prompt
- Uses official `plugins install` mechanism — no workarounds

### 3. Runtime Parameter Loading

Hardcoded values are gone. The system now reads from `PARAMS.yaml`:

- `StateUpdater` reads `limits.state_update.delta_max` instead of hardcoded `5`
- `ContextBuilder` conditionally injects evolution content based on unlock status
- Custom YAML parser — zero additional dependencies

---

## 🔧 Improvements

- **Release Materials** — New `docs/release/` with SHOWCASE.md (10 real CLI demos) and benchmark data
- **Deployment Docs** — `docs/DEPLOY.md` (full guide) and `docs/DEPLOY_QUICK.md` (3-step install)
- **Evolution Docs** — `docs/EVOLUTION.md` explaining the dual-skill mechanism
- **Publish Pipeline** — `PUBLISH.md` checklist + `scripts/publish.sh` auto-packaging
- **ZK Image Optimization** — Plugin assets compressed from 15MB → 594KB (PNG→JPG, 2752px→1200px)

---

## 🛡️ Security & Robustness

- **Graceful Degradation** — ZK database unavailable? Falls back gracefully, no crash
- **Missing File Detection** — Clear error messages when persona files are missing
- **Corrupted State Recovery** — Invalid `state.json` handled without crashing
- **Boundary Testing** — 10KB text, special characters, empty strings all handled
- **Schema Version Check** — Runtime validation of ZK `schema_version`, clear error on mismatch

---

## 📦 Bundled Dependencies

| Component | Version | Location |
|-----------|---------|----------|
| Zettelkasten Plugin | **v1.0.0-beta.4** | `vendor/zettelkasten-plugin-v1.0.0-beta.4.tar.gz` |
| ZK Compatible Schema | **v2.0.0** | (runtime check) |

> ⚠️ **Schema Coupling**: open-upsp queries ZK via read-only SQLite. Hardcoded tables: `zettel_notes`, `zettel_links`, `zettel_tags`, `zettel_note_tags`, `zettel_fts`, `zettel_meta`. ZK schema changes require open-upsp updates.

---

## 🚀 Installation

```bash
npm install -g open-upsp
```

The post-install hook will:
1. Install the open-upsp CLI
2. Integrate OpenClaw Agent Skill (if available)
3. Detect and offer to install Zettelkasten (10s countdown, defaults to install)

### Quick Start

```bash
open-upsp init my-persona    # Create a new persona
open-upsp interact my-persona # Start a conversation
open-upsp inspect my-persona  # View persona state
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Quick Install](docs/DEPLOY_QUICK.md) | 3-step deployment |
| [Full Deploy Guide](docs/DEPLOY.md) | System requirements, troubleshooting, ZK compatibility |
| [Evolution System](docs/EVOLUTION.md) | Dual-skill progressive unlock mechanism |
| [CLI Showcase](docs/release/SHOWCASE.md) | Real CLI output from 10 scenarios |
| [Architecture](docs/ARCHITECTURE.md) | Internal design document |

---

## ⚠️ Known Limitations

- **Windows Native**: Untested on native Windows (WSL recommended)
- **Schema Matching**: `compatibleSchemaVersions` defaults to exact `["2.0.0"]` — ZK minor updates may need manual extension
- **YAML Parser**: Simplified parser — no anchors, aliases, or advanced YAML features. Inline comments not supported (use separate comment lines)

---

## 🙏 Acknowledgments

- Zettelkasten methodology by [Niklas Luhmann](https://en.wikipedia.org/wiki/Zettelkasten)
- Built with [TypeScript](https://www.typescriptlang.org/), [Biome](https://biomejs.dev/), [Vitest](https://vitest.dev/)

---

*Release: v0.3.0 | Date: 2026-05-13 | License: MIT*
