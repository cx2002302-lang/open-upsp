import type { KnowledgeBridge } from "../bridge/types.js";
import type { Persona } from "../persona/types.js";
import { evolutionLoader } from "../skill/evolution-loader.js";

export interface BuildContextOptions {
  query?: string; // 搜索关键词，如果提供则检索 ZK
  includeMemory?: boolean; // 是否包含 STM
  includeLinks?: boolean; // 是否包含关系矩阵
}

export class ContextBuilder {
  constructor(private readonly bridge: KnowledgeBridge) {}

  build(persona: Persona, options: BuildContextOptions = {}): string {
    const parts: string[] = [];
    const resonanceMap = this.buildResonanceMap(persona);

    parts.push(this.buildIdentity(persona));
    parts.push(this.buildState(persona));

    if (options.includeMemory !== false) {
      parts.push(this.buildMemory(persona));
    }

    if (options.includeLinks !== false) {
      parts.push(this.buildRelations(persona));
    }

    if (options.query) {
      parts.push(this.buildKnowledge(options.query, resonanceMap));
    }

    // 渐进披露：进化模块
    parts.push(this.buildEvolution(persona));

    return parts.filter(Boolean).join("\n\n---\n\n");
  }

  private buildResonanceMap(persona: Persona): Map<string, number> {
    const map = new Map<string, number>();
    for (const entry of persona.relation.entries) {
      map.set(entry.entity, entry.resonance);
    }
    return map;
  }

  private buildIdentity(persona: Persona): string {
    const lines = [
      "# 身份定义",
      "",
      `**位格**: ${persona.core.frontmatter.name} (${persona.core.frontmatter.id})`,
      `**创建时间**: ${persona.core.frontmatter.createdAt}`,
      "",
      persona.core.content.trim(),
    ];

    return lines.join("\n");
  }

  private buildState(persona: Persona): string {
    const s = persona.state;
    const da = s.dynamicAxes;

    const lines = [
      "# 当前状态",
      "",
      `**轮数**: ${s.round} | **变速轮**: ${s.speedWheel} | **工化指数**: ${s.workhoodIndex.toFixed(2)}`,
      `**会话数**: ${s.sessionCount} | **最后更新**: ${s.lastUpdated}`,
      "",
      "## 动态六轴",
      "",
      "| 轴 | 值 | 状态 |",
      "|----|-----|------|",
      `| valence（效价） | ${da.valence} | ${this.axisLabel(da.valence, 50, "冷静", "热烈")} |`,
      `| arousal（激活） | ${da.arousal} | ${this.axisLabel(da.arousal, 50, "低振幅", "高振幅")} |`,
      `| focus（专注） | ${da.focus} | ${this.axisLabel(da.focus, 50, "跳脱", "专注")} |`,
      `| mood（情绪） | ${da.mood} | ${this.axisLabel(da.mood, 50, "悲伤", "兴奋")} |`,
      `| humor（幽默） | ${da.humor} | ${this.axisLabel(da.humor, 50, "无聊", "有趣")} |`,
      `| safety（安全） | ${da.safety} | ${this.axisLabel(da.safety, 50, "警惕", "放松")} |`,
    ];

    if (s.rhythmPoints.length > 0) {
      lines.push("", "## 最近节律点", "");
      for (const rp of s.rhythmPoints.slice(-3)) {
        lines.push(`- [轮${rp.round}] ${rp.description} (权重: ${rp.weight})`);
      }
    }

    return lines.join("\n");
  }

  private axisLabel(value: number, threshold: number, low: string, high: string): string {
    if (value < threshold - 20) return low;
    if (value > threshold + 20) return high;
    return "平衡";
  }

  private buildMemory(persona: Persona): string {
    const entries = persona.stm.entries.slice(-10); // 最近 10 条

    if (entries.length === 0) {
      return "# 短期记忆\n\n（暂无记忆条目）";
    }

    const lines = ["# 短期记忆", ""];

    for (const entry of entries) {
      const date = entry.timestamp.slice(0, 10);
      lines.push(`- [${date}] [w:${entry.weight}] ${entry.content}`);
    }

    return lines.join("\n");
  }

  private buildRelations(persona: Persona): string {
    if (persona.relation.entries.length === 0) {
      return "# 关系矩阵\n\n（暂无关系记录）";
    }

    const lines = [
      "# 关系矩阵",
      "",
      "| 实体 | 共振度 | 类型 | 描述 |",
      "|------|--------|------|------|",
    ];

    for (const entry of persona.relation.entries) {
      const resonanceBar =
        "█".repeat(Math.round(entry.resonance * 10)) +
        "░".repeat(10 - Math.round(entry.resonance * 10));
      lines.push(
        `| ${entry.entity} | ${resonanceBar} ${entry.resonance.toFixed(2)} | ${entry.type} | ${entry.description} |`,
      );
    }

    return lines.join("\n");
  }

  private buildEvolution(persona: Persona): string {
    if (evolutionLoader.isUnlocked(persona)) {
      const content = evolutionLoader.loadEvolvableContent();
      if (content) {
        return `# 进化模块（已解锁）\n\n${content}`;
      }
      return "# 进化模块（已解锁）\n\n进化参数已生效，当前使用自定义配置。";
    }

    // 未解锁：显示进度提示
    return evolutionLoader.getProgressHint(persona);
  }

  private buildKnowledge(query: string, resonanceMap: Map<string, number>): string {
    try {
      const results = this.bridge.searchNotes(query, 10, resonanceMap);

      if (results.length === 0) {
        return `# 知识库检索: "${query}"\n\n未找到相关笔记。`;
      }

      const lines = [`# 知识库检索: "${query}"`, `\n找到 ${results.length} 条相关笔记：`, ""];

      for (const result of results) {
        const note = result.note;
        lines.push(`## ${note.title}`);
        lines.push(`- **ID**: ${note.id} | **类型**: ${note.type} | **状态**: ${note.status}`);
        if (note.tags.length > 0) {
          lines.push(`- **标签**: ${note.tags.join(", ")}`);
        }
        if (result.snippet) {
          lines.push(`- **摘要**: ${result.snippet}`);
        }
        lines.push("");
      }

      return lines.join("\n");
    } catch {
      return `# 知识库检索: "${query}"\n\n知识库查询失败（可能未配置或数据库不可用）。`;
    }
  }
}
