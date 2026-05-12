import { join } from "node:path";
import matter from "gray-matter";
import { readJson, readText } from "../utils/file.js";
import {
  type CoreFile,
  CoreFrontmatterSchema,
  type DocsFile,
  type MemoryEntry,
  type MemoryFile,
  MemoryFrontmatterSchema,
  type Persona,
  type RelationEntry,
  type RelationFile,
  type RulesFile,
  StateSchema,
  type TermEntry,
} from "./types.js";

export class PersonaLoadError extends Error {
  constructor(
    message: string,
    public readonly file: string,
    public readonly cause?: unknown,
  ) {
    super(`[${file}] ${message}`);
    this.name = "PersonaLoadError";
  }
}

export class PersonaLoader {
  constructor(private readonly personasDir: string) {}

  load(personaId: string): Persona {
    const dir = join(this.personasDir, personaId);

    return {
      id: personaId,
      core: this.loadCore(dir),
      state: this.loadState(dir),
      stm: this.loadMemory(dir, "STM.md"),
      ltm: this.loadMemory(dir, "LTM.md"),
      relation: this.loadRelation(dir),
      rules: this.loadRules(dir),
      docs: this.loadDocs(dir),
    };
  }

  private loadCore(dir: string): CoreFile {
    const path = join(dir, "core.md");
    const text = readText(path);
    if (text === null) {
      throw new PersonaLoadError("core.md not found", path);
    }

    const parsed = matter(text);
    const frontmatter = CoreFrontmatterSchema.safeParse(parsed.data);
    if (!frontmatter.success) {
      throw new PersonaLoadError(`Invalid frontmatter: ${frontmatter.error.message}`, path);
    }

    return {
      frontmatter: frontmatter.data,
      content: parsed.content,
    };
  }

  private loadState(dir: string) {
    const path = join(dir, "state.json");
    const raw = readJson<unknown>(path);
    if (raw === null) {
      throw new PersonaLoadError("state.json not found", path);
    }

    const result = StateSchema.safeParse(raw);
    if (!result.success) {
      throw new PersonaLoadError(`Invalid state: ${result.error.message}`, path);
    }

    return result.data;
  }

  private loadMemory(dir: string, filename: string): MemoryFile {
    const path = join(dir, filename);
    const text = readText(path);
    if (text === null) {
      throw new PersonaLoadError(`${filename} not found`, path);
    }

    const parsed = matter(text);
    const frontmatter = MemoryFrontmatterSchema.safeParse(parsed.data);
    if (!frontmatter.success) {
      throw new PersonaLoadError(`Invalid frontmatter: ${frontmatter.error.message}`, path);
    }

    const entries = this.parseMemoryEntries(parsed.content);

    return {
      frontmatter: frontmatter.data,
      entries,
    };
  }

  private parseMemoryEntries(content: string): MemoryEntry[] {
    const entries: MemoryEntry[] = [];
    const lines = content.split("\n");
    let currentDate = "";

    for (const line of lines) {
      const dateMatch = line.match(/^##\s+(\d{4}-\d{2}-\d{2})\s*$/);
      if (dateMatch) {
        currentDate = dateMatch[1];
        continue;
      }

      const entryMatch = line.match(/^-\s+\[w:(\d+)\]\s+(.+)$/);
      if (entryMatch && currentDate) {
        entries.push({
          weight: Number.parseInt(entryMatch[1], 10),
          timestamp: `${currentDate}T00:00:00Z`,
          content: entryMatch[2].trim(),
        });
      }
    }

    return entries;
  }

  private loadRelation(dir: string): RelationFile {
    const path = join(dir, "relation.md");
    const text = readText(path);
    if (text === null) {
      throw new PersonaLoadError("relation.md not found", path);
    }

    const entries = this.parseRelationEntries(text);
    return { entries };
  }

  private parseRelationEntries(content: string): RelationEntry[] {
    const entries: RelationEntry[] = [];
    const lines = content.split("\n");

    for (const line of lines) {
      const match = line.match(/^\|\s*([^|]+)\|\s*([\d.]+)\s*\|\s*(\w+)\s*\|\s*([^|]+)\|$/);
      if (match) {
        const entity = match[1].trim();
        if (entity === "实体" || entity.startsWith("-")) continue;

        entries.push({
          entity,
          resonance: Number.parseFloat(match[2]),
          type: match[3].trim() as RelationEntry["type"],
          description: match[4].trim(),
        });
      }
    }

    return entries;
  }

  private loadRules(dir: string): RulesFile {
    const path = join(dir, "rules.md");
    const text = readText(path);
    if (text === null) {
      throw new PersonaLoadError("rules.md not found", path);
    }

    const sections = this.parseRules(text);
    return { sections };
  }

  private parseRules(content: string): RulesFile["sections"] {
    const sections: RulesFile["sections"] = [];
    const lines = content.split("\n");
    let currentSection: { title: string; rules: string[] } | null = null;

    for (const line of lines) {
      const sectionMatch = line.match(/^##\s+(.+)$/);
      if (sectionMatch) {
        if (currentSection) sections.push(currentSection);
        currentSection = { title: sectionMatch[1].trim(), rules: [] };
        continue;
      }

      const ruleMatch = line.match(/^-\s+(.+)$/);
      if (ruleMatch && currentSection) {
        currentSection.rules.push(ruleMatch[1].trim());
      }
    }

    if (currentSection) sections.push(currentSection);
    return sections;
  }

  private loadDocs(dir: string): DocsFile {
    const path = join(dir, "docs.md");
    const text = readText(path);
    if (text === null) {
      throw new PersonaLoadError("docs.md not found", path);
    }

    const terms = this.parseDocs(text);
    return { terms };
  }

  private parseDocs(content: string): TermEntry[] {
    const terms: TermEntry[] = [];
    const lines = content.split("\n");
    let currentTerm = "";
    let currentDef = "";

    for (const line of lines) {
      const termMatch = line.match(/^##\s+(.+)$/);
      if (termMatch) {
        if (currentTerm) {
          terms.push({ term: currentTerm, definition: currentDef.trim() });
        }
        currentTerm = termMatch[1].trim();
        currentDef = "";
        continue;
      }

      if (currentTerm && line.trim()) {
        currentDef += `${line.trim()} `;
      }
    }

    if (currentTerm) {
      terms.push({ term: currentTerm, definition: currentDef.trim() });
    }

    return terms;
  }
}
