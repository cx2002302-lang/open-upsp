import { describe, it, expect } from "vitest";

// Smoke test: verify we can import ZK modules from sibling project
describe("ZK Module Import Smoke Test", () => {
  it("should import AgentConfigManager from ZK source", async () => {
    const { AgentConfigManager, CHAT_BRAIN_TOOLS, KNOWLEDGE_BRAIN_TOOLS } =
      await import("../../../zettelkasten/zettelkasten-github/src/integration/agent-config.js");
    expect(AgentConfigManager).toBeDefined();
    expect(CHAT_BRAIN_TOOLS).toBeDefined();
    expect(KNOWLEDGE_BRAIN_TOOLS).toBeDefined();
  });

  it("should import SessionEndHookManager from ZK source", async () => {
    const { SessionEndHookManager } =
      await import("../../../zettelkasten/zettelkasten-github/src/integration/session-hook.js");
    expect(SessionEndHookManager).toBeDefined();
  });

  it("should import CronScheduler from ZK source", async () => {
    const { ZettelkastenCronScheduler } =
      await import("../../../zettelkasten/zettelkasten-github/src/integration/cron-scheduler.js");
    expect(ZettelkastenCronScheduler).toBeDefined();
  });
});
