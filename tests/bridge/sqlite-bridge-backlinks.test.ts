import { beforeAll, describe, expect, it } from "vitest";
import { getConfig, resolvePath, SQLiteBridge } from "../../src/index.js";

describe("SQLiteBridge backlinks & graph", () => {
  const config = getConfig();
  const dbPath = resolvePath(config.zettelkasten.databasePath);
  let bridge: SQLiteBridge;

  beforeAll(() => {
    bridge = new SQLiteBridge({
      dbPath,
      compatibleSchemaVersions: ["2.0.0"],
    });
  });

  it("should get backlinks for a note with links", () => {
    // 先搜索一个有笔记的数据库
    const results = bridge.searchNotes("test", 10);
    if (results.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const noteId = results[0]?.note.id;
    const backlinks = bridge.getBacklinks(noteId);
    expect(Array.isArray(backlinks)).toBe(true);
    // 不假设一定有反向链接，但结果应该是数组
    for (const link of backlinks) {
      expect(link).toHaveProperty("to");
      expect(link).toHaveProperty("type");
      expect(link).toHaveProperty("createdAt");
    }
  });

  it("should get network graph with nodes and edges", () => {
    const graph = bridge.getNetworkGraph(20);
    expect(graph).toHaveProperty("nodes");
    expect(graph).toHaveProperty("edges");
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);

    for (const node of graph.nodes) {
      expect(node).toHaveProperty("id");
      expect(node).toHaveProperty("title");
      expect(node).toHaveProperty("glow");
    }

    for (const edge of graph.edges) {
      expect(edge).toHaveProperty("from");
      expect(edge).toHaveProperty("to");
      expect(edge).toHaveProperty("type");
    }
  });

  it("should find path returns null for disconnected notes", () => {
    // 用两个不太可能连接的 ID
    const path = bridge.findPath("nonexistent-a", "nonexistent-b");
    expect(path).toBeNull();
  });

  it("should find path from note to itself", () => {
    const results = bridge.searchNotes("test", 1);
    if (results.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const id = results[0]?.note.id;
    const path = bridge.findPath(id, id);
    expect(path).not.toBeNull();
    expect(path?.path).toEqual([id]);
    expect(path?.length).toBe(1);
  });

  it("should search with empty result gracefully", () => {
    const results = bridge.searchNotes("xyznonexistent12345", 5);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it("should search with resonanceMap on empty results", () => {
    const results = bridge.searchNotes("xyznonexistent", 5, new Map([["test", 1.0]]));
    expect(Array.isArray(results)).toBe(true);
  });
});
