/**
 * Session Hook Tests
 *
 * Dimension: Session-End Automatic Distillation
 * Validates that ZK automatically distills session memories
 * when an OpenClaw session ends, with proper threshold filtering.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  SessionEndHookManager,
  createSessionEndHook,
  DEFAULT_SESSION_HOOK_CONFIG,
  type SessionInfo,
} from "../../../zettelkasten/zettelkasten-github/src/integration/session-hook.js";
import type { DistillerService } from "../../../zettelkasten/zettelkasten-github/src/service/distiller-service.js";
import type { DistillJob } from "../../../zettelkasten/zettelkasten-github/src/core/types.js";

function createMockDistiller(overrides: Partial<DistillJob> = {}): DistillerService {
  return {
    distillYesterday: vi.fn().mockResolvedValue({
      id: "job-test",
      date: "2026-05-21",
      status: "completed",
      sliceCount: 3,
      summaryCount: 2,
      decisions: [],
      createdCount: 2,
      mergedCount: 0,
      skippedCount: 1,
      ...overrides,
    } as DistillJob),
  } as unknown as DistillerService;
}

function createSessionInfo(overrides: Partial<SessionInfo> = {}): SessionInfo {
  const now = new Date("2026-05-22T10:00:00.000Z");
  const started = new Date(now.getTime() - 10 * 60 * 1000);
  return {
    sessionId: `session-${Math.random().toString(36).slice(2, 8)}`,
    sessionKey: "test-key",
    startedAt: started.toISOString(),
    endedAt: now.toISOString(),
    messageCount: 10,
    topic: "Test topic",
    ...overrides,
  };
}

describe("ZK Session Hook: Auto-Distill on Session End", () => {
  let manager: SessionEndHookManager;
  let mockDistiller: DistillerService;

  beforeEach(() => {
    vi.useFakeTimers();
    mockDistiller = createMockDistiller();
    manager = new SessionEndHookManager(mockDistiller);
  });

  afterEach(() => {
    manager.destroy();
    vi.useRealTimers();
  });

  describe("Threshold Filtering", () => {
    it("should skip short sessions (< 5 min)", async () => {
      const now = new Date("2026-05-22T10:00:00.000Z");
      const shortSession = createSessionInfo({
        startedAt: now.toISOString(),
        endedAt: now.toISOString(),
        messageCount: 20,
      });
      const result = await manager.onSessionEnd(shortSession);
      expect(result.success).toBe(true);
      expect(result.slicesProcessed).toBe(0);
      expect(mockDistiller.distillYesterday).not.toHaveBeenCalled();
    });

    it("should skip low-message sessions (< 5 messages)", async () => {
      const shortSession = createSessionInfo({ messageCount: 2 });
      const result = await manager.onSessionEnd(shortSession);
      expect(result.success).toBe(true);
      expect(result.slicesProcessed).toBe(0);
    });

    it("should process sessions meeting both thresholds", async () => {
      manager.updateConfig({ awaitCompletion: true });
      const session = createSessionInfo({ messageCount: 10 });
      const result = await manager.onSessionEnd(session);
      expect(result.success).toBe(true);
      expect(result.slicesProcessed).toBe(3);
      expect(mockDistiller.distillYesterday).toHaveBeenCalledTimes(1);
    });

    it("should respect custom minSessionMessages threshold", async () => {
      manager.updateConfig({ minSessionMessages: 20, awaitCompletion: true });
      const session = createSessionInfo({ messageCount: 15 });
      const result = await manager.onSessionEnd(session);
      expect(result.slicesProcessed).toBe(0);

      const longSession = createSessionInfo({ messageCount: 25 });
      const result2 = await manager.onSessionEnd(longSession);
      expect(result2.slicesProcessed).toBe(3);
    });
  });

  describe("Execution Modes", () => {
    it("should run synchronously when awaitCompletion=true", async () => {
      manager.updateConfig({ awaitCompletion: true });
      const session = createSessionInfo();
      const result = await manager.onSessionEnd(session);
      expect(result.slicesProcessed).toBe(3);
      expect(manager.hasPending()).toBe(false);
    });

    it("should run asynchronously when awaitCompletion=false", async () => {
      manager.updateConfig({ awaitCompletion: false });
      const session = createSessionInfo();
      const result = await manager.onSessionEnd(session);
      expect(result.slicesProcessed).toBe(0); // async returns immediately
      expect(manager.hasPending()).toBe(true);

      await manager.waitForPending();
      expect(manager.hasPending()).toBe(false);
      expect(mockDistiller.distillYesterday).toHaveBeenCalledTimes(1);
    });
  });

  describe("Lifecycle Management", () => {
    it("should be disabled when enabled=false", async () => {
      manager.updateConfig({ enabled: false, awaitCompletion: true });
      const session = createSessionInfo();
      const result = await manager.onSessionEnd(session);
      expect(result.slicesProcessed).toBe(0);
      expect(mockDistiller.distillYesterday).not.toHaveBeenCalled();
    });

    it("should handle initialization idempotently", () => {
      manager.initialize();
      expect(manager.hasPending()).toBe(false);
      manager.initialize(); // double init should be safe
      expect(manager.hasPending()).toBe(false);
    });

    it("should clean up on destroy", async () => {
      manager.updateConfig({ awaitCompletion: false });
      await manager.onSessionEnd(createSessionInfo());
      expect(manager.getPendingCount()).toBe(1);

      manager.destroy();
      expect(manager.getPendingCount()).toBe(0);
    });
  });

  describe("Event System", () => {
    it("should emit session_end event", async () => {
      const listener = vi.fn();
      manager.addEventListener(listener);
      manager.updateConfig({ awaitCompletion: true });

      const session = createSessionInfo({ sessionId: "evt-1" });
      await manager.onSessionEnd(session);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "session_end",
          sessionId: "evt-1",
        })
      );
    });

    it("should emit session_distill_complete on success", async () => {
      const listener = vi.fn();
      manager.addEventListener(listener);
      manager.updateConfig({ awaitCompletion: true });

      await manager.onSessionEnd(createSessionInfo());

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: "session_distill_complete" })
      );
    });

    it("should emit session_distill_failed on error", async () => {
      const failingDistiller = createMockDistiller({ status: "failed", error: "Distill failed" });
      const failManager = new SessionEndHookManager(failingDistiller);
      const listener = vi.fn();
      failManager.addEventListener(listener);
      failManager.updateConfig({ awaitCompletion: true });

      const result = await failManager.onSessionEnd(createSessionInfo());
      expect(result.success).toBe(false);
      failManager.destroy();
    });

    it("should handle listener errors gracefully", () => {
      const badListener = vi.fn().mockImplementation(() => {
        throw new Error("Listener error");
      });
      manager.addEventListener(badListener);
      expect(() => manager.initialize()).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle distillation service errors", async () => {
      const failingDistiller = {
        distillYesterday: vi.fn().mockRejectedValue(new Error("Service down")),
      } as unknown as DistillerService;
      const failManager = new SessionEndHookManager(failingDistiller);
      failManager.updateConfig({ awaitCompletion: true });

      const result = await failManager.onSessionEnd(createSessionInfo());
      expect(result.success).toBe(false);
      expect(result.error).toBe("Service down");
      failManager.destroy();
    });

    it("should retry up to maxRetries", async () => {
      const failingDistiller = createMockDistiller({ status: "failed", error: "Retry" });
      const retryManager = new SessionEndHookManager(failingDistiller, { maxRetries: 2 });

      const promise = retryManager.retrySession(createSessionInfo(), 1);
      await vi.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.success).toBe(false);
      retryManager.destroy();
    });
  });

  describe("Factory Functions", () => {
    it("createSessionEndHook should return an instance", () => {
      const instance = createSessionEndHook(mockDistiller);
      expect(instance).toBeInstanceOf(SessionEndHookManager);
      instance.destroy();
    });
  });
});
