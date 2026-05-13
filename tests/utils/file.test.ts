import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureDir, readJson, readText, writeJson, writeText } from "../../src/utils/file.js";

describe("file utils", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "open-upsp-file-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("ensureDir", () => {
    it("should create directory if not exists", () => {
      const dir = join(tempDir, "a", "b", "c");
      ensureDir(dir);
      expect(existsSync(dir)).toBe(true);
    });

    it("should not throw if directory already exists", () => {
      ensureDir(tempDir);
      ensureDir(tempDir);
    });
  });

  describe("readText", () => {
    it("should read existing file", () => {
      const path = join(tempDir, "test.txt");
      writeText(path, "hello world");
      expect(readText(path)).toBe("hello world");
    });

    it("should return null for non-existent file", () => {
      expect(readText(join(tempDir, "nonexistent.txt"))).toBeNull();
    });
  });

  describe("writeText", () => {
    it("should write and auto-create parent dirs", () => {
      const path = join(tempDir, "deep", "nested", "file.txt");
      writeText(path, "content");
      expect(readText(path)).toBe("content");
    });
  });

  describe("readJson", () => {
    it("should parse valid JSON", () => {
      const path = join(tempDir, "config.json");
      writeText(path, '{"key": "value"}');
      expect(readJson<Record<string, string>>(path)).toEqual({ key: "value" });
    });

    it("should return null for non-existent file", () => {
      expect(readJson(join(tempDir, "missing.json"))).toBeNull();
    });

    it("should return null for invalid JSON", () => {
      const path = join(tempDir, "bad.json");
      writeText(path, "not json");
      expect(readJson(path)).toBeNull();
    });
  });

  describe("writeJson", () => {
    it("should serialize and write", () => {
      const path = join(tempDir, "data.json");
      writeJson(path, { a: 1, b: [2, 3] });
      const content = readText(path);
      expect(JSON.parse(content!)).toEqual({ a: 1, b: [2, 3] });
    });
  });
});
