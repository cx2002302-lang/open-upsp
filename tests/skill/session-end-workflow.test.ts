import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PersonaLoader,
  PersonaSaver,
  SessionDistiller,
  StateUpdater,
} from "../../src/index.js";
import type { Persona } from "../../src/persona/types.js";

describe("Session-End Workflow E2E", () => {
  let tempDir: string;
  let personasDir: string;
  let originalHome: string | undefined;

  function createPersona(id: string, opts: { round: number; stmEntries?: number }): Persona {
    const entries = [];
    for (let i = 0; i < (opts.stmEntries ?? 0); i++) {
      entries.push({
        weight: (i % 5) + 1,
        timestamp: `2026-05-${String(10 + i).padStart(2, "0")}T10:00:00Z`,
        content: `Existing STM ${i + 1}`,
      });
    }

    return {
      id,
      core: {
        frontmatter: { id, name: "TestBot", createdAt: "2026-05-01T00:00:00Z" },
        content: "Test persona for session-end",
      },
      state: {
        personaId: id,
        round: opts.round,
        speedWheel: "low",
        workhoodIndex: 0.2,
        dynamicAxes: { valence: 50, arousal: 50, focus: 50, mood: 50, humor: 50, safety: 50 },
        lastUpdated: "2026-05-12T00:00:00Z",
        sessionCount: opts.round,
        rhythmPoints: [],
      },
      stm: { frontmatter: {}, entries },
      ltm: { frontmatter: {}, entries: [] },
      relation: {
        entries: [
          { entity: "user", resonance: 0.6, type: "human", description: "The user" },
          { entity: "Docker", resonance: 0.4, type: "concept", description: "Container tech" },
        ],
      },
      rules: { sections: [] },
      docs: { terms: [] },
    };
  }

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "open-upsp-session-end-"));
    personasDir = join(tempDir, "personas");
    mkdirSync(personasDir, { recursive: true });
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;

    // Setup skill dir for evolution params
    const skillDir = join(tempDir, ".openclaw", "skills", "open-upsp");
    const evolvableDir = join(skillDir, "evolvable");
    mkdirSync(evolvableDir, { recursive: true });
    writeFileSync(
      join(skillDir, "manifest.json"),
      JSON.stringify({
        version: "0.3.2",
        evolvable: { unlockCondition: { round: 10, workhoodIndex: 0.3 } },
      }),
    );
    writeFileSync(
      join(evolvableDir, "PARAMS.yaml"),
      `version: "0.3.2"
limits:
  state_update:
    delta_max: 5
    valence_range: [-100, 100]
    arousal_range: [0, 100]
    focus_range: [0, 100]
    mood_range: [0, 100]
    humor_range: [0, 100]
    safety_range: [0, 100]
  relation_update:
    resonance_delta_max: 0.05
  core_axis:
    change_threshold_rounds: 256
    requires_user_confirm: true
memory:
  max_stm_entries_per_session: 5
  sync_weight_threshold: 3
  auto_archive: true
search:
  depth: 20
  link_threshold: 0.6
behavior:
  context_injection: true
  auto_record: true
  auto_sync: true`,
    );
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("Step 1: Distillation", () => {
    it("should extract high-weight entries from explicit instructions", () => {
      const distiller = new SessionDistiller();
      const text = `user: 这个配置很重要，记下来
user: 我们决定用 PostgreSQL 作为主数据库
user: 完美，部署成功了！`;

      const result = distiller.distill(text);

      // "记下来" should trigger weight 5
      const weight5 = result.entries.filter((e) => e.weight === 5);
      expect(weight5.length).toBeGreaterThanOrEqual(1);

      // "决定用" should trigger weight 3
      const weight3 = result.entries.filter((e) => e.weight === 3);
      expect(weight3.length).toBeGreaterThanOrEqual(1);
    });

    it("should infer emotional state changes", () => {
      const distiller = new SessionDistiller();
      const text = `user: 太棒了！这个问题终于解决了，感谢！
user: 哈哈，这个方案真有意思`;

      const result = distiller.distill(text);

      expect(result.stateDelta.valence).toBeGreaterThan(0);
      expect(result.stateDelta.humor).toBeGreaterThan(0);
    });

    it("should infer relation deltas for known entities", () => {
      const distiller = new SessionDistiller();
      const text = `user: Docker Docker Docker, I love Docker
user: Docker is the best tool ever`;

      const result = distiller.distill(text, ["Docker", "Kubernetes"]);

      expect(result.relationDelta.get("Docker")).toBeGreaterThan(0);
      expect(result.relationDelta.get("Kubernetes")).toBeLessThan(0); // not mentioned
    });
  });

  describe("Step 2: State Update", () => {
    it("should apply distilled delta within bounds", () => {
      const persona = createPersona("test-state", { round: 5 });
      const updater = new StateUpdater();

      const result = updater.update(persona, {
        valence: 8,
        mood: 3,
        safety: -2,
      });

      // Should be clamped to ±5
      expect(result.changes).toContainEqual(
        expect.objectContaining({ axis: "valence", from: 50, to: 55 }),
      );
      expect(result.changes).toContainEqual(
        expect.objectContaining({ axis: "mood", from: 50, to: 53 }),
      );
      expect(persona.state.dynamicAxes.valence).toBe(55);
      expect(persona.state.round).toBe(6);
    });

    it("should clamp to [0, 100] range", () => {
      const persona = createPersona("test-state2", { round: 5 });
      persona.state.dynamicAxes.valence = 98;
      const updater = new StateUpdater();

      updater.update(persona, { valence: 10 });
      expect(persona.state.dynamicAxes.valence).toBe(100); // capped at 100
    });

    it("should advance speed wheel at 256-round boundary", () => {
      const persona = createPersona("test-state3", { round: 255 });
      persona.state.speedWheel = "high"; // 255 % 256 = 255 >= 240 → high
      const updater = new StateUpdater();

      const result = updater.update(persona, {});
      expect(result.speedWheelChanged).toBe(true);
      expect(persona.state.speedWheel).toBe("low"); // 256 % 256 = 0 < 200 → low
    });

    it("should recalculate workhood index after update", () => {
      const persona = createPersona("test-state4", { round: 5, stmEntries: 10 });
      const updater = new StateUpdater();

      const before = persona.state.workhoodIndex;
      updater.update(persona, {});
      const after = persona.state.workhoodIndex;

      // More sessions + more STM = higher workhood
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  describe("Step 3: Full Session-End Pipeline", () => {
    it("should execute distill → update → save in sequence", () => {
      const persona = createPersona("test-pipeline", { round: 3 });
      const saver = new PersonaSaver(personasDir);
      saver.save(persona);

      const sessionText = `user: 这个架构设计很重要，记下来
user: 我发现微服务比单体更适合我们的场景
user: 决定用 Kubernetes 做编排
user: 太棒了！部署非常顺利，感谢！`;

      const loader = new PersonaLoader(personasDir);
      const loaded = loader.load("test-pipeline");
      expect(loaded.state.round).toBe(3);

      // 1. Distill
      const distiller = new SessionDistiller();
      const distilled = distiller.distill(sessionText, ["user", "Docker", "Kubernetes"]);
      expect(distilled.entries.length).toBeGreaterThanOrEqual(2);

      // 2. Add to STM
      for (const entry of distilled.entries) {
        loaded.stm.entries.push(entry);
      }

      // 3. Update relations
      for (const [entity, delta] of distilled.relationDelta) {
        const existing = loaded.relation.entries.find((e) => e.entity === entity);
        if (existing) {
          existing.resonance = Math.max(0, Math.min(1, existing.resonance + delta));
        }
      }

      // 4. Update state
      const updater = new StateUpdater();
      const stateResult = updater.update(loaded, distilled.stateDelta);
      expect(stateResult.newRound).toBe(true);
      expect(loaded.state.round).toBe(4);

      // 5. Increment session count
      loaded.state.sessionCount += 1;

      // 6. Save
      saver.save(loaded);

      // 7. Verify persistence
      const fresh = loader.load("test-pipeline");
      expect(fresh.state.round).toBe(4);
      expect(fresh.stm.entries.length).toBeGreaterThanOrEqual(2);
      expect(fresh.state.sessionCount).toBeGreaterThan(0);
    });

    it("should handle empty session gracefully", () => {
      const persona = createPersona("test-empty", { round: 2 });
      const saver = new PersonaSaver(personasDir);
      saver.save(persona);

      const sessionText = "user: 你好\nassistant: 你好！";

      const distiller = new SessionDistiller();
      const distilled = distiller.distill(sessionText);

      // Should not crash with empty results
      expect(distilled.entries).toBeDefined();
      expect(distilled.stateDelta).toBeDefined();

      const loader = new PersonaLoader(personasDir);
      const loaded = loader.load("test-empty");
      const updater = new StateUpdater();
      const result = updater.update(loaded, distilled.stateDelta);

      expect(result.newRound).toBe(true);
      saver.save(loaded);
    });

    it("should preserve all file formats after save/load cycle", () => {
      const persona = createPersona("test-format", { round: 1, stmEntries: 3 });
      const saver = new PersonaSaver(personasDir);
      saver.save(persona);

      // Run session-end
      const loader = new PersonaLoader(personasDir);
      const loaded = loader.load("test-format");
      const updater = new StateUpdater();
      updater.update(loaded, { valence: 2, mood: 1 });
      loaded.state.sessionCount += 1;
      saver.save(loaded);

      // Verify file formats
      const personaDir = join(personasDir, "test-format");
      const stateJson = JSON.parse(readFileSync(join(personaDir, "state.json"), "utf8"));
      expect(stateJson).toHaveProperty("personaId");
      expect(stateJson).toHaveProperty("dynamicAxes");
      expect(stateJson).toHaveProperty("round");

      const stmMd = readFileSync(join(personaDir, "STM.md"), "utf8");
      // STM.md uses frontmatter + date-grouped entries, not a title
      expect(stmMd).toContain("---");
      expect(stmMd).toContain("Existing STM");
    });
  });

  describe("Step 4: Evolution Params Integration", () => {
    it("should respect delta_max from PARAMS.yaml", () => {
      // Override params with delta_max = 3
      const skillDir = join(tempDir, ".openclaw", "skills", "open-upsp");
      const evolvableDir = join(skillDir, "evolvable");
      writeFileSync(
        join(evolvableDir, "PARAMS.yaml"),
        `version: "0.3.2"
limits:
  state_update:
    delta_max: 3
    valence_range: [-100, 100]
    arousal_range: [0, 100]
    focus_range: [0, 100]
    mood_range: [0, 100]
    humor_range: [0, 100]
    safety_range: [0, 100]
  relation_update:
    resonance_delta_max: 0.05
  core_axis:
    change_threshold_rounds: 256
    requires_user_confirm: true
memory:
  max_stm_entries_per_session: 5
  sync_weight_threshold: 3
  auto_archive: true
search:
  depth: 20
  link_threshold: 0.6
behavior:
  context_injection: true
  auto_record: true
  auto_sync: true`,
      );

      const persona = createPersona("test-params", { round: 5 });
      const updater = new StateUpdater();

      const result = updater.update(persona, { valence: 10 });
      // Should be clamped to ±3
      const change = result.changes.find((c) => c.axis === "valence");
      expect(change).toBeDefined();
      expect(Math.abs(change!.to - change!.from)).toBeLessThanOrEqual(3);
    });
  });
});
