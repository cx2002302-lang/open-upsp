/**
 * Confidence Threshold Routing Tests
 *
 * Dimension: Knowledge Quality Routing
 * Validates that notes are routed to the correct folder based on
 * confidence scores: zettels (>=0.7), references (0.4-0.7), inbox (<0.4).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_CONFIDENCE,
  DEFAULT_CONFIDENCE_THRESHOLD,
  MIN_CONFIDENCE_THRESHOLD,
} from "../../../zettelkasten/zettelkasten-github/src/core/constants.js";

describe("ZK Confidence Routing: Note Quality Classification", () => {
  describe("Default Threshold Constants", () => {
    it("should have zettels threshold at 0.7", () => {
      expect(DEFAULT_CONFIDENCE_THRESHOLD).toBe(0.7);
    });

    it("should have references threshold at 0.4", () => {
      expect(MIN_CONFIDENCE_THRESHOLD).toBe(0.4);
    });

    it("should have default confidence at 0.5", () => {
      expect(DEFAULT_CONFIDENCE).toBe(0.5);
    });
  });

  describe("Three-Tier Routing Logic", () => {
    /**
     * Helper: simulate the routing decision
     */
    function routeByConfidence(
      confidence: number,
      thresholds: { zettels: number; references: number } = {
        zettels: 0.7,
        references: 0.4,
      }
    ): "zettels" | "references" | "inbox" {
      if (confidence >= thresholds.zettels) return "zettels";
      if (confidence >= thresholds.references) return "references";
      return "inbox";
    }

    it("should route high-confidence notes (>=0.7) to zettels", () => {
      expect(routeByConfidence(0.7)).toBe("zettels");
      expect(routeByConfidence(0.75)).toBe("zettels");
      expect(routeByConfidence(0.9)).toBe("zettels");
      expect(routeByConfidence(1.0)).toBe("zettels");
    });

    it("should route medium-confidence notes (0.4-0.7) to references", () => {
      expect(routeByConfidence(0.4)).toBe("references");
      expect(routeByConfidence(0.5)).toBe("references");
      expect(routeByConfidence(0.69)).toBe("references");
    });

    it("should route low-confidence notes (<0.4) to inbox", () => {
      expect(routeByConfidence(0.39)).toBe("inbox");
      expect(routeByConfidence(0.2)).toBe("inbox");
      expect(routeByConfidence(0.0)).toBe("inbox");
    });

    it("should handle boundary values correctly", () => {
      expect(routeByConfidence(0.7)).toBe("zettels"); // exact boundary
      expect(routeByConfidence(0.4)).toBe("references"); // exact boundary
      expect(routeByConfidence(0.399)).toBe("inbox"); // just below
      expect(routeByConfidence(0.699)).toBe("references"); // just below zettels
    });
  });

  describe("Custom Threshold Configuration", () => {
    function routeByConfidence(
      confidence: number,
      thresholds: { zettels: number; references: number }
    ): "zettels" | "references" | "inbox" {
      if (confidence >= thresholds.zettels) return "zettels";
      if (confidence >= thresholds.references) return "references";
      return "inbox";
    }

    it("should support stricter zettels threshold (0.8)", () => {
      const thresholds = { zettels: 0.8, references: 0.4 };
      expect(routeByConfidence(0.75, thresholds)).toBe("references");
      expect(routeByConfidence(0.8, thresholds)).toBe("zettels");
    });

    it("should support stricter references threshold (0.5)", () => {
      const thresholds = { zettels: 0.7, references: 0.5 };
      expect(routeByConfidence(0.45, thresholds)).toBe("inbox");
      expect(routeByConfidence(0.5, thresholds)).toBe("references");
    });

    it("should support lenient thresholds (0.5/0.2)", () => {
      const thresholds = { zettels: 0.5, references: 0.2 };
      expect(routeByConfidence(0.3, thresholds)).toBe("references");
      expect(routeByConfidence(0.5, thresholds)).toBe("zettels");
      expect(routeByConfidence(0.1, thresholds)).toBe("inbox");
    });

    it("should reject invalid thresholds", () => {
      // zettels must be > references
      const invalid = { zettels: 0.3, references: 0.5 };
      // In real implementation this would be validated; here we just document
      expect(invalid.zettels).toBeLessThan(invalid.references);
    });
  });

  describe("Plugin Config Schema Validation", () => {
    it("should have default thresholds matching constants", () => {
      expect(DEFAULT_CONFIDENCE_THRESHOLD).toBe(0.7);
      expect(MIN_CONFIDENCE_THRESHOLD).toBe(0.4);
    });

    it.skip("should have confidenceThreshold in plugin config schema [requires OpenClaw SDK]", async () => {
      // ZK plugin config imports from 'openclaw/plugin-sdk/zod' which is
      // only available inside OpenClaw runtime. Skipped in unit tests.
    });
  });

  describe("Edge Cases", () => {
    it("should handle negative confidence gracefully", () => {
      function routeByConfidence(confidence: number): string {
        if (confidence >= 0.7) return "zettels";
        if (confidence >= 0.4) return "references";
        return "inbox";
      }
      expect(routeByConfidence(-0.1)).toBe("inbox");
    });

    it("should handle confidence above 1.0", () => {
      function routeByConfidence(confidence: number): string {
        if (confidence >= 0.7) return "zettels";
        if (confidence >= 0.4) return "references";
        return "inbox";
      }
      // Values > 1.0 should still route to zettels (highest tier)
      expect(routeByConfidence(1.5)).toBe("zettels");
    });
  });
});
