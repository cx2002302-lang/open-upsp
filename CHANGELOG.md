# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.3.0] — 2026-05-13 — Production Beta

### ✨ Added

- **Dual-Skill Evolution Architecture** — Revolutionary two-layer skill system separating immutable identity from mutable behavior
  - `skill/core/` — Immutable identity files (name, version, base personality)
  - `skill/evolvable/` — Mutable parameters unlocked after Round ≥ 10 and Workhood Index ≥ 0.3
  - `PARAMS.yaml` — User-editable runtime parameters (delta limits, sync thresholds, axis change rounds)
  - `EXTENSIONS.md` — User-defined rule extensions
- **Zettelkasten One-Click Deployment** — Plugin bundled in `vendor/` with auto-install countdown
- **Runtime Parameter Loading** — Hardcoded values replaced with YAML-driven configuration
  - `StateUpdater` reads `limits.state_update.delta_max` from `PARAMS.yaml`
  - `ContextBuilder` conditionally injects evolution content based on unlock status
  - Custom YAML parser with zero additional dependencies
- **Session Distiller** (`open-upsp distill`) — Rule-based lightweight distillation with weight 1-5 grading
- **Auto State Update** (`open-upsp state update`) — Dynamic six-axis ±delta/round auto-adjustment
- **STM → ZK Sync** (`open-upsp sync`) — STM entries with weight ≥ threshold sync as FLEETING notes
- **Session End** (`open-upsp session-end`) — One-command distill + state update + sync
- **Multi-Persona Templates** — Built-in 5 templates: `default`, `professional`, `emotional`, `creative`, `companion`
- **Relation Matrix Auto-Evolution** — `session-end` detects entity mention frequency, updates resonance
- **Relation-Aware Retrieval** — `ContextBuilder` ranks notes by resonance from relation matrix
- **Link Weight Mapping** — `CliBridge.createNote` supports `resonance` and `relationType` parameters
- **Config Management CLI** — `open-upsp config get/set`
- **Speed Wheel Cycle** — `StateUpdater` infers speedWheel from round number (256-round cycle)
- **Publish Pipeline** — `scripts/publish.sh` auto-packaging with security checks

### 📦 Bundled

- **Zettelkasten Plugin v1.0.0-beta.4** (compressed to 594KB, Schema v2.0.0)

### 🛡️ Security & Robustness

- Graceful degradation when ZK database unavailable
- Clear error messages for missing persona files
- Corrupted `state.json` handled without crashing
- Boundary testing: 10KB text, special characters, empty strings
- Runtime ZK schema version validation

### 📚 Documentation

- `docs/DEPLOY.md` — Full deployment guide
- `docs/DEPLOY_QUICK.md` — 3-step quick install
- `docs/EVOLUTION.md` — Dual-skill evolution mechanism
- `docs/release/SHOWCASE.md` — 10 real CLI demos
- `PUBLISH.md` — Release checklist for maintainers

### ⚠️ Known Limitations

- Windows native environment untested (WSL recommended)
- `compatibleSchemaVersions` defaults to exact `["2.0.0"]`
- Simplified YAML parser — no anchors, aliases, or inline comments
- Relation matrix auto-evolution based on mention frequency only (no semantic analysis)
- Multi-template switching requires manual execution (no auto scene detection)

---

## [v0.2.0] — 2026-05-12 — Phase 2: Bidirectional Write + Skill

### ✨ Added

- **Session Distiller** (`open-upsp distill`) — Rule-based memory extraction
- **Auto State Update** — Dynamic six-axis ±5/round with boundary protection
- **STM → ZK Sync** — Weight-filtered STM to FLEETING note synchronization
- **Session End Command** — Combined distill + state update + sync
- **OpenClaw Skill** — SKILL.md / PROMPT.md / RULES.md for persona context injection
- **CliBridge** — ZK write via `openclaw zk new` CLI subprocess
- **StateUpdater** — Six-axis auto-adjustment with speed wheel cycle
- **PersonaSync** — STM filtering + CliBridge write + deduplication

### 📊 Quality

- 7/7 tests passed (100%)
- TypeScript: 0 errors
- Biome: clean
- ZK write verified in database

---

## [v0.1.0] — 2026-05-12 — Phase 1: Read-Only Bridge + Persona Skeleton

### ✨ Added

- **Persona Init** (`open-upsp init`) — Create 7-file persona from template
- **Status View** (`open-upsp status`) — View current persona state
- **Knowledge Search** (`open-upsp search`) — Full-text ZK search (FTS5 / LIKE fallback)
- **Context Build** (`open-upsp context`) — Assemble identity + state + memory + knowledge prompt
- **State Update** (`open-upsp state update`) — Manual round and axis adjustment
- **7-File Schema** — Unified camelCase, Zod validation, gray-matter parsing
- **PersonaLoader/Saver** — Complete load/validate/save pipeline
- **SQLiteBridge** — Read-only ZK bridge with schema detection and retry
- **ContextBuilder** — Multi-dimension context assembly
- **CLI Skeleton** — Commander framework with 6 subcommands

### 📊 Quality

- 7/7 tests passed (100%)
- TypeScript: 0 errors
- Biome: clean
- Zero ZK intrusion (read-only SQLite + CLI subprocess only)

---

[Unreleased]: https://github.com/cx2002302-lang/open-upsp/compare/v0.3.0...HEAD
[v0.3.0]: https://github.com/cx2002302-lang/open-upsp/releases/tag/v0.3.0
[v0.2.0]: https://github.com/cx2002302-lang/open-upsp/releases/tag/v0.2.0
[v0.1.0]: https://github.com/cx2002302-lang/open-upsp/releases/tag/v0.1.0
