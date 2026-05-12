import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContextBuilder,
  getConfig,
  PersonaLoader,
  PersonaSaver,
  resolvePath,
  SQLiteBridge,
} from "../../src/index.js";

describe("End-to-end: Persona → Context", () => {
  let tempDir: string;
  let loader: PersonaLoader;
  let saver: PersonaSaver;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "open-upsp-e2e-"));
    loader = new PersonaLoader(tempDir);
    saver = new PersonaSaver(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should build context with persona + ZK knowledge", () => {
    // 创建位格
    const persona = {
      id: "e2e",
      core: {
        frontmatter: { id: "e2e", name: "E2E Test", createdAt: "2026-05-12T00:00:00Z" },
        content: "# Identity\n\nTest persona for e2e",
      },
      state: {
        personaId: "e2e",
        round: 5,
        speedWheel: "low" as const,
        workhoodIndex: 0.3,
        dynamicAxes: { valence: 10, arousal: 30, focus: 80, mood: 50, humor: 40, safety: 70 },
        lastUpdated: "2026-05-12T00:00:00Z",
        sessionCount: 2,
        rhythmPoints: [],
      },
      stm: {
        frontmatter: {},
        entries: [{ weight: 2, timestamp: "2026-05-12T00:00:00Z", content: "E2E test memory" }],
      },
      ltm: { frontmatter: {}, entries: [] },
      relation: {
        entries: [
          { entity: "user", resonance: 0.8, type: "human" as const, description: "Test user" },
        ],
      },
      rules: { sections: [{ title: "Test Rules", rules: ["Rule 1"] }] },
      docs: { terms: [{ term: "E2E", definition: "End to end testing" }] },
    };

    saver.save(persona);
    const loaded = loader.load("e2e");

    // 连接 ZK
    const config = getConfig();
    const dbPath = resolvePath(config.zettelkasten.databasePath);
    const bridge = new SQLiteBridge({
      dbPath,
      compatibleSchemaVersions: ["2.0.0"],
    });

    // 构建上下文
    const builder = new ContextBuilder(bridge);
    const context = builder.build(loaded, { query: "test" });

    // 验证上下文包含位格信息
    expect(context).toContain("E2E Test");
    expect(context).toContain("**轮数**: 5");
    expect(context).toContain("E2E test memory");
    expect(context).toContain("user");
    expect(context).toContain("0.80");

    // 验证上下文包含知识检索部分（即使为空也要有标题）
    expect(context).toContain("知识库检索");

    bridge.close();
  });
});
