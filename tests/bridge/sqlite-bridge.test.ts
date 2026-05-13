import { describe, expect, it } from "vitest";
import { getConfig, resolvePath, SQLiteBridge, ZettelkastenVersionError } from "../../src/index.js";

describe("SQLiteBridge", () => {
  const config = getConfig();
  const dbPath = resolvePath(config.zettelkasten.databasePath);

  it("should connect to local ZK database", () => {
    const bridge = new SQLiteBridge({
      dbPath,
      compatibleSchemaVersions: ["2.0.0"],
    });

    const results = bridge.searchNotes("test", 5);
    expect(results.length).toBeGreaterThan(0);
    expect(Array.isArray(results)).toBe(true);

    bridge.close();
  });

  it("should reject incompatible schema version", () => {
    expect(() => {
      const bridge = new SQLiteBridge({
        dbPath,
        compatibleSchemaVersions: ["99.0.0"],
      });
      bridge.searchNotes("test", 1);
    }).toThrow(ZettelkastenVersionError);
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
});
