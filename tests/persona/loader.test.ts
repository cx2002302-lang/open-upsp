import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PersonaLoadError, PersonaLoader, PersonaSaver } from "../../src/index.js";

describe("PersonaLoader + PersonaSaver", () => {
  let tempDir: string;
  let loader: PersonaLoader;
  let saver: PersonaSaver;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "open-upsp-test-"));
    loader = new PersonaLoader(tempDir);
    saver = new PersonaSaver(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should save and load a persona", () => {
    const persona = {
      id: "test",
      core: {
        frontmatter: { id: "test", name: "Test Persona", createdAt: "2026-05-12T00:00:00Z" },
        content: "# Test\n\nCore content",
      },
      state: {
        personaId: "test",
        round: 0,
        speedWheel: "low" as const,
        workhoodIndex: 0,
        dynamicAxes: { valence: 0, arousal: 20, focus: 70, mood: 40, humor: 30, safety: 60 },
        lastUpdated: "2026-05-12T00:00:00Z",
        sessionCount: 0,
        rhythmPoints: [],
      },
      stm: { frontmatter: {}, entries: [] },
      ltm: { frontmatter: {}, entries: [] },
      relation: { entries: [] },
      rules: { sections: [] },
      docs: { terms: [] },
    };

    saver.save(persona);
    const loaded = loader.load("test");

    expect(loaded.id).toBe("test");
    expect(loaded.core.frontmatter.name).toBe("Test Persona");
    expect(loaded.state.round).toBe(0);
    expect(loaded.state.dynamicAxes.focus).toBe(70);
  });

  it("should parse memory entries", () => {
    const persona = {
      id: "test",
      core: {
        frontmatter: { id: "test", name: "Test", createdAt: "2026-05-12T00:00:00Z" },
        content: "",
      },
      state: {
        personaId: "test",
        round: 0,
        speedWheel: "low" as const,
        workhoodIndex: 0,
        dynamicAxes: { valence: 0, arousal: 20, focus: 70, mood: 40, humor: 30, safety: 60 },
        lastUpdated: "2026-05-12T00:00:00Z",
        sessionCount: 0,
        rhythmPoints: [],
      },
      stm: {
        frontmatter: {},
        entries: [{ weight: 2, timestamp: "2026-05-12T00:00:00Z", content: "Test memory" }],
      },
      ltm: { frontmatter: {}, entries: [] },
      relation: { entries: [] },
      rules: { sections: [] },
      docs: { terms: [] },
    };

    saver.save(persona);
    const loaded = loader.load("test");

    expect(loaded.stm.entries).toHaveLength(1);
    expect(loaded.stm.entries[0].weight).toBe(2);
    expect(loaded.stm.entries[0].content).toBe("Test memory");
  });

  it("should throw on missing persona", () => {
    expect(() => loader.load("nonexistent")).toThrow(PersonaLoadError);
  });
});
