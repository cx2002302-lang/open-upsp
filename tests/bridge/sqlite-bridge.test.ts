import { describe, expect, it } from "vitest";
import { SQLiteBridge, ZettelkastenVersionError } from "../../src/index.js";
import { createZkFixture } from "../helpers/zk-fixture.js";

describe("SQLiteBridge", () => {
  it("should connect to fixture database with schema 2.0.0", () => {
    const fixture = createZkFixture({ schemaVersion: "2.0.0" });
    try {
      const bridge = new SQLiteBridge({
        dbPath: fixture.dbPath,
        compatibleSchemaVersions: ["2.0.0"],
      });

      const results = bridge.searchNotes("test", 5);
      expect(results.length).toBeGreaterThan(0);
      expect(Array.isArray(results)).toBe(true);

      bridge.close();
    } finally {
      fixture.cleanup();
    }
  });

  it("should accept schema version 2.1.0", () => {
    const fixture = createZkFixture({ schemaVersion: "2.1.0" });
    try {
      const bridge = new SQLiteBridge({
        dbPath: fixture.dbPath,
        compatibleSchemaVersions: ["2.0.0"],
      });

      const results = bridge.searchNotes("test", 5);
      expect(results.length).toBeGreaterThan(0);
      // archive 文件夹的笔记不应出现在结果中
      expect(results.some((r) => r.note.folder === "archive")).toBe(false);

      bridge.close();
    } finally {
      fixture.cleanup();
    }
  });

  it("should reject incompatible schema version", () => {
    const fixture = createZkFixture({ schemaVersion: "99.0.0" });
    try {
      expect(() => {
        const bridge = new SQLiteBridge({
          dbPath: fixture.dbPath,
          compatibleSchemaVersions: ["2.0.0"],
        });
        bridge.searchNotes("test", 1);
      }).toThrow(ZettelkastenVersionError);
    } finally {
      fixture.cleanup();
    }
  });

  it("should handle missing database gracefully", () => {
    expect(() => {
      const bridge = new SQLiteBridge({
        dbPath: "/nonexistent/path/db.sqlite",
        compatibleSchemaVersions: ["2.0.0"],
      });
      bridge.searchNotes("test", 1);
    }).toThrow(/not found|directory does not exist/);
  });

  it("should search via FTS id join when zettel_fts has id column", () => {
    const fixture = createZkFixture({ schemaVersion: "2.1.0", ftsHasIdColumn: true });
    try {
      const bridge = new SQLiteBridge({
        dbPath: fixture.dbPath,
        compatibleSchemaVersions: ["2.0.0"],
      });

      const results = bridge.searchNotes("笔记", 5);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.note.id === "fixture-note-2")).toBe(true);

      bridge.close();
    } finally {
      fixture.cleanup();
    }
  });

  it("should fall back to rowid join when zettel_fts has no id column", () => {
    const fixture = createZkFixture({ schemaVersion: "2.1.0", ftsHasIdColumn: false });
    try {
      const bridge = new SQLiteBridge({
        dbPath: fixture.dbPath,
        compatibleSchemaVersions: ["2.0.0"],
      });

      const results = bridge.searchNotes("笔记", 5);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.note.id === "fixture-note-2")).toBe(true);

      bridge.close();
    } finally {
      fixture.cleanup();
    }
  });

  it("should fall back to LIKE search when zettel_fts is missing", () => {
    const fixture = createZkFixture({ schemaVersion: "2.1.0", withFts: false });
    try {
      const bridge = new SQLiteBridge({
        dbPath: fixture.dbPath,
        compatibleSchemaVersions: ["2.0.0"],
      });

      const results = bridge.searchNotes("test", 5);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.note.id === "fixture-note-1")).toBe(true);

      bridge.close();
    } finally {
      fixture.cleanup();
    }
  });
});
