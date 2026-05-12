import { join } from "node:path";
import { ensureDir, writeJson, writeText } from "../utils/file.js";
import type {
  CoreFile,
  DocsFile,
  MemoryFile,
  Persona,
  RelationFile,
  RulesFile,
  State,
} from "./types.js";

export class PersonaSaver {
  constructor(private readonly personasDir: string) {}

  save(persona: Persona): void {
    const dir = join(this.personasDir, persona.id);
    ensureDir(dir);

    this.saveCore(dir, persona.core);
    this.saveState(dir, persona.state);
    this.saveMemory(dir, "STM.md", persona.stm);
    this.saveMemory(dir, "LTM.md", persona.ltm);
    this.saveRelation(dir, persona.relation);
    this.saveRules(dir, persona.rules);
    this.saveDocs(dir, persona.docs);
  }

  private saveCore(dir: string, core: CoreFile): void {
    const frontmatter = [
      "---",
      `id: "${core.frontmatter.id}"`,
      `name: "${core.frontmatter.name}"`,
      `createdAt: "${core.frontmatter.createdAt}"`,
      "---",
    ].join("\n");

    writeText(join(dir, "core.md"), `${frontmatter}\n${core.content}`);
  }

  private saveState(dir: string, state: State): void {
    writeJson(join(dir, "state.json"), state);
  }

  private saveMemory(dir: string, filename: string, memory: MemoryFile): void {
    const lines = ["---"];
    if (memory.frontmatter.lastCompact) {
      lines.push(`lastCompact: "${memory.frontmatter.lastCompact}"`);
    }
    lines.push("---", "");

    const entriesByDate = new Map<string, typeof memory.entries>();
    for (const entry of memory.entries) {
      const date = entry.timestamp.slice(0, 10);
      const list = entriesByDate.get(date) ?? [];
      list.push(entry);
      entriesByDate.set(date, list);
    }

    for (const [date, entries] of entriesByDate) {
      lines.push(`## ${date}`, "");
      for (const entry of entries) {
        lines.push(`- [w:${entry.weight}] ${entry.content}`);
      }
      lines.push("");
    }

    writeText(join(dir, filename), lines.join("\n"));
  }

  private saveRelation(dir: string, relation: RelationFile): void {
    const lines = [
      "# 关系矩阵",
      "",
      "| 实体 | 共振度 | 类型 | 描述 |",
      "|------|--------|------|------|",
    ];

    for (const entry of relation.entries) {
      lines.push(`| ${entry.entity} | ${entry.resonance} | ${entry.type} | ${entry.description} |`);
    }

    writeText(join(dir, "relation.md"), lines.join("\n"));
  }

  private saveRules(dir: string, rules: RulesFile): void {
    const lines = ["# 行为规则", ""];

    for (const section of rules.sections) {
      lines.push(`## ${section.title}`, "");
      for (const rule of section.rules) {
        lines.push(`- ${rule}`);
      }
      lines.push("");
    }

    writeText(join(dir, "rules.md"), lines.join("\n"));
  }

  private saveDocs(dir: string, docs: DocsFile): void {
    const lines: string[] = [];

    for (const term of docs.terms) {
      lines.push(`## ${term.term}`, "", term.definition, "");
    }

    writeText(join(dir, "docs.md"), lines.join("\n"));
  }
}
