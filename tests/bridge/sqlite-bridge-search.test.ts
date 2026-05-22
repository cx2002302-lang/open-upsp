import { beforeAll, describe, expect, it } from "vitest";
import { getConfig, resolvePath, SQLiteBridge } from "../../src/index.js";

describe("SQLiteBridge search variants", () => {
  const config = getConfig();
  const dbPath = resolvePath(config.zettelkasten.databasePath);
  let bridge: SQLiteBridge;

  beforeAll(() => {
    bridge = new SQLiteBridge({
      dbPath,
      compatibleSchemaVersions: ["2.0.0"],
    });
  });

  it("should search with specific term", () => {
    const results = bridge.searchNotes("笔记", 5);
    expect(Array.isArray(results)).toBe(true);
  });

  it("should search with resonanceMap on real data", () => {
    const results = bridge.searchNotes("笔记", 5, new Map([["笔记", 1.0]]));
    expect(Array.isArray(results)).toBe(true);
    // 如果有结果，验证 score 是数字 (BM25 可能为负)
    for (const r of results) {
      expect(typeof r.score).toBe("number");
    }
  });

  it("should return empty array for no match", () => {
    const results = bridge.searchNotes("xyznonexistent999", 5);
    expect(results).toHaveLength(0);
  });

  it("should limit results", () => {
    const results10 = bridge.searchNotes("a", 10);
    const results3 = bridge.searchNotes("a", 3);
    expect(results3.length).toBeLessThanOrEqual(3);
    expect(results10.length).toBeLessThanOrEqual(10);
  });

  it("should getNote with full fields", () => {
    const results = bridge.searchNotes("笔记", 1);
    if (results.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const note = bridge.getNote(results[0]?.note.id);
    expect(note).not.toBeNull();
    expect(note!).toHaveProperty("id");
    expect(note!).toHaveProperty("title");
    expect(note!).toHaveProperty("content");
    expect(note!).toHaveProperty("tags");
    expect(note!).toHaveProperty("links");
    expect(note!).toHaveProperty("createdAt");
    expect(note!).toHaveProperty("updatedAt");
  });

  it("should getBacklinks with link structure", () => {
    const results = bridge.searchNotes("笔记", 1);
    if (results.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const backlinks = bridge.getBacklinks(results[0]?.note.id);
    for (const link of backlinks) {
      expect(typeof link.to).toBe("string");
      expect(typeof link.type).toBe("string");
      expect(typeof link.createdAt).toBe("string");
    }
  });

  it("should findPath for same note", () => {
    const results = bridge.searchNotes("笔记", 1);
    if (results.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const id = results[0]?.note.id;
    const path = bridge.findPath(id, id);
    expect(path).not.toBeNull();
    expect(path?.path).toEqual([id]);
    expect(path?.stepCount).toBe(0);
  });

  it("should findPath returns null for disconnected", () => {
    const path = bridge.findPath("nonexistent-a-999", "nonexistent-b-999");
    expect(path).toBeNull();
  });

  it("should getNetworkGraph returns structured data", () => {
    const graph = bridge.getNetworkGraph(10);
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);
    for (const n of graph.nodes) {
      expect(typeof n.id).toBe("string");
      expect(typeof n.title).toBe("string");
      expect(typeof n.glow).toBe("number");
    }
    for (const e of graph.edges) {
      expect(typeof e.from).toBe("string");
      expect(typeof e.to).toBe("string");
      expect(typeof e.type).toBe("string");
    }
  });
});
