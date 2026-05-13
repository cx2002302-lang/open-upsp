import { exec } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CliBridge, CliBridgeWriteError } from "../../src/bridge/cli-bridge.js";

vi.mock("node:child_process", () => ({
  exec: vi.fn(),
}));

vi.mock("../../src/bridge/sqlite-bridge.js", () => ({
  SQLiteBridge: vi.fn().mockImplementation(() => ({
    getNote: vi.fn().mockReturnValue({ id: "mock-note", title: "Mock" }),
    close: vi.fn(),
  })),
}));

vi.mock("../../src/config.js", () => ({
  getConfig: vi.fn().mockReturnValue({
    zettelkasten: {
      databasePath: "/mock/db.sqlite",
      compatibleSchemaVersions: ["2.0.0"],
    },
  }),
  resolvePath: vi.fn((p: string) => p),
}));

const mockedExec = vi.mocked(exec);

describe("CliBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create note with basic params", async () => {
    mockedExec.mockImplementation((_cmd, _opts, callback) => {
      if (callback) callback(null, { stdout: "Created note: test-note-id\n", stderr: "" }, null);
      return {} as ReturnType<typeof exec>;
    });

    const bridge = new CliBridge({ cliPath: "openclaw", writeDelayMs: 0 });
    const result = await bridge.createNote({ title: "Test", content: "Body" });
    expect(result).toBeDefined();

    const call = mockedExec.mock.calls[0];
    expect(call[0]).toContain("openclaw");
    expect(call[0]).toContain("zk new");
    expect(call[0]).toContain("Test");
    expect(call[0]).toContain("Body");
  });

  it("should embed resonance as UPSP-META", async () => {
    mockedExec.mockImplementation((_cmd, _opts, callback) => {
      if (callback) callback(null, { stdout: "Created note: n1\n", stderr: "" }, null);
      return {} as ReturnType<typeof exec>;
    });

    const bridge = new CliBridge({ writeDelayMs: 0 });
    await bridge.createNote({ title: "T", content: "C", resonance: 0.75, relationType: "system" });
    const cmd = mockedExec.mock.calls[0][0] as string;
    expect(cmd).toContain("UPSP-META");
    expect(cmd).toContain("0.75");
    expect(cmd).toContain("system");
  });

  it("should include tags and confidence in command", async () => {
    mockedExec.mockImplementation((_cmd, _opts, callback) => {
      if (callback) callback(null, { stdout: "Created note: n2\n", stderr: "" }, null);
      return {} as ReturnType<typeof exec>;
    });

    const bridge = new CliBridge({ writeDelayMs: 0 });
    await bridge.createNote({
      title: "T",
      content: "C",
      tags: ["ai", "config"],
      confidence: 0.8,
      source: "distilled",
    });
    const cmd = mockedExec.mock.calls[0][0] as string;
    expect(cmd).toContain("ai");
    expect(cmd).toContain("0.8");
    expect(cmd).toContain("distilled");
  });

  it("should throw when note ID cannot be parsed", async () => {
    mockedExec.mockImplementation((_cmd, _opts, callback) => {
      if (callback) callback(null, { stdout: "some random output", stderr: "" }, null);
      return {} as ReturnType<typeof exec>;
    });

    const bridge = new CliBridge({ writeDelayMs: 0 });
    await expect(bridge.createNote({ title: "T", content: "C" })).rejects.toThrow(
      CliBridgeWriteError,
    );
  });

  it("should throw when exec fails", async () => {
    mockedExec.mockImplementation((_cmd, _opts, callback) => {
      if (callback) callback(new Error("command not found"), { stdout: "", stderr: "" }, null);
      return {} as ReturnType<typeof exec>;
    });

    const bridge = new CliBridge({ writeDelayMs: 0 });
    await expect(bridge.createNote({ title: "T", content: "C" })).rejects.toThrow(
      CliBridgeWriteError,
    );
  });
});
