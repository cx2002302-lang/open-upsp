import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SKILL_ROOT = join(__dirname, "../../skill");

describe("Skill Files Validation", () => {
  describe("manifest.json", () => {
    it("should be valid JSON with required fields", () => {
      const raw = readFileSync(join(SKILL_ROOT, "manifest.json"), "utf8");
      const manifest = JSON.parse(raw);

      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(manifest.id).toBe("open-upsp");
      expect(manifest.name).toBeTruthy();
      expect(manifest.core).toBeDefined();
      expect(manifest.core.mutable).toBe(false);
      expect(manifest.evolvable).toBeDefined();
      expect(manifest.evolvable.mutable).toBe(true);
      expect(manifest.evolvable.unlockCondition).toBeDefined();
      expect(typeof manifest.evolvable.unlockCondition.round).toBe("number");
      expect(typeof manifest.evolvable.unlockCondition.workhoodIndex).toBe("number");
    });
  });

  describe("SKILL.md", () => {
    const content = readFileSync(join(SKILL_ROOT, "core/SKILL.md"), "utf8");

    it("should contain skill ID and version", () => {
      expect(content).toContain("open-upsp");
      expect(content).toContain("0.3.4");
    });

    it("should document dual-skill architecture", () => {
      expect(content).toContain("核心");
      expect(content).toContain("进化");
      expect(content).toContain("不可变");
      expect(content).toContain("可编辑");
    });

    it("should document unlock condition", () => {
      expect(content).toContain("Round >= 10");
      expect(content).toContain("workhoodIndex >= 0.3");
    });

    it("should reference ZK plugin version", () => {
      expect(content).toContain("zettelkasten");
      expect(content).toContain("v1.0.0-beta.7");
    });

    it("should have install and troubleshoot sections", () => {
      expect(content).toContain("安装");
      expect(content).toContain("故障排除");
    });
  });

  describe("PROMPT.md", () => {
    const content = readFileSync(join(SKILL_ROOT, "core/PROMPT.md"), "utf8");

    it("should describe context injection flow", () => {
      expect(content).toContain("open-upsp context");
      expect(content).toContain("system prompt");
    });

    it("should have identity consistency instructions", () => {
      expect(content).toContain("身份一致性");
      expect(content).toContain("记忆连续性");
    });

    it("should define DO and DON'T lists", () => {
      expect(content).toContain("必须做");
      expect(content).toContain("禁止做");
    });

    it("should have relation awareness section", () => {
      expect(content).toContain("关系感知");
      expect(content).toContain("共振度");
    });
  });

  describe("RULES.md", () => {
    const content = readFileSync(join(SKILL_ROOT, "core/RULES.md"), "utf8");

    it("should contain all 8 rules", () => {
      for (let i = 1; i <= 8; i++) {
        expect(content).toContain(`规则 ${i}`);
      }
    });

    it("should have Rule 1: context loading on session start", () => {
      expect(content).toContain("会话开始时加载上下文");
      expect(content).toContain("open-upsp context");
    });

    it("should have Rule 2: auto-record valuable info", () => {
      expect(content).toContain("自动记录有价值信息");
      expect(content).toContain("[w:");
    });

    it("should have Rule 3: session-end workflow", () => {
      expect(content).toContain("会话结束时执行收尾");
      expect(content).toContain("蒸馏");
      expect(content).toContain("同步到 ZK");
    });

    it("should have Rule 6: identity protection", () => {
      expect(content).toContain("身份保护");
      expect(content).toContain("你不是 X，你是 Y");
    });

    it("should have Rule 8: progressive unlock", () => {
      expect(content).toContain("进化解锁");
      expect(content).toContain("Round >= 10");
      expect(content).toContain("PARAMS.yaml");
    });

    it("should reference PARAMS.yaml for runtime params", () => {
      expect(content).toContain("PARAMS.yaml");
      expect(content).toContain("evolvable/PARAMS.yaml");
    });

    it("should be marked as immutable", () => {
      expect(content).toContain("不可变");
      expect(content).toContain("核心规则不可变");
    });
  });

  describe("PARAMS.yaml", () => {
    const content = readFileSync(join(SKILL_ROOT, "evolvable/PARAMS.yaml"), "utf8");

    it("should be parseable by simple YAML parser", () => {
      // Verify it has key sections
      expect(content).toContain("version:");
      expect(content).toContain("limits:");
      expect(content).toContain("memory:");
      expect(content).toContain("search:");
      expect(content).toContain("behavior:");
    });

    it("should have state_update.delta_max", () => {
      expect(content).toContain("delta_max:");
    });

    it("should have all six axis ranges", () => {
      expect(content).toContain("valence_range:");
      expect(content).toContain("arousal_range:");
      expect(content).toContain("focus_range:");
      expect(content).toContain("mood_range:");
      expect(content).toContain("humor_range:");
      expect(content).toContain("safety_range:");
    });

    it("should not have inline comments (parser limitation)", () => {
      // Each line with inline comment would be: key: value # comment
      // Check that no line has content after # on same line as value
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#")) continue; // standalone comment is fine
        if (!trimmed.includes(":")) continue; // not a key-value line
        const afterColon = trimmed.slice(trimmed.indexOf(":") + 1).trim();
        if (afterColon && afterColon.includes(" #")) {
          throw new Error(`Inline comment detected on line: ${trimmed}`);
        }
      }
      // If we get here, no inline comments found
      expect(true).toBe(true);
    });
  });

  describe("EXTENSIONS.md", () => {
    const content = readFileSync(join(SKILL_ROOT, "evolvable/EXTENSIONS.md"), "utf8");

    it("should have user rules marker", () => {
      expect(content).toContain("## 你的自定义规则");
    });

    it("should have template examples", () => {
      expect(content).toContain("触发");
      expect(content).toContain("动作");
      expect(content).toContain("权重");
    });

    it("should state core rules take precedence", () => {
      expect(content).toContain("核心规则优先");
    });
  });

  describe("EVOLUTION.md", () => {
    const content = readFileSync(join(SKILL_ROOT, "evolvable/EVOLUTION.md"), "utf8");

    it("should exist and be non-empty", () => {
      expect(content.length).toBeGreaterThan(50);
    });

    it("should mention unlock conditions", () => {
      expect(content).toContain("解锁");
      expect(content.toLowerCase()).toContain("round");
    });
  });
});
