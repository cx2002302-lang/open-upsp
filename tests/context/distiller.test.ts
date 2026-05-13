import { describe, expect, it } from "vitest";
import { SessionDistiller } from "../../src/index.js";

describe("SessionDistiller", () => {
  it("should extract memory entries with correct weights", () => {
    const distiller = new SessionDistiller();
    const text = "user: 这个方案太棒了，记下来\nuser: 我发现了一个新的优化方法\nuser: 一般性的信息";
    const result = distiller.distill(text);
    expect(result.entries.length).toBeGreaterThanOrEqual(2);
    expect(result.entries[0].weight).toBe(5); // "记下来"
    expect(result.entries[1].weight).toBe(4); // "我发现"
  });

  it("should infer state delta from emotional signals", () => {
    const distiller = new SessionDistiller();
    const text = "user: 太好了，完美！谢谢你的帮助";
    const result = distiller.distill(text);
    expect(result.stateDelta.valence).toBeGreaterThan(0);
  });

  it("should infer relation delta for known entities", () => {
    const distiller = new SessionDistiller();
    const text = "user: 我觉得张三说得对，张三很有经验";
    const result = distiller.distill(text, ["张三", "李四"]);
    expect(result.relationDelta.get("张三")).toBeGreaterThan(0);
    expect(result.relationDelta.get("李四")).toBeLessThan(0); // 未提及，衰减
  });

  it("should return empty relationDelta when no known entities", () => {
    const distiller = new SessionDistiller();
    const result = distiller.distill("user: 随便聊聊");
    expect(result.relationDelta.size).toBe(0);
  });
});
