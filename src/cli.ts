#!/usr/bin/env node

import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { program } from "commander";
import { SQLiteBridge } from "./bridge/sqlite-bridge.js";

import { getConfig, getPersonasDir, resolvePath, saveConfig } from "./config.js";
import { ContextBuilder } from "./context/builder.js";
import { SessionDistiller } from "./context/distiller.js";
import { StateUpdater } from "./context/state-updater.js";
import { PersonaSync } from "./context/sync.js";
import { PersonaLoader } from "./persona/loader.js";
import { PersonaSaver } from "./persona/saver.js";
import { ensureDir } from "./utils/file.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

program
  .name("open-upsp")
  .description("Universal Persona Substrate Protocol CLI")
  .version(pkg.version);

// ============================================================================
// init
// ============================================================================

program
  .command("init")
  .description("Initialize a new persona")
  .option("-p, --persona <id>", "Persona ID", "default")
  .option(
    "-t, --template <name>",
    "Template name (default/developer/researcher/creator/companion)",
    "default",
  )
  .option("-d, --dir <path>", "Custom personas directory")
  .action((options) => {
    try {
      const personasDir = options.dir ? resolvePath(options.dir) : getPersonasDir();
      const personaDir = join(personasDir, options.persona);

      if (existsSync(personaDir)) {
        console.error(`Error: Persona "${options.persona}" already exists at ${personaDir}`);
        process.exit(1);
      }

      const templateDir = join(__dirname, "..", "templates", options.template);
      if (!existsSync(templateDir)) {
        console.error(
          `Error: Template "${options.template}" not found. Available: default, developer, researcher, creator, companion`,
        );
        process.exit(1);
      }

      copyDir(templateDir, personaDir);

      const statePath = join(personaDir, "state.json");
      const state = JSON.parse(readFileSync(statePath, "utf-8"));
      state.personaId = options.persona;
      writeFileSync(statePath, JSON.stringify(state, null, 2));

      console.log(
        `Created persona "${options.persona}" from template "${options.template}" at ${personaDir}`,
      );
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ============================================================================
// status
// ============================================================================

program
  .command("status")
  .description("Show persona status")
  .option("-p, --persona <id>", "Persona ID")
  .option("-d, --dir <path>", "Custom personas directory")
  .action((options) => {
    try {
      const personasDir = options.dir ? resolvePath(options.dir) : getPersonasDir();
      const personaId = options.persona ?? getConfig().defaultPersona;

      const loader = new PersonaLoader(personasDir);
      const persona = loader.load(personaId);
      const s = persona.state;

      console.log(`Persona: ${persona.core.frontmatter.name} (${persona.id})`);
      console.log(
        `Round: ${s.round} | SpeedWheel: ${s.speedWheel} | Workhood: ${s.workhoodIndex.toFixed(2)}`,
      );
      console.log(`Sessions: ${s.sessionCount} | Updated: ${s.lastUpdated}`);
      console.log(``);
      console.log("Dynamic Axes:");
      console.log(`  valence:  ${s.dynamicAxes.valence.toString().padStart(3)} (calm←→warm)`);
      console.log(`  arousal:  ${s.dynamicAxes.arousal.toString().padStart(3)} (low←→high)`);
      console.log(
        `  focus:    ${s.dynamicAxes.focus.toString().padStart(3)} (distracted←→focused)`,
      );
      console.log(`  mood:     ${s.dynamicAxes.mood.toString().padStart(3)} (sad←→excited)`);
      console.log(`  humor:    ${s.dynamicAxes.humor.toString().padStart(3)} (boring←→funny)`);
      console.log(`  safety:   ${s.dynamicAxes.safety.toString().padStart(3)} (alert←→relaxed)`);
      console.log(``);
      console.log(`STM entries: ${persona.stm.entries.length}`);
      console.log(`LTM entries: ${persona.ltm.entries.length}`);
      console.log(`Relations: ${persona.relation.entries.length}`);
      console.log(`Terms: ${persona.docs.terms.length}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        console.error(`Error: Persona not found. Run "open-upsp init" first.`);
      } else {
        console.error("Error:", err instanceof Error ? err.message : String(err));
      }
      process.exit(1);
    }
  });

// ============================================================================
// search
// ============================================================================

program
  .command("search <query>")
  .description("Search Zettelkasten knowledge base")
  .option("-l, --limit <n>", "Max results", "10")
  .action((query, options) => {
    try {
      const config = getConfig();
      const dbPath = resolvePath(config.zettelkasten.databasePath);

      const bridge = new SQLiteBridge({
        dbPath,
        compatibleSchemaVersions: config.zettelkasten.compatibleSchemaVersions,
      });

      const results = bridge.searchNotes(query, Number.parseInt(options.limit, 10));

      if (results.length === 0) {
        console.log(`No results for: "${query}"`);
        return;
      }

      console.log(`Found ${results.length} result(s) for: "${query}"\n`);

      for (const result of results) {
        const note = result.note;
        console.log(`[${note.id}] ${note.title} | ${note.folder} | ${note.status}`);
        if (note.tags.length > 0) {
          console.log(`  Tags: ${note.tags.join(", ")}`);
        }
        if (result.snippet) {
          console.log(`  ${result.snippet}`);
        }
        console.log("");
      }

      bridge.close();
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        console.error(`Error: Zettelkasten database not found. Run "zk init" first.`);
      } else {
        console.error("Error:", err instanceof Error ? err.message : String(err));
      }
      process.exit(1);
    }
  });

// ============================================================================
// context
// ============================================================================

program
  .command("context")
  .description("Build full context (persona + knowledge) for AI prompt")
  .option("-p, --persona <id>", "Persona ID")
  .option("-d, --dir <path>", "Custom personas directory")
  .option("-q, --query <text>", "Search query to include knowledge")
  .option("--no-memory", "Exclude STM from context")
  .option("--no-links", "Exclude relation matrix from context")
  .action((options) => {
    try {
      const config = getConfig();
      const personasDir = options.dir ? resolvePath(options.dir) : getPersonasDir();
      const personaId = options.persona ?? config.defaultPersona;

      const loader = new PersonaLoader(personasDir);
      const persona = loader.load(personaId);

      let bridge: SQLiteBridge | undefined;
      let builder: ContextBuilder;

      if (config.zettelkasten.enabled) {
        const dbPath = resolvePath(config.zettelkasten.databasePath);
        bridge = new SQLiteBridge({
          dbPath,
          compatibleSchemaVersions: config.zettelkasten.compatibleSchemaVersions,
        });
        builder = new ContextBuilder(bridge);
      } else {
        builder = new ContextBuilder({
          searchNotes: () => [],
          getNote: () => null,
          getBacklinks: () => [],
          findPath: () => null,
          getNetworkGraph: () => ({ nodes: [], edges: [] }),
        });
      }

      const context = builder.build(persona, {
        query: options.query,
        includeMemory: options.memory,
        includeLinks: options.links,
      });

      console.log(context);

      bridge?.close();
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ============================================================================
// state
// ============================================================================

program
  .command("state")
  .description("View or update persona state")
  .option("-p, --persona <id>", "Persona ID")
  .option("-d, --dir <path>", "Custom personas directory")
  .option("--round <n>", "Update round number (+n, -n, or absolute)")
  .option("--valence <n>", "Update valence (0-100)")
  .option("--arousal <n>", "Update arousal (0-100)")
  .option("--focus <n>", "Update focus (0-100)")
  .option("--mood <n>", "Update mood (0-100)")
  .option("--humor <n>", "Update humor (0-100)")
  .option("--safety <n>", "Update safety (0-100)")
  .action((options) => {
    try {
      const personasDir = options.dir ? resolvePath(options.dir) : getPersonasDir();
      const personaId = options.persona ?? getConfig().defaultPersona;

      const loader = new PersonaLoader(personasDir);
      const saver = new PersonaSaver(personasDir);
      const persona = loader.load(personaId);

      const hasUpdate =
        options.round !== undefined ||
        options.valence !== undefined ||
        options.arousal !== undefined ||
        options.focus !== undefined ||
        options.mood !== undefined ||
        options.humor !== undefined ||
        options.safety !== undefined;

      if (hasUpdate) {
        if (options.round !== undefined) {
          const roundStr = String(options.round);
          if (roundStr.startsWith("+") || roundStr.startsWith("-")) {
            persona.state.round += Number.parseInt(roundStr, 10);
          } else {
            persona.state.round = Number.parseInt(roundStr, 10);
          }
        }

        const axes = ["valence", "arousal", "focus", "mood", "humor", "safety"] as const;
        for (const axis of axes) {
          if (options[axis] !== undefined) {
            const value = Number.parseInt(options[axis], 10);
            if (value < 0 || value > 100) {
              console.error(`Error: ${axis} must be between 0 and 100`);
              process.exit(1);
            }
            persona.state.dynamicAxes[axis] = value;
          }
        }

        persona.state.lastUpdated = new Date().toISOString();
        saver.save(persona);

        console.log("State updated");
        console.log(`  Round: ${persona.state.round}`);
        console.log(`  Updated at: ${persona.state.lastUpdated}`);
      } else {
        const s = persona.state;
        const da = s.dynamicAxes;
        console.log(`State for "${personaId}":`);
        console.log(
          `  Round: ${s.round} | SpeedWheel: ${s.speedWheel} | Workhood: ${s.workhoodIndex.toFixed(2)}`,
        );
        console.log(`  valence: ${da.valence} | arousal: ${da.arousal} | focus: ${da.focus}`);
        console.log(`  mood: ${da.mood} | humor: ${da.humor} | safety: ${da.safety}`);
        console.log(`  Last updated: ${s.lastUpdated}`);
      }
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ============================================================================
// distill — 会话蒸馏
// ============================================================================

program
  .command("distill")
  .description("Distill session text into memory entries and state changes")
  .option("-p, --persona <id>", "Persona ID")
  .option("-d, --dir <path>", "Custom personas directory")
  .option("-f, --file <path>", "Session log file path")
  .option("-t, --text <text>", "Session text directly")
  .action((options) => {
    try {
      let sessionText = "";
      if (options.file) {
        sessionText = readFileSync(resolvePath(options.file), "utf-8");
      } else if (options.text) {
        sessionText = options.text;
      } else {
        console.error("Error: Provide --file or --text");
        process.exit(1);
      }

      const distiller = new SessionDistiller();
      const result = distiller.distill(sessionText);

      console.log("Distilled Entries:");
      for (const entry of result.entries) {
        console.log(
          `  [w:${entry.weight}] ${entry.content.slice(0, 60)}${entry.content.length > 60 ? "..." : ""}`,
        );
      }

      if (Object.keys(result.stateDelta).length > 0) {
        console.log("\nState Changes:");
        for (const [axis, delta] of Object.entries(result.stateDelta)) {
          console.log(`  ${axis}: ${delta > 0 ? "+" : ""}${delta}`);
        }
      }
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ============================================================================
// sync — 同步到 ZK
// ============================================================================

program
  .command("sync")
  .description("Sync persona STM entries to Zettelkasten")
  .option("-p, --persona <id>", "Persona ID")
  .option("-d, --dir <path>", "Custom personas directory")
  .option("--threshold <n>", "Weight threshold", "3")
  .option("--dry-run", "Show what would be synced without writing")
  .action(async (options) => {
    try {
      const personasDir = options.dir ? resolvePath(options.dir) : getPersonasDir();
      const personaId = options.persona ?? getConfig().defaultPersona;
      const threshold = Number.parseInt(options.threshold, 10);

      const loader = new PersonaLoader(personasDir);
      const persona = loader.load(personaId);

      const candidates = persona.stm.entries.filter((e) => e.weight >= threshold);

      if (candidates.length === 0) {
        console.log("No entries to sync (threshold not met)");
        return;
      }

      console.log(`Found ${candidates.length} entries to sync (weight >= ${threshold})\n`);

      if (options.dryRun) {
        for (const entry of candidates) {
          console.log(
            `  [w:${entry.weight}] ${entry.content.slice(0, 60)}${entry.content.length > 60 ? "..." : ""}`,
          );
        }
        console.log("\nDry run — no changes made");
        return;
      }

      const sync = new PersonaSync({ weightThreshold: threshold });
      const result = await sync.syncStm(persona);

      console.log(`Synced: ${result.synced} | Failed: ${result.failed}`);
      if (result.noteIds.length > 0) {
        console.log(`Note IDs: ${result.noteIds.join(", ")}`);
      }
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ============================================================================
// session-end — 会话结束流程
// ============================================================================

program
  .command("session-end")
  .description("End-of-session workflow: distill + update state + sync")
  .option("-p, --persona <id>", "Persona ID")
  .option("-d, --dir <path>", "Custom personas directory")
  .option("-f, --file <path>", "Session log file path")
  .option("-t, --text <text>", "Session text directly")
  .option("--no-sync", "Skip ZK sync")
  .action(async (options) => {
    try {
      const personasDir = options.dir ? resolvePath(options.dir) : getPersonasDir();
      const personaId = options.persona ?? getConfig().defaultPersona;

      let sessionText = "";
      if (options.file) {
        sessionText = readFileSync(resolvePath(options.file), "utf-8");
      } else if (options.text) {
        sessionText = options.text;
      } else {
        console.error("Error: Provide --file or --text");
        process.exit(1);
      }

      const loader = new PersonaLoader(personasDir);
      const saver = new PersonaSaver(personasDir);
      const persona = loader.load(personaId);

      console.log(`=== Session End: ${persona.core.frontmatter.name} ===\n`);

      // 1. 蒸馏
      const distiller = new SessionDistiller();
      const knownEntities = persona.relation.entries.map((e) => e.entity);
      const distillResult = distiller.distill(sessionText, knownEntities);

      console.log(`Distilled ${distillResult.entries.length} entries`);
      for (const entry of distillResult.entries) {
        persona.stm.entries.push(entry);
      }

      // 1.5 更新关系矩阵
      if (distillResult.relationDelta.size > 0) {
        for (const [entity, delta] of distillResult.relationDelta) {
          const existing = persona.relation.entries.find((e) => e.entity === entity);
          if (existing) {
            existing.resonance = Math.max(0, Math.min(1, existing.resonance + delta));
          } else if (delta > 0) {
            // 新实体，只有正向 delta 才创建
            persona.relation.entries.push({
              entity,
              resonance: Math.min(0.1, delta),
              type: "concept",
              description: `Auto-detected from session`,
            });
          }
        }
        console.log(`Relation matrix updated (${distillResult.relationDelta.size} entities)`);
      }

      // 2. 更新状态
      const updater = new StateUpdater();
      const updateResult = updater.update(persona, distillResult.stateDelta);

      if (updateResult.updated) {
        console.log("State updated:");
        for (const change of updateResult.changes) {
          console.log(`  ${change.axis}: ${change.from} → ${change.to}`);
        }
        console.log(`  Round: ${persona.state.round}`);
        if (updateResult.speedWheelChanged) {
          console.log(`  SpeedWheel: ${persona.state.speedWheel}`);
        }
      }

      // 3. 保存位格
      saver.save(persona);
      console.log("Persona saved");

      // 4. 同步到 ZK
      if (options.sync !== false) {
        const sync = new PersonaSync();
        const syncResult = await sync.syncStm(persona);
        console.log(`Synced to ZK: ${syncResult.synced} entries`);
      }

      console.log("\n=== Session End Complete ===");
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ============================================================================
// config — 配置管理
// ============================================================================

program
  .command("config")
  .description("Manage configuration")
  .option("-g, --get <key>", "Get config value")
  .option("-s, --set <key>", "Set config value")
  .option("-v, --value <val>", "Value to set (used with --set)")
  .action((options) => {
    try {
      const config = getConfig();

      if (options.get) {
        const key = options.get as string;
        const value = getNestedValue(config, key);
        console.log(value ?? "(undefined)");
        return;
      }

      if (options.set) {
        if (options.value === undefined) {
          console.error("Error: --value required with --set");
          process.exit(1);
        }
        const key = options.set as string;
        const value = parseValue(options.value as string);
        setNestedValue(config, key, value);
        saveConfig(config);
        console.log(`Set ${key} = ${JSON.stringify(value)}`);
        return;
      }

      // 无参数时显示全部配置
      console.log(JSON.stringify(config, null, 2));
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ============================================================================
// 辅助函数
// ============================================================================

function copyDir(src: string, dest: string): void {
  ensureDir(dest);
  cpSync(src, dest, { recursive: true });
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object" || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function parseValue(val: string): unknown {
  if (val === "true") return true;
  if (val === "false") return false;
  if (val === "null") return null;
  if (val === "undefined") return undefined;
  const num = Number(val);
  if (!Number.isNaN(num) && val !== "" && val !== " ") return num;
  try {
    return JSON.parse(val);
  } catch {
    /* ignore */
  }
  return val;
}

// ============================================================================
// 启动
// ============================================================================

program.parse();
