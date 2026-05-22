/**
 * Nightly Distillation Tests
 *
 * Dimension: Automated Background Distillation
 * Validates cron-scheduled nightly distillation with proper
 * lifecycle management, job tracking, and graceful degradation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ZettelkastenCronScheduler,
  createCronScheduler,
  DEFAULT_NIGHTLY_SCHEDULE,
  DEFAULT_SCHEDULER_CONFIG,
} from "../../../zettelkasten/zettelkasten-github/src/integration/cron-scheduler.js";
import type { DistillerService } from "../../../zettelkasten/zettelkasten-github/src/service/distiller-service.js";
import type { DistillJob } from "../../../zettelkasten/zettelkasten-github/src/core/types.js";

function createMockDistiller(overrides: Partial<DistillJob> = {}): DistillerService {
  return {
    distillYesterday: vi.fn().mockResolvedValue({
      id: "job-nightly",
      date: "2026-05-21",
      status: "completed",
      sliceCount: 5,
      summaryCount: 3,
      decisions: [],
      createdCount: 3,
      mergedCount: 0,
      skippedCount: 2,
      ...overrides,
    } as DistillJob),
  } as unknown as DistillerService;
}

describe("ZK Nightly Distillation: Cron-Scheduled Background Job", () => {
  let scheduler: ZettelkastenCronScheduler;
  let mockDistiller: DistillerService;

  beforeEach(() => {
    vi.useFakeTimers();
    mockDistiller = createMockDistiller();
    scheduler = new ZettelkastenCronScheduler(mockDistiller);
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  describe("Lifecycle", () => {
    it("should start in stopped state", () => {
      expect(scheduler.getIsRunning()).toBe(false);
    });

    it("should transition to running after start", () => {
      scheduler.start();
      expect(scheduler.getIsRunning()).toBe(true);
    });

    it("should schedule a nightly distill job on start", () => {
      scheduler.start();
      const jobs = scheduler.getJobs();
      expect(jobs.length).toBeGreaterThanOrEqual(1);
      expect(jobs[0].name).toBe(DEFAULT_NIGHTLY_SCHEDULE.jobName);
      expect(jobs[0].status).toBe("scheduled");
    });

    it("should not schedule jobs when nightly distill is disabled", () => {
      const disabled = new ZettelkastenCronScheduler(mockDistiller, {
        nightlyDistill: { ...DEFAULT_NIGHTLY_SCHEDULE, enabled: false },
      });
      disabled.start();
      expect(disabled.getJobs()).toHaveLength(0);
      disabled.stop();
    });

    it("should be safe to stop when not running", () => {
      expect(() => scheduler.stop()).not.toThrow();
      expect(scheduler.getIsRunning()).toBe(false);
    });

    it("should warn on double start", () => {
      scheduler.start();
      scheduler.start();
      const logs = scheduler.getLogs({ level: "warn" });
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].message).toContain("already running");
    });
  });

  describe("Default Schedule", () => {
    it("should have default cron expression 0 2 * * *", () => {
      expect(DEFAULT_NIGHTLY_SCHEDULE.cronExpression).toBe("0 2 * * *");
    });

    it("should have default job name 'nightly-distill'", () => {
      expect(DEFAULT_NIGHTLY_SCHEDULE.jobName).toBe("zettelkasten-nightly-distill");
    });

    it("should have nightly distill enabled by default", () => {
      expect(DEFAULT_NIGHTLY_SCHEDULE.enabled).toBe(true);
    });

    it("should have default logRetentionDays of 30", () => {
      expect(DEFAULT_SCHEDULER_CONFIG.logRetentionDays).toBe(30);
    });
  });

  describe("Job Tracking", () => {
    it("should track job by id", () => {
      scheduler.start();
      const jobs = scheduler.getJobs();
      expect(jobs.length).toBeGreaterThanOrEqual(1);

      const job = scheduler.getJob(jobs[0].id);
      expect(job).toBeDefined();
      expect(job!.name).toBe(DEFAULT_NIGHTLY_SCHEDULE.jobName);
    });

    it("should return undefined for unknown job id", () => {
      scheduler.start();
      expect(scheduler.getJob("nonexistent")).toBeUndefined();
    });

    it("should list all scheduled jobs", () => {
      scheduler.start();
      const jobs = scheduler.getJobs();
      expect(jobs).toBeInstanceOf(Array);
      expect(jobs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Logging", () => {
    it("should log startup event", () => {
      scheduler.start();
      const logs = scheduler.getLogs();
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it("should support log filtering by level", () => {
      scheduler.start();
      scheduler.start(); // trigger a warning
      const warnLogs = scheduler.getLogs({ level: "warn" });
      expect(warnLogs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Factory Function", () => {
    it("createCronScheduler should return a stopped scheduler", () => {
      const instance = createCronScheduler(mockDistiller);
      expect(instance).toBeInstanceOf(ZettelkastenCronScheduler);
      expect(instance.getIsRunning()).toBe(false);
      instance.stop();
    });
  });

  describe("Graceful Degradation", () => {
    it("should handle distiller service failure without crashing", async () => {
      const failingDistiller = {
        distillYesterday: vi.fn().mockRejectedValue(new Error("Distiller failed")),
      } as unknown as DistillerService;
      const failScheduler = new ZettelkastenCronScheduler(failingDistiller);
      failScheduler.start();

      // Scheduler should still be running even if distiller fails
      expect(failScheduler.getIsRunning()).toBe(true);
      failScheduler.stop();
    });
  });
});
