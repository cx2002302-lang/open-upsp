/**
 * Multi-Agent Cooperation Flow Tests
 *
 * Dimension: End-to-End Multi-Agent Workflow
 * Simulates realistic scenarios where chat-agent (read-only) and
 * knowledge-agent (read-write) cooperate through the ZK system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  AgentConfigManager,
  CHAT_BRAIN_TOOLS,
  KNOWLEDGE_BRAIN_TOOLS,
  createMCPConfigForAgent,
} from "../../../zettelkasten/zettelkasten-github/src/integration/agent-config.js";
import {
  SessionEndHookManager,
} from "../../../zettelkasten/zettelkasten-github/src/integration/session-hook.js";
import type { DistillerService } from "../../../zettelkasten/zettelkasten-github/src/service/distiller-service.js";
import type { DistillJob } from "../../../zettelkasten/zettelkasten-github/src/core/types.js";

function createMockDistiller(overrides: Partial<DistillJob> = {}): DistillerService {
  return {
    distillYesterday: vi.fn().mockResolvedValue({
      id: "job-cooperation",
      date: "2026-05-21",
      status: "completed",
      sliceCount: 4,
      summaryCount: 3,
      decisions: [],
      createdCount: 2,
      mergedCount: 1,
      skippedCount: 0,
      ...overrides,
    } as DistillJob),
  } as unknown as DistillerService;
}

describe("ZK Multi-Agent Cooperation: End-to-End Workflows", () => {
  let agentManager: AgentConfigManager;

  beforeEach(() => {
    agentManager = new AgentConfigManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Scenario 1: Chat Agent Queries → Knowledge Agent Records", () => {
    it("should allow chat to search existing knowledge", () => {
      // Step 1: Chat agent searches for existing notes
      const chatTools = agentManager.getAllowedTools("chat");
      expect(chatTools).toContain("zk_search_notes");
      expect(chatTools).toContain("zk_get_note");

      // Chat can find relevant context for user query
      const canSearch = agentManager.isToolAllowed("chat", "zk_search_notes");
      const canRead = agentManager.isToolAllowed("chat", "zk_get_note");
      expect(canSearch && canRead).toBe(true);
    });

    it("should require knowledge agent to create new notes", () => {
      // Step 2: When chat finds nothing, knowledge agent creates note
      const chatCanCreate = agentManager.isToolAllowed("chat", "zk_create_note");
      const knowledgeCanCreate = agentManager.isToolAllowed("knowledge", "zk_create_note");

      expect(chatCanCreate).toBe(false);
      expect(knowledgeCanCreate).toBe(true);
    });

    it("should have knowledge agent with full write toolkit", () => {
      const knowledgeTools = agentManager.getAllowedTools("knowledge");
      expect(knowledgeTools).toContain("zk_create_note");
      expect(knowledgeTools).toContain("zk_update_note");
      expect(knowledgeTools).toContain("zk_run_ceqrc_workflow");
      expect(knowledgeTools).toContain("zk_distill_memory");
      expect(knowledgeTools).toContain("zk_review_note");
    });
  });

  describe("Scenario 2: Session-End Auto-Distill Cooperation", () => {
    it("should trigger distill after productive multi-agent session", async () => {
      const mockDistiller = createMockDistiller();
      const hook = new SessionEndHookManager(mockDistiller);
      hook.updateConfig({ awaitCompletion: true });

      // Simulate a session where chat and knowledge both participated
      const session = {
        sessionId: "coop-session-1",
        sessionKey: "test-key",
        startedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        messageCount: 15,
        topic: "Docker networking deep dive",
      };

      const result = await hook.onSessionEnd(session);
      expect(result.success).toBe(true);
      expect(result.slicesProcessed).toBe(4);
      expect(mockDistiller.distillYesterday).toHaveBeenCalledTimes(1);
      hook.destroy();
    });

    it("should skip distill after short chat-only session", async () => {
      const mockDistiller = createMockDistiller();
      const hook = new SessionEndHookManager(mockDistiller);

      // Short session with few messages (chat-only Q&A)
      const session = {
        sessionId: "chat-only-1",
        sessionKey: "test-key",
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        messageCount: 3,
        topic: "Quick question",
      };

      const result = await hook.onSessionEnd(session);
      expect(result.slicesProcessed).toBe(0);
      expect(mockDistiller.distillYesterday).not.toHaveBeenCalled();
      hook.destroy();
    });
  });

  describe("Scenario 3: Permission Escalation Flow", () => {
    it("should deny chat agent from running CEQRC workflow", () => {
      // CEQRC workflow creates atomic notes - write operation
      expect(agentManager.isToolAllowed("chat", "zk_run_ceqrc_workflow")).toBe(false);
      expect(agentManager.isToolAllowed("knowledge", "zk_run_ceqrc_workflow")).toBe(true);
    });

    it("should deny chat agent from reviewing notes", () => {
      // Review modifies note metadata - write operation
      expect(agentManager.isToolAllowed("chat", "zk_review_note")).toBe(false);
      expect(agentManager.isToolAllowed("knowledge", "zk_review_note")).toBe(true);
    });

    it("should deny chat agent from memory distillation", () => {
      // Distillation creates new notes - write operation
      expect(agentManager.isToolAllowed("chat", "zk_distill_memory")).toBe(false);
      expect(agentManager.isToolAllowed("knowledge", "zk_distill_memory")).toBe(true);
    });
  });

  describe("Scenario 4: Concurrent Agent Safety", () => {
    it("should maintain separate tool lists per agent", () => {
      const chatTools = new Set(agentManager.getAllowedTools("chat"));
      const knowledgeTools = new Set(agentManager.getAllowedTools("knowledge"));

      // Chat tools should be strict subset of knowledge tools
      for (const tool of chatTools) {
        expect(knowledgeTools.has(tool)).toBe(true);
      }

      // Knowledge should have strictly more tools
      expect(knowledgeTools.size).toBeGreaterThan(chatTools.size);
    });

    it("should not allow cross-agent tool list mutation", () => {
      const chatToolsBefore = agentManager.getAllowedTools("chat");
      const knowledgeToolsBefore = agentManager.getAllowedTools("knowledge");

      // Disable chat agent
      agentManager.disableAgent("chat");

      // Knowledge tools should remain unchanged
      const knowledgeToolsAfter = agentManager.getAllowedTools("knowledge");
      expect(knowledgeToolsAfter).toEqual(knowledgeToolsBefore);

      // Chat tools should be empty
      expect(agentManager.getAllowedTools("chat")).toEqual([]);

      // Re-enable and verify restoration
      agentManager.enableAgent("chat");
      expect(agentManager.getAllowedTools("chat")).toEqual(chatToolsBefore);
    });
  });

  describe("Scenario 5: MCP Config Per Agent", () => {
    it("should export read-only MCP config for chat integration", () => {
      const config = createMCPConfigForAgent("chat", agentManager);
      expect(config.enableReadOnlyTools).toBe(true);
      expect(config.enableReadWriteTools).toBe(false);
    });

    it("should export read-write MCP config for knowledge integration", () => {
      const config = createMCPConfigForAgent("knowledge", agentManager);
      expect(config.enableReadOnlyTools).toBe(true);
      expect(config.enableReadWriteTools).toBe(true);
    });

    it("should export disabled MCP config for disabled agents", () => {
      agentManager.disableAgent("chat");
      const config = createMCPConfigForAgent("chat", agentManager);
      expect(config.enableReadOnlyTools).toBe(false);
      expect(config.enableReadWriteTools).toBe(false);
    });
  });

  describe("Scenario 6: Full Cooperation Lifecycle", () => {
    it("should complete full chat→knowledge→distill workflow", async () => {
      // Phase 1: Chat agent queries (read-only)
      const chatCanSearch = agentManager.isToolAllowed("chat", "zk_search_notes");
      const chatCanGet = agentManager.isToolAllowed("chat", "zk_get_note");
      expect(chatCanSearch && chatCanGet).toBe(true);

      // Phase 2: Knowledge agent records (read-write)
      const knowledgeCanCreate = agentManager.isToolAllowed("knowledge", "zk_create_note");
      const knowledgeCanLink = agentManager.isToolAllowed("knowledge", "zk_create_link");
      expect(knowledgeCanCreate && knowledgeCanLink).toBe(true);

      // Phase 3: Session-end auto-distill
      const mockDistiller = createMockDistiller();
      const hook = new SessionEndHookManager(mockDistiller);
      hook.updateConfig({ awaitCompletion: true });

      const session = {
        sessionId: "full-lifecycle",
        sessionKey: "test-key",
        startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        messageCount: 25,
        topic: "Full cooperation test",
      };

      const result = await hook.onSessionEnd(session);
      expect(result.success).toBe(true);
      expect(result.slicesProcessed).toBe(4);
      hook.destroy();
    });
  });
});
