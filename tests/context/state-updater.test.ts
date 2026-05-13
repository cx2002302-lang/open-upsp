import { describe, expect, it } from "vitest";
import type { Persona } from "../../src/index.js";
import { StateUpdater } from "../../src/index.js";

function makePersona(): Persona {
  return {
    id: "test",
    core: {
      frontmatter: { id: "test", name: "Test", createdAt: "2026-05-12T00:00:00Z" },
      content: "",
    },
    state: {
      personaId: "test",
      round: 0,
      speedWheel: "low",
      workhoodIndex: 0,
      dynamicAxes: { valence: 50, arousal: 50, focus: 50, mood: 50, humor: 50, safety: 50 },
      lastUpdated: "2026-05-12T00:00:00Z",
      sessionCount: 5,
      rhythmPoints: [],
    },
    stm: { frontmatter: {}, entries: [] },
    ltm: { frontmatter: {}, entries: [] },
    relation: { entries: [] },
    rules: { sections: [] },
    docs: { terms: [] },
  };
}

describe("StateUpdater", () => {
  it("should clamp delta to ±5", () => {
    const updater = new StateUpdater();
    const persona = makePersona();
    const result = updater.update(persona, { valence: 100, mood: -100 });
    expect(persona.state.dynamicAxes.valence).toBe(55); // 50 + 5
    expect(persona.state.dynamicAxes.mood).toBe(45); // 50 - 5
    expect(result.changes).toHaveLength(2);
  });

  it("should advance round and update speedWheel", () => {
    const updater = new StateUpdater();
    const persona = makePersona();
    persona.state.round = 255;
    const result = updater.update(persona, {});
    expect(persona.state.round).toBe(256);
    expect(persona.state.speedWheel).toBe("low"); // cycle 0 => low (0-199)
    expect(result.speedWheelChanged).toBe(false); // was already low
  });

  it("should keep speedWheel at low for early rounds", () => {
    const updater = new StateUpdater();
    const persona = makePersona();
    persona.state.round = 100;
    updater.update(persona, {});
    expect(persona.state.speedWheel).toBe("low");
  });

  it("should calculate workhoodIndex from session, stm, relation counts", () => {
    const updater = new StateUpdater();
    const persona = makePersona();
    persona.state.sessionCount = 50;
    persona.stm.entries = Array.from({ length: 25 }, (_, i) => ({
      weight: 2,
      timestamp: "2026-05-12T00:00:00Z",
      content: `memory ${i}`,
    }));
    persona.relation.entries = Array.from({ length: 10 }, (_, i) => ({
      entity: `entity${i}`,
      resonance: 0.5,
      type: "human" as const,
      description: "Test",
    }));
    updater.update(persona, {});
    // sessionWeight = min(50/100, 0.4) = 0.4
    // stmWeight = min(25/50, 0.3) = 0.3
    // relationWeight = min(10/20, 0.3) = 0.3
    expect(persona.state.workhoodIndex).toBe(1);
  });
});
