#!/usr/bin/env node

import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { program } from "commander";
import { SQLiteBridge } from "./bridge/sqlite-bridge.js";
import { getConfig, getPersonasDir, resolvePath } from "./config.js";
import { ContextBuilder } from "./context/builder.js";
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
// init — 初始化位格
// ============================================================================

program
  .command("init")
  .description("Initialize a new persona")
  .option("-p, --persona <id>", "Persona ID", "default")
  .option("-d, --dir <path>", "Custom personas directory")
  .action((options) => {
    try {
      const personasDir = options.dir ? resolvePath(options.dir) : getPersonasDir();
      const personaDir = join(personasDir, options.persona);

      if (existsSync(personaDir)) {
        console.error(`Error: Persona "${options.persona}" already exists at ${personaDir}`);
        process.exit(1);
      }

      // 从模板复制（编译后 dist/cli.js 的上级目录包含 templates/）
      const templateDir = join(__dirname, "..", "templates", "default");
      copyDir(templateDir, personaDir);

      // 更新 state.json 中的 personaId
      const statePath = join(personaDir, "state.json");
      const state = JSON.parse(readFileSync(statePath, "utf-8"));
      state.personaId = options.persona;
      writeFileSync(statePath, JSON.stringify(state, null, 2));
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ============================================================================
// status — 查看位格状态
// ============================================================================

program
  .command("status")
  .description("Show persona status")
  .option("-p, --persona <id>", "Persona ID")
  .option("-d, --dir <path>", "Custom personas directory")
  .action((options) => {
    try {
      const config = getConfig();
      const personasDir = options.dir ? resolvePath(options.dir) : getPersonasDir();
      const personaId = options.persona ?? config.defaultPersona;

      const loader = new PersonaLoader(personasDir);
      const persona = loader.load(personaId);
      const s = persona.state;
      console.log(`State for "${personaId}":`);
      console.log(
        `  Round: ${s.round} | SpeedWheel: ${s.speedWheel} | Workhood: ${s.workhoodIndex.toFixed(2)}`,
      );
      console.log(`  Last updated: ${s.lastUpdated}`);
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
// search — 搜索 ZK 知识库
// ============================================================================

program
  .command("search <query>")
  .description("Search Zettelkasten knowledge base")
  .option("-l, --limit <n>", "Max results", "10")
  .option("-p, --persona <id>", "Persona ID (for config)")
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
        return;
      }

      for (const result of results) {
        const note = result.note;
        if (note.tags.length > 0) {
        }
        if (result.snippet) {
        }
      }

      bridge.close();
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
      } else {
      }
      process.exit(1);
    }
  });

// ============================================================================
// context — 构建完整上下文
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
        // ZK 禁用时使用空桥接
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
    } catch (_err) {
      process.exit(1);
    }
  });

// ============================================================================
// state — 查看/更新状态
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
        // 更新状态
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
              process.exit(1);
            }
            persona.state.dynamicAxes[axis] = value;
          }
        }

        persona.state.lastUpdated = new Date().toISOString();
        saver.save(persona);
      } else {
        // 显示状态
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
    } catch (_err) {
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

// ============================================================================
// 启动
// ============================================================================

program.parse();
