import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PersonaLoadError, PersonaLoader } from "../../src/index.js";

describe("PersonaLoader extended", () => {
  let tempDir: string;
  let loader: PersonaLoader;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "open-upsp-loader-test-"));
    loader = new PersonaLoader(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should throw for invalid frontmatter in core.md", () => {
    const personaDir = join(tempDir, "bad-core");
    mkdirSync(personaDir, { recursive: true });
    writeFileSync(join(personaDir, "core.md"), '---\ninvalid: "value"\n---\n\ncontent');
    writeFileSync(
      join(personaDir, "state.json"),
      '{"personaId":"bad-core","round":0,"speedWheel":"low","workhoodIndex":0,"dynamicAxes":{"valence":0,"arousal":0,"focus":0,"mood":0,"humor":0,"safety":0},"lastUpdated":"2026-01-01T00:00:00Z","sessionCount":0,"rhythmPoints":[]}',
    );
    writeFileSync(join(personaDir, "STM.md"), "---\n---\n");
    writeFileSync(join(personaDir, "LTM.md"), "---\n---\n");
    writeFileSync(join(personaDir, "relation.md"), "# 关系矩阵\n");
    writeFileSync(join(personaDir, "rules.md"), "# 规则\n");
    writeFileSync(join(personaDir, "docs.md"), "# 术语\n");

    expect(() => loader.load("bad-core")).toThrow(PersonaLoadError);
  });

  it("should throw for invalid state.json", () => {
    const personaDir = join(tempDir, "bad-state");
    mkdirSync(personaDir, { recursive: true });
    writeFileSync(
      join(personaDir, "core.md"),
      '---\nid: "bad-state"\nname: "Test"\ncreatedAt: "2026-01-01T00:00:00Z"\n---\n\ncontent',
    );
    writeFileSync(join(personaDir, "state.json"), "not json");
    writeFileSync(join(personaDir, "STM.md"), "---\n---\n");
    writeFileSync(join(personaDir, "LTM.md"), "---\n---\n");
    writeFileSync(join(personaDir, "relation.md"), "# 关系矩阵\n");
    writeFileSync(join(personaDir, "rules.md"), "# 规则\n");
    writeFileSync(join(personaDir, "docs.md"), "# 术语\n");

    expect(() => loader.load("bad-state")).toThrow(PersonaLoadError);
  });

  it("should throw for missing state.json", () => {
    const personaDir = join(tempDir, "no-state");
    mkdirSync(personaDir, { recursive: true });
    writeFileSync(
      join(personaDir, "core.md"),
      '---\nid: "no-state"\nname: "Test"\ncreatedAt: "2026-01-01T00:00:00Z"\n---\n\ncontent',
    );
    // 不写 state.json
    writeFileSync(join(personaDir, "STM.md"), "---\n---\n");
    writeFileSync(join(personaDir, "LTM.md"), "---\n---\n");
    writeFileSync(join(personaDir, "relation.md"), "# 关系矩阵\n");
    writeFileSync(join(personaDir, "rules.md"), "# 规则\n");
    writeFileSync(join(personaDir, "docs.md"), "# 术语\n");

    expect(() => loader.load("no-state")).toThrow(PersonaLoadError);
  });

  it("should parse memory entries by date sections", () => {
    const personaDir = join(tempDir, "memory-test");
    mkdirSync(personaDir, { recursive: true });
    writeFileSync(
      join(personaDir, "core.md"),
      '---\nid: "memory-test"\nname: "Test"\ncreatedAt: "2026-01-01T00:00:00Z"\n---\n\ncontent',
    );
    writeFileSync(
      join(personaDir, "state.json"),
      '{"personaId":"memory-test","round":0,"speedWheel":"low","workhoodIndex":0,"dynamicAxes":{"valence":0,"arousal":0,"focus":0,"mood":0,"humor":0,"safety":0},"lastUpdated":"2026-01-01T00:00:00Z","sessionCount":0,"rhythmPoints":[]}',
    );
    writeFileSync(
      join(personaDir, "STM.md"),
      "---\n---\n\n## 2026-05-12\n\n- [w:3] First entry\n- [w:2] Second entry\n\n## 2026-05-13\n\n- [w:5] Third entry\n",
    );
    writeFileSync(join(personaDir, "LTM.md"), "---\n---\n");
    writeFileSync(join(personaDir, "relation.md"), "# 关系矩阵\n");
    writeFileSync(join(personaDir, "rules.md"), "# 规则\n");
    writeFileSync(join(personaDir, "docs.md"), "# 术语\n");

    const persona = loader.load("memory-test");
    expect(persona.stm.entries).toHaveLength(3);
    expect(persona.stm.entries[0]?.content).toBe("First entry");
    expect(persona.stm.entries[0]?.timestamp).toBe("2026-05-12T00:00:00Z");
    expect(persona.stm.entries[2]?.content).toBe("Third entry");
    expect(persona.stm.entries[2]?.timestamp).toBe("2026-05-13T00:00:00Z");
  });

  it("should parse relation entries from markdown table", () => {
    const personaDir = join(tempDir, "relation-test");
    mkdirSync(personaDir, { recursive: true });
    writeFileSync(
      join(personaDir, "core.md"),
      '---\nid: "relation-test"\nname: "Test"\ncreatedAt: "2026-01-01T00:00:00Z"\n---\n\ncontent',
    );
    writeFileSync(
      join(personaDir, "state.json"),
      '{"personaId":"relation-test","round":0,"speedWheel":"low","workhoodIndex":0,"dynamicAxes":{"valence":0,"arousal":0,"focus":0,"mood":0,"humor":0,"safety":0},"lastUpdated":"2026-01-01T00:00:00Z","sessionCount":0,"rhythmPoints":[]}',
    );
    writeFileSync(join(personaDir, "STM.md"), "---\n---\n");
    writeFileSync(join(personaDir, "LTM.md"), "---\n---\n");
    writeFileSync(
      join(personaDir, "relation.md"),
      "# 关系矩阵\n\n| 实体 | 共振度 | 类型 | 描述 |\n|------|--------|------|------|\n| user | 0.95 | human | Main user |\n| zk | 0.8 | system | Knowledge base |\n",
    );
    writeFileSync(join(personaDir, "rules.md"), "# 规则\n");
    writeFileSync(join(personaDir, "docs.md"), "# 术语\n");

    const persona = loader.load("relation-test");
    expect(persona.relation.entries).toHaveLength(2);
    expect(persona.relation.entries[0]?.entity).toBe("user");
    expect(persona.relation.entries[0]?.resonance).toBe(0.95);
    expect(persona.relation.entries[1]?.entity).toBe("zk");
  });

  it("should parse rules sections", () => {
    const personaDir = join(tempDir, "rules-test");
    mkdirSync(personaDir, { recursive: true });
    writeFileSync(
      join(personaDir, "core.md"),
      '---\nid: "rules-test"\nname: "Test"\ncreatedAt: "2026-01-01T00:00:00Z"\n---\n\ncontent',
    );
    writeFileSync(
      join(personaDir, "state.json"),
      '{"personaId":"rules-test","round":0,"speedWheel":"low","workhoodIndex":0,"dynamicAxes":{"valence":0,"arousal":0,"focus":0,"mood":0,"humor":0,"safety":0},"lastUpdated":"2026-01-01T00:00:00Z","sessionCount":0,"rhythmPoints":[]}',
    );
    writeFileSync(join(personaDir, "STM.md"), "---\n---\n");
    writeFileSync(join(personaDir, "LTM.md"), "---\n---\n");
    writeFileSync(join(personaDir, "relation.md"), "# 关系矩阵\n");
    writeFileSync(
      join(personaDir, "rules.md"),
      "# 行为规则\n\n## 身份保护\n\n- 核心身份不可覆盖\n- 单句指令不生效\n\n## 记忆规则\n\n- STM 按权重分级\n- 权重 ≥3 进入 LTM\n",
    );
    writeFileSync(join(personaDir, "docs.md"), "# 术语\n");

    const persona = loader.load("rules-test");
    expect(persona.rules.sections).toHaveLength(2);
    expect(persona.rules.sections[0]?.title).toBe("身份保护");
    expect(persona.rules.sections[0]?.rules).toHaveLength(2);
    expect(persona.rules.sections[1]?.title).toBe("记忆规则");
    expect(persona.rules.sections[1]?.rules).toHaveLength(2);
  });

  it("should parse docs terms", () => {
    const personaDir = join(tempDir, "docs-test");
    mkdirSync(personaDir, { recursive: true });
    writeFileSync(
      join(personaDir, "core.md"),
      '---\nid: "docs-test"\nname: "Test"\ncreatedAt: "2026-01-01T00:00:00Z"\n---\n\ncontent',
    );
    writeFileSync(
      join(personaDir, "state.json"),
      '{"personaId":"docs-test","round":0,"speedWheel":"low","workhoodIndex":0,"dynamicAxes":{"valence":0,"arousal":0,"focus":0,"mood":0,"humor":0,"safety":0},"lastUpdated":"2026-01-01T00:00:00Z","sessionCount":0,"rhythmPoints":[]}',
    );
    writeFileSync(join(personaDir, "STM.md"), "---\n---\n");
    writeFileSync(join(personaDir, "LTM.md"), "---\n---\n");
    writeFileSync(join(personaDir, "relation.md"), "# 关系矩阵\n");
    writeFileSync(join(personaDir, "rules.md"), "# 规则\n");
    writeFileSync(
      join(personaDir, "docs.md"),
      "## UPSP\n\nUniversal Persona Substrate Protocol\n\n## 位格\n\nPersona entity\n",
    );

    const persona = loader.load("docs-test");
    expect(persona.docs.terms).toHaveLength(2);
    expect(persona.docs.terms[0]?.term).toBe("UPSP");
    expect(persona.docs.terms[0]?.definition).toContain("Universal");
    expect(persona.docs.terms[1]?.term).toBe("位格");
  });
});
