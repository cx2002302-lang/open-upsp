import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EvolutionLoader } from "../../src/skill/evolution-loader.js";

describe("EvolutionLoader", () => {
  let tempDir: string;
  let originalHome: string | undefined;
  let loader: EvolutionLoader;

  function setupSkillDir(extra?: { params?: string; manifest?: string; extensions?: string }) {
    const skillDir = join(tempDir, ".openclaw", "skills", "open-upsp");
    const evolvableDir = join(skillDir, "evolvable");
    mkdirSync(evolvableDir, { recursive: true });

    writeFileSync(
      join(evolvableDir, "PARAMS.yaml"),
      extra?.params ??
        `version: "0.3.2"
limits:
  state_update:
    delta_max: 7
    valence_range: [-100, 100]
    arousal_range: [0, 100]
    focus_range: [0, 100]
    mood_range: [0, 100]
    humor_range: [0, 100]
    safety_range: [0, 100]
  relation_update:
    resonance_delta_max: 0.08
  core_axis:
    change_threshold_rounds: 300
    requires_user_confirm: false
memory:
  max_stm_entries_per_session: 8
  sync_weight_threshold: 4
  auto_archive: false
search:
  depth: 25
  link_threshold: 0.7
behavior:
  context_injection: false
  auto_record: false
  auto_sync: false`,
    );

    writeFileSync(
      join(skillDir, "manifest.json"),
      extra?.manifest ??
        JSON.stringify({
          version: "0.3.2",
          id: "open-upsp",
          evolvable: {
            path: "evolvable",
            mutable: true,
            unlockCondition: { round: 10, workhoodIndex: 0.3 },
          },
        }),
    );

    if (extra?.extensions) {
      writeFileSync(join(evolvableDir, "EXTENSIONS.md"), extra.extensions);
    }
  }

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "open-upsp-skill-"));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
    loader = new EvolutionLoader();
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    rmSync(tempDir, { recursive: true, force: true });
  });

  // ========================================================================
  // YAML Parsing & loadParams
  // ========================================================================
  describe("loadParams", () => {
    it("should load custom params from PARAMS.yaml", () => {
      setupSkillDir();
      const params = loader.loadParams();

      expect(params.version).toBe("0.3.2");
      expect(params.limits.stateUpdate.deltaMax).toBe(7);
      expect(params.limits.stateUpdate.valenceRange).toEqual([-100, 100]);
      expect(params.limits.relationUpdate.resonanceDeltaMax).toBe(0.08);
      expect(params.limits.coreAxis.changeThresholdRounds).toBe(300);
      expect(params.limits.coreAxis.requiresUserConfirm).toBe(false);
      expect(params.memory.maxStmEntriesPerSession).toBe(8);
      expect(params.memory.syncWeightThreshold).toBe(4);
      expect(params.memory.autoArchive).toBe(false);
      expect(params.search.depth).toBe(25);
      expect(params.search.linkThreshold).toBe(0.7);
      expect(params.behavior.contextInjection).toBe(false);
      expect(params.behavior.autoRecord).toBe(false);
      expect(params.behavior.autoSync).toBe(false);
    });

    it("should return defaults when PARAMS.yaml is missing", () => {
      // Don't create skill dir
      const params = loader.loadParams();
      expect(params.limits.stateUpdate.deltaMax).toBe(5);
      expect(params.memory.syncWeightThreshold).toBe(3);
    });

    it("should handle YAML with comments", () => {
      setupSkillDir({
        params: `version: "0.3.2"
limits:
  state_update:
    delta_max: 10 # this is a comment
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
      });
      const params = loader.loadParams();
      expect(params.limits.stateUpdate.deltaMax).toBe(10);
    });

    it("should handle YAML with quoted strings", () => {
      setupSkillDir({
        params: `version: "test-version"
limits:
  state_update:
    delta_max: 3
    valence_range: [-50, 50]
    arousal_range: [0, 100]
    focus_range: [0, 100]
    mood_range: [0, 100]
    humor_range: [0, 100]
    safety_range: [0, 100]
  relation_update:
    resonance_delta_max: 0.02
  core_axis:
    change_threshold_rounds: 128
    requires_user_confirm: false
memory:
  max_stm_entries_per_session: 3
  sync_weight_threshold: 2
  auto_archive: false
search:
  depth: 10
  link_threshold: 0.5
behavior:
  context_injection: false
  auto_record: false
  auto_sync: false`,
      });
      const params = loader.loadParams();
      expect(params.version).toBe("test-version");
      expect(params.limits.stateUpdate.deltaMax).toBe(3);
      expect(params.limits.stateUpdate.valenceRange).toEqual([-50, 50]);
    });

    it("should cache params and refresh on file change", () => {
      setupSkillDir();

      const p1 = loader.loadParams();
      expect(p1.limits.stateUpdate.deltaMax).toBe(7);

      // Modify file
      const paramsPath = join(tempDir, ".openclaw", "skills", "open-upsp", "evolvable", "PARAMS.yaml");
      const newContent = `version: "0.3.2"
limits:
  state_update:
    delta_max: 99
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
  auto_sync: true`;
      writeFileSync(paramsPath, newContent);

      const p2 = loader.loadParams();
      expect(p2.version).toBe("0.3.2");
      expect(p2.limits.stateUpdate.deltaMax).toBe(99);
    });

    it("should fall back to defaults on invalid YAML", () => {
      setupSkillDir({ params: "this is not: valid: yaml: {[" });
      const params = loader.loadParams();
      // Should return defaults without crashing
      expect(params.limits.stateUpdate.deltaMax).toBe(5);
    });
  });

  // ========================================================================
  // Unlock Conditions
  // ========================================================================
  describe("isUnlocked", () => {
    it("should return false when round < 10", () => {
      setupSkillDir();
      const persona = makePersona({ round: 5, workhoodIndex: 0.5 });
      expect(loader.isUnlocked(persona)).toBe(false);
    });

    it("should return false when workhoodIndex < 0.3", () => {
      setupSkillDir();
      const persona = makePersona({ round: 15, workhoodIndex: 0.1 });
      expect(loader.isUnlocked(persona)).toBe(false);
    });

    it("should return false when both conditions fail", () => {
      setupSkillDir();
      const persona = makePersona({ round: 5, workhoodIndex: 0.1 });
      expect(loader.isUnlocked(persona)).toBe(false);
    });

    it("should return true when round >= 10 and workhoodIndex >= 0.3", () => {
      setupSkillDir();
      const persona = makePersona({ round: 10, workhoodIndex: 0.3 });
      expect(loader.isUnlocked(persona)).toBe(true);
    });

    it("should return true for well-evolved persona", () => {
      setupSkillDir();
      const persona = makePersona({ round: 25, workhoodIndex: 0.75 });
      expect(loader.isUnlocked(persona)).toBe(true);
    });

    it("should use manifest unlock conditions when overridden", () => {
      setupSkillDir({
        manifest: JSON.stringify({
          version: "0.4.0",
          evolvable: {
            unlockCondition: { round: 5, workhoodIndex: 0.5 },
          },
        }),
      });

      expect(loader.isUnlocked(makePersona({ round: 4, workhoodIndex: 0.6 }))).toBe(false);
      expect(loader.isUnlocked(makePersona({ round: 5, workhoodIndex: 0.5 }))).toBe(true);
      expect(loader.isUnlocked(makePersona({ round: 10, workhoodIndex: 0.3 }))).toBe(false); // workhood too low
    });

    it("should return false when manifest has no unlockCondition", () => {
      setupSkillDir({
        manifest: JSON.stringify({
          version: "0.3.2",
          // No evolvable.unlockCondition
        }),
      });
      const persona = makePersona({ round: 100, workhoodIndex: 1.0 });
      expect(loader.isUnlocked(persona)).toBe(false);
    });
  });

  // ========================================================================
  // Progress Hint
  // ========================================================================
  describe("getProgressHint", () => {
    it("should show 0% progress for new persona", () => {
      setupSkillDir();
      const hint = loader.getProgressHint(makePersona({ round: 0, workhoodIndex: 0 }));
      expect(hint).toContain("进化提示");
      expect(hint).toContain("0%");
      expect(hint).toContain("0/10");
    });

    it("should show partial progress", () => {
      setupSkillDir();
      const hint = loader.getProgressHint(makePersona({ round: 5, workhoodIndex: 0.15 }));
      expect(hint).toContain("50%");
      expect(hint).toContain("5/10");
    });

    it("should show 100% progress when conditions met", () => {
      setupSkillDir();
      const hint = loader.getProgressHint(makePersona({ round: 10, workhoodIndex: 0.3 }));
      expect(hint).toContain("100%");
      expect(hint).toContain("10/10");
    });

    it("should cap progress at 100%", () => {
      setupSkillDir();
      const hint = loader.getProgressHint(makePersona({ round: 50, workhoodIndex: 1.0 }));
      expect(hint).toContain("100%");
      expect(hint).not.toContain("500%");
    });
  });

  // ========================================================================
  // Evolvable Content Loading
  // ========================================================================
  describe("loadEvolvableContent", () => {
    it("should load PARAMS.yaml content", () => {
      setupSkillDir();
      const content = loader.loadEvolvableContent();
      expect(content).not.toBeNull();
      expect(content).toContain("## 进化参数");
      expect(content).toContain("delta_max: 7");
    });

    it("should load EXTENSIONS.md user rules", () => {
      setupSkillDir({
        extensions: `# Extensions

## 你的自定义规则

- Rule A: Always be concise
- Rule B: Prefer code examples`,
      });
      const content = loader.loadEvolvableContent();
      expect(content).toContain("## 自定义规则");
      expect(content).toContain("Always be concise");
    });

    it("should skip empty user rules placeholder", () => {
      setupSkillDir({
        extensions: `## 你的自定义规则

<!-- 在此添加你的规则 -->`,
      });
      const content = loader.loadEvolvableContent();
      expect(content).toContain("## 进化参数");
      expect(content).not.toContain("## 自定义规则");
    });

    it("should return null when evolvable dir is missing", () => {
      // Don't create skill dir
      expect(loader.loadEvolvableContent()).toBeNull();
    });
  });
});

// Helper
function makePersona(partial: { round: number; workhoodIndex: number }) {
  return {
    id: "test",
    core: {
      frontmatter: { id: "test", name: "Test", createdAt: "2026-05-12T00:00:00Z" },
      content: "",
    },
    state: {
      personaId: "test",
      round: partial.round,
      speedWheel: "low" as const,
      workhoodIndex: partial.workhoodIndex,
      dynamicAxes: { valence: 50, arousal: 50, focus: 50, mood: 50, humor: 50, safety: 50 },
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
}
