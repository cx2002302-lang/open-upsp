import { describe, expect, it } from "vitest";
import { ContextBuilder } from "../../src/context/builder.js";
import type { KnowledgeBridge, Persona } from "../../src/persona/types.js";

const mockBridge: KnowledgeBridge = {
  searchNotes: () => [],
  getNote: () => null,
  getBacklinks: () => [],
  findPath: () => null,
  getNetworkGraph: () => ({ nodes: [], edges: [] }),
};

function makePersona(overrides?: Partial<Persona>): Persona {
  const now = new Date().toISOString();
  const base: Persona = {
    id: "test",
    core: {
      frontmatter: { id: "test", name: "Test", createdAt: now },
      content: "# Identity\n\nTest",
    },
    state: {
      personaId: "test",
      round: 5,
      speedWheel: "low",
      workhoodIndex: 0.3,
      dynamicAxes: { valence: 10, arousal: 30, focus: 80, mood: 50, humor: 40, safety: 70 },
      lastUpdated: now,
      sessionCount: 2,
      rhythmPoints: [],
    },
    stm: { frontmatter: {}, entries: [] },
    ltm: { frontmatter: {}, entries: [] },
    relation: { entries: [] },
    rules: { sections: [] },
    docs: { terms: [] },
  };
  return { ...base, ...overrides };
}

describe("ContextBuilder extended", () => {
  it("should show empty memory message", () => {
    const builder = new ContextBuilder(mockBridge);
    const context = builder.build(makePersona());
    expect(context).toContain("短期记忆");
    expect(context).toContain("暂无记忆条目");
  });

  it("should show empty relation message", () => {
    const builder = new ContextBuilder(mockBridge);
    const context = builder.build(makePersona());
    expect(context).toContain("关系矩阵");
    expect(context).toContain("暂无关系记录");
  });

  it("should show rhythm points when present", () => {
    const persona = makePersona({
      state: {
        ...makePersona().state,
        rhythmPoints: [
          { round: 3, description: "重要发现", weight: 4 },
          { round: 5, description: "状态转变", weight: 5 },
        ],
      },
    });
    const builder = new ContextBuilder(mockBridge);
    const context = builder.build(persona);
    expect(context).toContain("最近节律点");
    expect(context).toContain("重要发现");
  });

  it("should handle knowledge search failure gracefully", () => {
    const failingBridge: KnowledgeBridge = {
      ...mockBridge,
      searchNotes: () => {
        throw new Error("DB locked");
      },
    };
    const builder = new ContextBuilder(failingBridge);
    const context = builder.build(makePersona(), { query: "test" });
    expect(context).toContain("知识库检索");
    expect(context).toContain("查询失败");
  });

  it("should show relation entries with resonance bars", () => {
    const persona = makePersona({
      relation: {
        entries: [
          { entity: "user", resonance: 0.85, type: "human", description: "Main user" },
          { entity: "zk", resonance: 0.3, type: "system", description: "Knowledge base" },
        ],
      },
    });
    const builder = new ContextBuilder(mockBridge);
    const context = builder.build(persona);
    expect(context).toContain("user");
    expect(context).toContain("0.85");
    expect(context).toContain("zk");
    expect(context).toContain("0.30");
  });

  it("should build knowledge section with search results", () => {
    const bridgeWithResults: KnowledgeBridge = {
      ...mockBridge,
      searchNotes: () => [
        {
          note: {
            id: "n1",
            title: "Test Note",
            content: "Test content",
            summary: null,
            type: "atomic",
            status: "FLEETING",
            folder: "inbox",
            confidence: null,
            source: null,
            reviewed: false,
            sessionKey: null,
            filePath: "/test.md",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
            tags: ["test"],
            links: [],
          },
          score: 1.5,
          snippet: "Test...",
        },
      ],
    };
    const builder = new ContextBuilder(bridgeWithResults);
    const context = builder.build(makePersona(), { query: "test" });
    expect(context).toContain("Test Note");
    expect(context).toContain("test");
  });
});
