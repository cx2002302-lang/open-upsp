import type { MemoryEntry } from "../persona/types.js";

export interface DistillResult {
  entries: MemoryEntry[];
  stateDelta: {
    valence?: number;
    arousal?: number;
    focus?: number;
    mood?: number;
    humor?: number;
    safety?: number;
  };
  relationDelta: Map<string, number>; // entity -> resonance delta
}

/**
 * 会话蒸馏器 — 从对话文本中提取有价值的记忆条目和状态变化。
 *
 * Phase 2 采用基于规则的轻量实现，不依赖 LLM。
 * Phase 3 可升级为 LLM 驱动的深度蒸馏。
 */
export class SessionDistiller {
  distill(sessionText: string, knownEntities?: string[]): DistillResult {
    const lines = sessionText.split("\n").filter((l) => l.trim());
    const entries: MemoryEntry[] = [];
    let stateDelta: DistillResult["stateDelta"] = {};

    for (const line of lines) {
      const entry = this.extractEntry(line);
      if (entry) {
        entries.push(entry);
      }
    }

    stateDelta = this.inferStateDelta(sessionText);
    const relationDelta = this.inferRelationDelta(sessionText, knownEntities);

    return { entries, stateDelta, relationDelta };
  }

  private extractEntry(line: string): MemoryEntry | null {
    const trimmed = line.trim();
    const now = new Date().toISOString();

    // 权重 5：用户明确指令
    const explicitPatterns = [
      /^\[?user\]?[\]:：]\s*.*(记下来|记住|记录|保存|归档)/i,
      /^\[?user\]?[\]:：]\s*.*(重要|关键|务必)/i,
    ];
    for (const pattern of explicitPatterns) {
      if (pattern.test(trimmed)) {
        const content = trimmed.replace(/^\[?user\]?[:：]\s*/i, "").trim();
        return { weight: 5, timestamp: now, content };
      }
    }

    // 权重 4：新知识/发现
    const discoveryPatterns = [
      /^\[?user\]?[\]:：]\s*.*(我发现|原来|才知道|原来如此|学到了)/i,
      /^\[?user\]?[\]:：]\s*.*(解决了|搞定了|完成了)/i,
    ];
    for (const pattern of discoveryPatterns) {
      if (pattern.test(trimmed)) {
        const content = trimmed.replace(/^\[?user\]?[:：]\s*/i, "").trim();
        return { weight: 4, timestamp: now, content };
      }
    }

    // 权重 3：问题、决策、方案
    const decisionPatterns = [
      /^\[?user\]?[\]:：]\s*.*(决定|选择|用.*方案|打算)/i,
      /^\[?user\]?[\]:：]\s*.*(为什么|怎么|如何|请教)/i,
    ];
    for (const pattern of decisionPatterns) {
      if (pattern.test(trimmed)) {
        const content = trimmed.replace(/^\[?user\]?[:：]\s*/i, "").trim();
        return { weight: 3, timestamp: now, content };
      }
    }

    // 权重 2：一般性信息分享
    const infoPatterns = [
      /^\[?user\]?[\]:：]\s*.*(我使用|我在用|我的.*是)/i,
      /^\[?user\]?[\]:：]\s*.*(推荐|建议|可以试)/i,
    ];
    for (const pattern of infoPatterns) {
      if (pattern.test(trimmed)) {
        const content = trimmed.replace(/^\[?user\]?[:：]\s*/i, "").trim();
        return { weight: 2, timestamp: now, content };
      }
    }

    return null;
  }

  private inferStateDelta(text: string): DistillResult["stateDelta"] {
    const delta: DistillResult["stateDelta"] = {};
    const lower = text.toLowerCase();

    // valence（效价）
    const positiveSignals = ["谢谢", "感谢", "赞", "好", "棒", "完美", "厉害"];
    const negativeSignals = ["不对", "错了", "不行", "糟糕", "失望", "烦"];
    const posCount = positiveSignals.filter((s) => lower.includes(s)).length;
    const negCount = negativeSignals.filter((s) => lower.includes(s)).length;
    if (posCount > negCount) delta.valence = Math.min(posCount * 3, 10);
    if (negCount > posCount) delta.valence = -Math.min(negCount * 3, 10);

    // arousal（激活）
    if (lower.includes("兴奋") || lower.includes("激动") || lower.includes("惊喜")) {
      delta.arousal = 5;
    }
    if (lower.includes("平静") || lower.includes("放松") || lower.includes("无聊")) {
      delta.arousal = -3;
    }

    // focus（专注）
    if (lower.includes("深入") || lower.includes("详细") || lower.includes("仔细")) {
      delta.focus = 5;
    }
    if (lower.includes("换话题") || lower.includes("随便") || lower.includes("闲聊")) {
      delta.focus = -5;
    }

    // mood（情绪）
    if (lower.includes("开心") || lower.includes("高兴") || lower.includes("愉快")) {
      delta.mood = 5;
    }
    if (lower.includes("难过") || lower.includes("沮丧") || lower.includes("累")) {
      delta.mood = -5;
    }

    // humor（幽默）
    if (lower.includes("哈哈") || lower.includes("笑") || lower.includes("有趣")) {
      delta.humor = 3;
    }

    // safety（安全）
    if (lower.includes("放心") || lower.includes("信任") || lower.includes("靠谱")) {
      delta.safety = 3;
    }
    if (lower.includes("担心") || lower.includes("害怕") || lower.includes("不确定")) {
      delta.safety = -3;
    }

    return delta;
  }

  private inferRelationDelta(text: string, knownEntities?: string[]): Map<string, number> {
    const delta = new Map<string, number>();
    if (!knownEntities || knownEntities.length === 0) return delta;

    const lower = text.toLowerCase();

    for (const entity of knownEntities) {
      const entityLower = entity.toLowerCase();
      const count = (lower.match(new RegExp(entityLower, "g")) ?? []).length;
      if (count > 0) {
        // 每次提及增加 0.01，上限由调用方控制
        delta.set(entity, Math.min(count * 0.01, 0.05));
      } else {
        // 未提及则轻微衰减
        delta.set(entity, -0.005);
      }
    }

    return delta;
  }
}
