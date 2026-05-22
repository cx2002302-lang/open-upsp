/**
 * Multi-Agent Permission Isolation Tests
 *
 * Dimension: Agent Permission Matrix
 * Validates that chat-agent (read-only) and knowledge-agent (read-write)
 * have correct tool access in the ZK system.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AgentConfigManager,
  CHAT_BRAIN_TOOLS,
  KNOWLEDGE_BRAIN_TOOLS,
  createMCPConfigForAgent,
  validateAgentConfig,
  type AgentConfig,
  type AgentRole,
} from "../../../zettelkasten/zettelkasten-github/src/integration/agent-config.js";

describe("ZK Multi-Agent: Permission Isolation", () => {
  let manager: AgentConfigManager;

  beforeEach(() => {
    manager = new AgentConfigManager();
  });

  describe("Chat Agent (Front-Brain)", () => {
    it("should have exactly 4 read-only tools", () => {
      const chat = manager.getAgent("chat");
      expect(chat).toBeDefined();
      expect(chat!.role).toBe("chat");
      expect(chat!.permission).toBe("read-only");
      expect(chat!.tools).toHaveLength(4);
      expect(chat!.tools).toEqual(CHAT_BRAIN_TOOLS);
    });

    it("should allow all read operations", () => {
      expect(manager.isToolAllowed("chat", "zk_search_notes")).toBe(true);
      expect(manager.isToolAllowed("chat", "zk_get_note")).toBe(true);
      expect(manager.isToolAllowed("chat", "zk_get_backlinks")).toBe(true);
      expect(manager.isToolAllowed("chat", "zk_find_path")).toBe(true);
    });

    it("should deny all write operations", () => {
      expect(manager.isToolAllowed("chat", "zk_create_note")).toBe(false);
      expect(manager.isToolAllowed("chat", "zk_update_note")).toBe(false);
      expect(manager.isToolAllowed("chat", "zk_run_ceqrc_workflow")).toBe(false);
      expect(manager.isToolAllowed("chat", "zk_distill_memory")).toBe(false);
      expect(manager.isToolAllowed("chat", "zk_review_note")).toBe(false);
    });

    it("should return read-only MCP config", () => {
      const config = createMCPConfigForAgent("chat", manager);
      expect(config.enableReadOnlyTools).toBe(true);
      expect(config.enableReadWriteTools).toBe(false);
    });

    it("should reject validation if chat has write tools", () => {
      const badConfig: AgentConfig = {
        id: "bad-chat",
        role: "chat",
        permission: "read-only",
        tools: ["zk_create_note"] as any,
        enabled: true,
      };
      const result = validateAgentConfig(badConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Chat agent cannot have"))).toBe(true);
    });
  });

  describe("Knowledge Agent (Back-Brain)", () => {
    it("should have all 10 tools including write", () => {
      const knowledge = manager.getAgent("knowledge");
      expect(knowledge).toBeDefined();
      expect(knowledge!.role).toBe("knowledge");
      expect(knowledge!.permission).toBe("read-write");
      expect(knowledge!.tools).toHaveLength(10);
      expect(knowledge!.tools).toEqual(KNOWLEDGE_BRAIN_TOOLS);
    });

    it("should allow both read and write operations", () => {
      expect(manager.isToolAllowed("knowledge", "zk_search_notes")).toBe(true);
      expect(manager.isToolAllowed("knowledge", "zk_get_note")).toBe(true);
      expect(manager.isToolAllowed("knowledge", "zk_create_note")).toBe(true);
      expect(manager.isToolAllowed("knowledge", "zk_update_note")).toBe(true);
      expect(manager.isToolAllowed("knowledge", "zk_run_ceqrc_workflow")).toBe(true);
      expect(manager.isToolAllowed("knowledge", "zk_distill_memory")).toBe(true);
      expect(manager.isToolAllowed("knowledge", "zk_review_note")).toBe(true);
    });

    it("should return read-write MCP config", () => {
      const config = createMCPConfigForAgent("knowledge", manager);
      expect(config.enableReadOnlyTools).toBe(true);
      expect(config.enableReadWriteTools).toBe(true);
    });
  });

  describe("Tool Set Inclusion", () => {
    it("should have chat tools as subset of knowledge tools", () => {
      for (const tool of CHAT_BRAIN_TOOLS) {
        expect(KNOWLEDGE_BRAIN_TOOLS).toContain(tool);
      }
    });

    it("should have exactly 6 exclusive write tools", () => {
      const writeOnly = KNOWLEDGE_BRAIN_TOOLS.filter(
        (t) => !CHAT_BRAIN_TOOLS.includes(t as any)
      );
      expect(writeOnly).toHaveLength(6);
      expect(writeOnly).toContain("zk_create_note");
      expect(writeOnly).toContain("zk_update_note");
      expect(writeOnly).toContain("zk_create_link");
      expect(writeOnly).toContain("zk_run_ceqrc_workflow");
      expect(writeOnly).toContain("zk_distill_memory");
      expect(writeOnly).toContain("zk_review_note");
    });
  });

  describe("Agent Lifecycle", () => {
    it("should disable chat agent and block all tools", () => {
      manager.disableAgent("chat");
      expect(manager.getAgent("chat")?.enabled).toBe(false);
      expect(manager.isToolAllowed("chat", "zk_search_notes")).toBe(false);
      expect(manager.getAllowedTools("chat")).toEqual([]);
    });

    it("should re-enable chat agent and restore tools", () => {
      manager.disableAgent("chat");
      manager.enableAgent("chat");
      expect(manager.isToolAllowed("chat", "zk_search_notes")).toBe(true);
      expect(manager.getAllowedTools("chat")).toEqual(CHAT_BRAIN_TOOLS);
    });

    it("should reset to defaults after modifications", () => {
      manager.disableAgent("chat");
      manager.unregisterAgent("knowledge");
      manager.resetToDefaults();
      expect(manager.listAgents()).toHaveLength(2);
      expect(manager.getAgent("chat")?.enabled).toBe(true);
      expect(manager.getAgent("knowledge")).toBeDefined();
    });
  });

  describe("Cross-Agent Isolation", () => {
    it("should not leak knowledge tools to chat agent", () => {
      // Simulate: chat agent tries to use knowledge-only tool
      const chatConfig = createMCPConfigForAgent("chat", manager);
      const knowledgeConfig = createMCPConfigForAgent("knowledge", manager);

      expect(chatConfig.enableReadWriteTools).toBe(false);
      expect(knowledgeConfig.enableReadWriteTools).toBe(true);
    });

    it("should return empty config for unknown agent role", () => {
      const config = createMCPConfigForAgent("unknown" as AgentRole, manager);
      expect(config.enableReadOnlyTools).toBe(false);
      expect(config.enableReadWriteTools).toBe(false);
    });
  });
});
