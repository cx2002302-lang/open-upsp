import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContextBuilder } from "../../src/context/builder.js";
import { EvolutionLoader } from "../../src/skill/evolution-loader.js";
import type { Persona } from "../../src/persona/types.js";

// Mock KnowledgeBridge for isolated testing
class MockBridge {
  searchNotes() {
    return [];
  }
}

describe("Progressive Unlock Integration", () => {
  let tempDir: string;
  let originalHome: string | undefined;

  function setupSkillDir(
    manifest?: object,
    params?: string,
    extensions?: string,
  ) {
    const skillDir = join(tempDir, ".openclaw", "skills", "open-upsp");
    const evolvableDir = join(skillDir, "evolvable");
    mkdirSync(evolvableDir, { recursive: true });

    writeFileSync(
      join(skillDir, "manifest.json"),
      JSON.stringify(
        manifest ?? {
          version: "0.3.2",
          evolvable: { unlockCondition: { round: 10, workhoodIndex: 0.3 } },
        },
      ),
    );

    writeFileSync(
      join(evolvableDir, "PARAMS.yaml"),
      params ??
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

    if (extensions) {
      writeFileSync(join(evolvableDir, "EXTENSIONS.md"), extensions);
    }
  }

  function makePersona(partial: { round: number; workhoodIndex: number }): Persona {
    return {
      id: "test",
      core: {
        frontmatter: { id: "test", name: "Test", createdAt: "2026-05-12T00:00:00Z" },
        content: "Test persona",
      },
      state: {
        personaId: "test",
        round: partial.round,
        speedWheel: "low",
        workhoodIndex: partial.workhoodIndex,
        dynamicAxes: { valence: 50, arousal: 50, focus: 50, mood: 50, humor: 50, safety: 50 },
        lastUpdated: "2026-05-12T00:00:00Z",
        sessionCount: partial.round,
        rhythmPoints: [],
      },
      stm: { frontmatter: {}, entries: [] },
      ltm: { frontmatter: {}, entries: [] },
      relation: { entries: [] },
      rules: { sections: [] },
      docs: { terms: [] },
    };
  }

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "open-upsp-unlock-"));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    rmSync(tempDir, { recursive: true, force: true });
  });

  // ========================================================================
  // Locked State Tests
  // ========================================================================
  describe("locked state (round < 10)", () => {
    it("should inject progress hint for round 0 persona", () => {
      setupSkillDir();
      const persona = makePersona({ round: 0, workhoodIndex: 0 });
      const builder = new ContextBuilder(new MockBridge() as any);
      const context = builder.build(persona);

      expect(context).toContain("进化提示");
      expect(context).toContain("0%");
      expect(context).not.toContain("进化模块（已解锁）");
    });

    it("should inject progress hint for round 5 persona", () => {
      setupSkillDir();
      const persona = makePersona({ round: 5, workhoodIndex: 0.15 });
      const builder = new ContextBuilder(new MockBridge() as any);
      const context = builder.build(persona);

      expect(context).toContain("进化提示");
      expect(context).toContain("50%");
      expect(context).toContain("5/10");
      expect(context).not.toContain("进化模块（已解锁）");
    });

    it("should inject progress hint for round 9 persona (just under threshold)", () => {
      setupSkillDir();
      const persona = makePersona({ round: 9, workhoodIndex: 0.29 });
      const builder = new ContextBuilder(new MockBridge() as any);
      const context = builder.build(persona);

      expect(context).toContain("进化提示");
      expect(context).toContain("90%");
      expect(context).not.toContain("进化模块（已解锁）");
    });
  });

  // ========================================================================
  // Unlocked State Tests
  // ========================================================================
  describe("unlocked state (round >= 10, workhood >= 0.3)", () => {
    it("should inject evolvable content for round 10 persona at threshold", () => {
      setupSkillDir();
      const persona = makePersona({ round: 10, workhoodIndex: 0.3 });
      const builder = new ContextBuilder(new MockBridge() as any);
      const context = builder.build(persona);

      expect(context).toContain("进化模块（已解锁）");
      expect(context).toContain("## 进化参数");
      expect(context).toContain("delta_max");
      expect(context).not.toContain("进化提示");
    });

    it("should inject evolvable content for well-evolved persona", () => {
      setupSkillDir();
      const persona = makePersona({ round: 25, workhoodIndex: 0.75 });
      const builder = new ContextBuilder(new MockBridge() as any);
      const context = builder.build(persona);

      expect(context).toContain("进化模块（已解锁）");
      expect(context).toContain("## 进化参数");
    });

    it("should include custom rules from EXTENSIONS.md when present", () => {
      setupSkillDir(
        undefined,
        undefined,
        `## 你的自定义规则

- Always greet with "Hello there"
- Prefer short answers`,
      );
      const persona = makePersona({ round: 15, workhoodIndex: 0.5 });
      const builder = new ContextBuilder(new MockBridge() as any);
      const context = builder.build(persona);

      expect(context).toContain("进化模块（已解锁）");
      expect(context).toContain("## 自定义规则");
      expect(context).toContain("Always greet");
    });
  });

  // ========================================================================
  // Boundary Tests
  // ========================================================================
  describe("boundary conditions", () => {
    it("should handle high round with low workhood (not unlocked)", () => {
      setupSkillDir();
      const persona = makePersona({ round: 100, workhoodIndex: 0.1 });
      const builder = new ContextBuilder(new MockBridge() as any);
      const context = builder.build(persona);

      expect(context).toContain("进化提示");
      expect(context).toContain("100%"); // round progress capped
      expect(context).not.toContain("进化模块（已解锁）");
    });

    it("should handle high workhood with low round (not unlocked)", () => {
      setupSkillDir();
      const persona = makePersona({ round: 3, workhoodIndex: 0.9 });
      const builder = new ContextBuilder(new MockBridge() as any);
      const context = builder.build(persona);

      expect(context).toContain("进化提示");
      expect(context).toContain("100%"); // workhood progress capped
      expect(context).not.toContain("进化模块（已解锁）");
    });
  });

  // ========================================================================
  // Custom Unlock Conditions
  // ========================================================================
  describe("custom unlock conditions", () => {
    it("should use overridden round threshold", () => {
      setupSkillDir({
        version: "0.4.0",
        evolvable: { unlockCondition: { round: 5, workhoodIndex: 0.3 } },
      });

      const locked = makePersona({ round: 4, workhoodIndex: 0.5 });
      const builder = new ContextBuilder(new MockBridge() as any);
      expect(builder.build(locked)).toContain("进化提示");

      const unlocked = makePersona({ round: 5, workhoodIndex: 0.3 });
      expect(builder.build(unlocked)).toContain("进化模块（已解锁）");
    });

    it("should use overridden workhood threshold", () => {
      setupSkillDir({
        version: "0.4.0",
        evolvable: { unlockCondition: { round: 10, workhoodIndex: 0.5 } },
      });

      const locked = makePersona({ round: 15, workhoodIndex: 0.4 });
      const builder = new ContextBuilder(new MockBridge() as any);
      expect(builder.build(locked)).toContain("进化提示");

      const unlocked = makePersona({ round: 10, workhoodIndex: 0.5 });
      expect(builder.build(unlocked)).toContain("进化模块（已解锁）");
    });
  });

  // ========================================================================
  // Evolution Loader Cache
  // ========================================================================
  describe("cache behavior", () => {
    it("should cache manifest and params across multiple checks", () => {
      setupSkillDir();
      const loader = new EvolutionLoader();
      const persona = makePersona({ round: 5, workhoodIndex: 0.15 });

      // First call
      const h1 = loader.getProgressHint(persona);
      // Second call should use cache
      const h2 = loader.getProgressHint(persona);
      expect(h1).toBe(h2);
    });
  });
});
