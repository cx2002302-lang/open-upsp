import { CliBridge } from "../bridge/cli-bridge.js";
import type { CreateNoteParams } from "../bridge/types.js";
import type { MemoryEntry, Persona } from "../persona/types.js";

export interface SyncOptions {
  /** 权重阈值，≥此值的条目才会同步到 ZK */
  weightThreshold?: number;
  /** 每次同步的最大条目数 */
  maxEntries?: number;
  /** CLI 桥接选项 */
  cliOptions?: ConstructorParameters<typeof CliBridge>[0];
}

/**
 * PersonaSync — 将位格的 STM 条目同步到 Zettelkasten。
 *
 * 同步策略：
 * - 权重 ≥ 阈值的条目 → 创建为 FLEETING 笔记
 * - ZK 的夜间蒸馏流程 → 可能升级为 PERMANENT
 */
export class PersonaSync {
  private readonly options: Required<SyncOptions>;
  private readonly cli: CliBridge;

  constructor(options: SyncOptions = {}) {
    this.options = {
      weightThreshold: 3,
      maxEntries: 20,
      cliOptions: {},
      ...options,
    };
    this.cli = new CliBridge(this.options.cliOptions);
  }

  /**
   * 同步位格的 STM 条目到 ZK
   */
  async syncStm(persona: Persona): Promise<{
    synced: number;
    failed: number;
    noteIds: string[];
  }> {
    const candidates = persona.stm.entries
      .filter((e) => e.weight >= this.options.weightThreshold)
      .slice(0, this.options.maxEntries);

    let synced = 0;
    let failed = 0;
    const noteIds: string[] = [];

    for (const entry of candidates) {
      try {
        const params = this.toCreateNoteParams(entry, persona);
        const note = await this.cli.createNote(params);
        noteIds.push(note.id);
        synced++;
      } catch {
        failed++;
      }
    }

    return { synced, failed, noteIds };
  }

  /**
   * 同步单个记忆条目
   */
  async syncEntry(entry: MemoryEntry, persona: Persona): Promise<string | null> {
    if (entry.weight < this.options.weightThreshold) {
      return null;
    }

    try {
      const params = this.toCreateNoteParams(entry, persona);
      const note = await this.cli.createNote(params);
      return note.id;
    } catch {
      return null;
    }
  }

  private toCreateNoteParams(entry: MemoryEntry, persona: Persona): CreateNoteParams {
    // 标题：从内容提取前 10-50 个字符
    const title = entry.content.length > 30 ? `${entry.content.slice(0, 27)}...` : entry.content;

    // 内容：格式化的时间戳 + 原始内容 + 位格上下文
    const content = [
      `> 来源：${persona.core.frontmatter.name}（${persona.id}）`,
      `> 时间：${entry.timestamp}`,
      `> 权重：${entry.weight}`,
      "",
      entry.content,
    ].join("\n");

    // 标签：从内容提取关键词 + 位格 ID
    const tags = this.extractTags(entry.content, persona.id);

    // 置信度：权重映射到 0-1
    const confidence = entry.weight / 5;

    return {
      title,
      content,
      tags,
      confidence,
      source: "distilled",
    };
  }

  private extractTags(content: string, personaId: string): string[] {
    const tags = [personaId];

    // 简单的关键词提取
    const keywords = [
      { pattern: /docker|容器/i, tag: "docker" },
      { pattern: /node\.?js|npm|pnpm/i, tag: "nodejs" },
      { pattern: /python|pip/i, tag: "python" },
      { pattern: /sql|数据库|sqlite/i, tag: "database" },
      { pattern: /ai|llm|模型|gpt/i, tag: "ai" },
      { pattern: /配置|设置|config/i, tag: "config" },
      { pattern: /bug|错误|fix/i, tag: "debug" },
      { pattern: /设计|架构|pattern/i, tag: "design" },
    ];

    for (const { pattern, tag } of keywords) {
      if (pattern.test(content)) {
        tags.push(tag);
      }
    }

    return [...new Set(tags)].slice(0, 5);
  }
}
