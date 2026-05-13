import { describe, expect, it } from "vitest";
import { SessionDistiller } from "../../src/context/distiller.js";

describe("SessionDistiller extended", () => {
  const distiller = new SessionDistiller();

  it("should extract weight 3 entry (decision)", () => {
    const text = "user: 我决定用方案A";
    const result = distiller.distill(text);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.weight).toBe(3);
  });

  it("should extract weight 2 entry (info sharing)", () => {
    const text = "user: 我使用 VSCode 作为编辑器";
    const result = distiller.distill(text);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.weight).toBe(2);
  });

  it("should return empty for non-matching lines", () => {
    const text = "hello world\nrandom chat";
    const result = distiller.distill(text);
    expect(result.entries.length).toBe(0);
  });

  it("should detect arousal increase", () => {
    const text = "user: 太兴奋了！这个结果让我惊喜";
    const result = distiller.distill(text);
    expect(result.stateDelta.arousal).toBe(5);
  });

  it("should detect arousal decrease", () => {
    const text = "user: 很平静，放松下来了";
    const result = distiller.distill(text);
    expect(result.stateDelta.arousal).toBe(-3);
  });

  it("should detect focus increase", () => {
    const text = "user: 让我们深入讨论这个问题";
    const result = distiller.distill(text);
    expect(result.stateDelta.focus).toBe(5);
  });

  it("should detect focus decrease", () => {
    const text = "user: 随便聊聊，换话题吧";
    const result = distiller.distill(text);
    expect(result.stateDelta.focus).toBe(-5);
  });

  it("should detect mood increase", () => {
    const text = "user: 今天真开心，很高兴见到你";
    const result = distiller.distill(text);
    expect(result.stateDelta.mood).toBe(5);
  });

  it("should detect mood decrease", () => {
    const text = "user: 很难过，很沮丧";
    const result = distiller.distill(text);
    expect(result.stateDelta.mood).toBe(-5);
  });

  it("should detect humor increase", () => {
    const text = "user: 哈哈，太好笑了";
    const result = distiller.distill(text);
    expect(result.stateDelta.humor).toBe(3);
  });

  it("should detect safety increase", () => {
    const text = "user: 很放心，很信任你";
    const result = distiller.distill(text);
    expect(result.stateDelta.safety).toBe(3);
  });

  it("should detect safety decrease", () => {
    const text = "user: 有点担心，不确定对不对";
    const result = distiller.distill(text);
    expect(result.stateDelta.safety).toBe(-3);
  });

  it("should handle multiple emotional signals", () => {
    const text = "user: 太好了，完美！谢谢你的帮助\nuser: 很担心结果不对";
    const result = distiller.distill(text);
    expect(result.stateDelta.valence).toBeGreaterThan(0);
    expect(result.stateDelta.safety).toBeLessThan(0);
  });

  it("should cap valence delta at 10", () => {
    const text = "user: 好好好棒棒棒赞赞赞谢谢感谢好棒完美厉害";
    const result = distiller.distill(text);
    expect(result.stateDelta.valence).toBeLessThanOrEqual(10);
  });
});
