import { describe, expect, it, vi } from "vitest";
import type { KnowledgeBridge, Persona } from "../../src/index.js";
import { ContextBuilder } from "../../src/index.js";

function makePersona(): Persona {
  return {
    id: "test",
    core: {
      frontmatter: { id: "test", name: "Test Persona", createdAt: "2026-05-12T00:00:00Z" },
      content: "# Identity\n\nTest",
    },
    state: {
      personaId: "test",
      round: 5,
      speedWheel: "low",
      workhoodIndex: 0.3,
      dynamicAxes: { valence: 10, arousal: 30, focus: 80, mood: 50, humor: 40, safety: 70 },
      lastUpdated: "2026-05-12T00:00:00Z",
      sessionCount: 2,
      rhythmPoints: [],
    },
    stm: {
      frontmatter: {},
      entries: [{ weight: 2, timestamp: "2026-05-12T00:00:00Z", content: "Memory entry" }],
    },
    ltm: { frontmatter: {}, entries: [] },
    relation: {
      entries: [{ entity: "user", resonance: 0.8, type: "human", description: "Test user" }],
    },
    rules: { sections: [] },
    docs: { terms: [] },
  };
}

const mockBridge: KnowledgeBridge = {
  searchNotes: () => [],
  getNote: () => null,
  getBacklinks: () => [],
  findPath: () => null,
  getNetworkGraph: () => ({ nodes: [], edges: [] }),
};

describe("ContextBuilder", () => {
  it("should build context with identity, state, memory, relations", () => {
    const builder = new ContextBuilder(mockBridge);
    const context = builder.build(makePersona());
    expect(context).toContain("Test Persona");
    expect(context).toContain("**轮数**: 5");
    expect(context).toContain("Memory entry");
    expect(context).toContain("user");
    expect(context).toContain("0.80");
  });

  it("should pass resonanceMap to bridge search when query provided", () => {
    const searchNotes = vi.fn(() => []);
    const bridge = { ...mockBridge, searchNotes };
    const builder = new ContextBuilder(bridge);
    builder.build(makePersona(), { query: "test" });
    expect(searchNotes).toHaveBeenCalledWith("test", 10, expect.any(Map));
  });

  it("should skip memory and links when disabled", () => {
    const builder = new ContextBuilder(mockBridge);
    const context = builder.build(makePersona(), { includeMemory: false, includeLinks: false });
    expect(context).not.toContain("Memory entry");
    expect(context).not.toContain("user");
  });
});
