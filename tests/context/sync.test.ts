import { beforeEach, describe, expect, it, vi } from "vitest";
import { PersonaSync } from "../../src/context/sync.js";
import type { Persona } from "../../src/persona/types.js";

// mock CliBridge
vi.mock("../../src/bridge/cli-bridge.js", () => ({
  CliBridge: vi.fn().mockImplementation(() => ({
    createNote: vi.fn().mockResolvedValue({ id: `note-${Date.now()}` }),
  })),
  CliBridgeWriteError: class extends Error {},
}));

function makePersona(entries: Array<{ weight: number; content: string }>): Persona {
  const now = new Date().toISOString();
  return {
    id: "test",
    core: {
      frontmatter: { id: "test", name: "Test", createdAt: now },
      content: "",
    },
    state: {
      personaId: "test",
      round: 0,
      speedWheel: "low",
      workhoodIndex: 0,
      dynamicAxes: { valence: 0, arousal: 0, focus: 0, mood: 0, humor: 0, safety: 0 },
      lastUpdated: now,
      sessionCount: 0,
      rhythmPoints: [],
    },
    stm: {
      frontmatter: {},
      entries: entries.map((e) => ({ weight: e.weight, timestamp: now, content: e.content })),
    },
    ltm: { frontmatter: {}, entries: [] },
    relation: { entries: [] },
    rules: { sections: [] },
    docs: { terms: [] },
  };
}

describe("PersonaSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should sync entries above threshold", async () => {
    const sync = new PersonaSync();
    const persona = makePersona([
      { weight: 5, content: "Important memory" },
      { weight: 2, content: "Trivial memory" },
      { weight: 4, content: "Another important" },
    ]);

    const result = await sync.syncStm(persona);
    expect(result.synced).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.noteIds).toHaveLength(2);
  });

  it("should respect custom threshold", async () => {
    const sync = new PersonaSync({ weightThreshold: 5 });
    const persona = makePersona([
      { weight: 5, content: "W5" },
      { weight: 4, content: "W4" },
    ]);

    const result = await sync.syncStm(persona);
    expect(result.synced).toBe(1);
  });

  it("should respect maxEntries limit", async () => {
    const sync = new PersonaSync({ maxEntries: 2 });
    const persona = makePersona([
      { weight: 5, content: "A" },
      { weight: 5, content: "B" },
      { weight: 5, content: "C" },
    ]);

    const result = await sync.syncStm(persona);
    expect(result.synced).toBe(2);
  });

  it("should return empty when no candidates", async () => {
    const sync = new PersonaSync();
    const persona = makePersona([{ weight: 1, content: "Low" }]);

    const result = await sync.syncStm(persona);
    expect(result.synced).toBe(0);
    expect(result.noteIds).toHaveLength(0);
  });

  it("should sync single entry", async () => {
    const sync = new PersonaSync();
    const persona = makePersona([{ weight: 5, content: "Single" }]);

    const noteId = await sync.syncEntry(persona.stm.entries[0]!, persona);
    expect(noteId).toBeTruthy();
  });

  it("should return null for entry below threshold", async () => {
    const sync = new PersonaSync();
    const persona = makePersona([{ weight: 1, content: "Low" }]);

    const noteId = await sync.syncEntry(persona.stm.entries[0]!, persona);
    expect(noteId).toBeNull();
  });

  it("should count failures when createNote rejects", async () => {
    const { CliBridge } = await import("../../src/bridge/cli-bridge.js");
    vi.mocked(CliBridge).mockImplementationOnce(
      () =>
        ({
          createNote: vi.fn().mockRejectedValue(new Error("fail")),
        }) as unknown as InstanceType<typeof CliBridge>,
    );

    const sync = new PersonaSync();
    const persona = makePersona([{ weight: 5, content: "Fail" }]);

    const result = await sync.syncStm(persona);
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);
  });
});
