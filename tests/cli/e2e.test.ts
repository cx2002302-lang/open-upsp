import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const CLI_PATH = join(__dirname, "../../dist/cli.js");

function run(
  args: string[],
  env?: Record<string, string>,
): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    encoding: "utf-8",
    env: { ...process.env, ...env },
    timeout: 15000,
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  };
}

describe("CLI E2E", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "open-upsp-cli-e2e-"));
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("init", () => {
    it("should create default persona", () => {
      const result = run(["init", "-p", "test-init-default", "-d", tempDir]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Created persona");

      const personaDir = join(tempDir, "test-init-default");
      expect(existsSync(join(personaDir, "core.md"))).toBe(true);
      expect(existsSync(join(personaDir, "state.json"))).toBe(true);
      expect(existsSync(join(personaDir, "STM.md"))).toBe(true);
      expect(existsSync(join(personaDir, "LTM.md"))).toBe(true);
      expect(existsSync(join(personaDir, "relation.md"))).toBe(true);
      expect(existsSync(join(personaDir, "rules.md"))).toBe(true);
      expect(existsSync(join(personaDir, "docs.md"))).toBe(true);
    });

    it("should create persona from each template", () => {
      const templates = ["default", "developer", "researcher", "creator", "companion"];
      for (const template of templates) {
        const personaId = `test-${template}`;
        const result = run(["init", "-p", personaId, "-t", template, "-d", tempDir]);
        expect(result.status).toBe(0);
        expect(result.stdout).toContain("Created persona");
      }
    });

    it("should fail when persona already exists", () => {
      run(["init", "-p", "test-dup", "-d", tempDir]);
      const result = run(["init", "-p", "test-dup", "-d", tempDir]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("already exists");
    });

    it("should fail for unknown template", () => {
      const result = run(["init", "-p", "test-bad", "-t", "nonexistent", "-d", tempDir]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("not found");
    });
  });

  describe("status", () => {
    it("should show persona status", () => {
      run(["init", "-p", "test-status", "-d", tempDir]);
      const result = run(["status", "-p", "test-status", "-d", tempDir]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("test-status");
      expect(result.stdout).toContain("Round");
    });

    it("should fail for missing persona", () => {
      const result = run(["status", "-p", "nonexistent", "-d", tempDir]);
      expect(result.status).not.toBe(0);
    });
  });

  describe("search", () => {
    it("should search zettelkasten", () => {
      const result = run(["search", "test", "-l", "5"]);
      expect(result.status).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });
  });

  describe("context", () => {
    it("should build context for persona", () => {
      run(["init", "-p", "test-ctx", "-d", tempDir]);
      const result = run(["context", "-p", "test-ctx", "-d", tempDir]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("身份定义");
      expect(result.stdout).toContain("当前状态");
    });
  });

  describe("state update", () => {
    it("should update dynamic axes", () => {
      run(["init", "-p", "test-state", "-d", tempDir]);
      const result = run([
        "state",
        "-p",
        "test-state",
        "-d",
        tempDir,
        "--valence",
        "10",
        "--mood",
        "5",
      ]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("State updated");

      const statePath = join(tempDir, "test-state", "state.json");
      const state = JSON.parse(readFileSync(statePath, "utf-8"));
      expect(state.dynamicAxes.valence).toBe(10);
      expect(state.dynamicAxes.mood).toBe(5);
    });
  });

  describe("distill", () => {
    it("should distill text into entries", () => {
      const text = "user: 这个很重要，记下来\nuser: 我发现了一个新方法";
      const result = run(["distill", "--text", text]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("[w:");
    });
  });

  describe("config", () => {
    it("should show full config without args", () => {
      const result = run(["config"]);
      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveProperty("defaultPersona");
    });

    it("should get a config value", () => {
      const result = run(["config", "-g", "defaultPersona"]);
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe("default");
    });

    it("should set a config value", () => {
      const _configDir = join(tempDir, "config-test");
      // 使用临时 HOME 目录隔离配置
      const env = { HOME: tempDir };
      run(["init", "-p", "cfg"], env);
      const result = run(["config", "-s", "defaultPersona", "-v", "cfg-test"], env);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("cfg-test");
    });
  });
});
