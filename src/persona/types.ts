import { z } from "zod";

// ============================================================================
// 核心六轴
// ============================================================================

export const CoreAxisSchema = z.number().min(-100).max(100);

export const CoreAxesSchema = z.object({
  structuralExperiential: CoreAxisSchema, // S/E: 结构 ↔ 体验
  convergentDivergent: CoreAxisSchema, // C/D: 收敛 ↔ 发散
  evidenceFantasy: CoreAxisSchema, // V/F: 证据 ↔ 幻想
  analyticIntuitive: CoreAxisSchema, // A/I: 分析 ↔ 直觉
  criticalCooperative: CoreAxisSchema, // R/O: 批判 ↔ 协作
  abstractConcrete: CoreAxisSchema, // B/K: 抽象 ↔ 具体
});

export type CoreAxes = z.infer<typeof CoreAxesSchema>;

// ============================================================================
// 动态六轴
// ============================================================================

export const DynamicAxisSchema = z.number().min(0).max(100);

export const DynamicAxesSchema = z.object({
  valence: DynamicAxisSchema, // 冷静(-100映射) ↔ 热烈(+100映射)
  arousal: DynamicAxisSchema, // 低振幅 ↔ 高振幅
  focus: DynamicAxisSchema, // 专注 ↔ 跳脱
  mood: DynamicAxisSchema, // 悲伤 ↔ 兴奋
  humor: DynamicAxisSchema, // 无聊 ↔ 有趣
  safety: DynamicAxisSchema, // 警惕 ↔ 放松
});

export type DynamicAxes = z.infer<typeof DynamicAxesSchema>;

// ============================================================================
// 变速轮
// ============================================================================

export const SpeedWheelSchema = z.enum(["low", "medium", "high"]);
export type SpeedWheel = z.infer<typeof SpeedWheelSchema>;

// ============================================================================
// 节律点
// ============================================================================

export const RhythmPointSchema = z.object({
  round: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  description: z.string(),
  weight: z.number().min(1).max(5),
});

export type RhythmPoint = z.infer<typeof RhythmPointSchema>;

// ============================================================================
// core.md — 身份常量
// ============================================================================

export const CoreFrontmatterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
});

export type CoreFrontmatter = z.infer<typeof CoreFrontmatterSchema>;

export interface CoreFile {
  frontmatter: CoreFrontmatter;
  content: string; // Markdown 内容（核心六轴、动态六轴初始值等）
}

// ============================================================================
// state.json — 状态向量
// ============================================================================

export const StateSchema = z.object({
  personaId: z.string().min(1),
  round: z.number().int().nonnegative(),
  speedWheel: SpeedWheelSchema,
  workhoodIndex: z.number().min(0).max(1),
  dynamicAxes: DynamicAxesSchema,
  lastUpdated: z.string().datetime(),
  sessionCount: z.number().int().nonnegative(),
  rhythmPoints: z.array(RhythmPointSchema),
  // 预留：Phase 2 多模式支持
  mode: z.enum(["default", "emotional", "creative"]).optional(),
});

export type State = z.infer<typeof StateSchema>;

// ============================================================================
// STM.md / LTM.md — 记忆矩阵
// ============================================================================

export const MemoryFrontmatterSchema = z.object({
  lastCompact: z.string().datetime().optional(),
});

export type MemoryFrontmatter = z.infer<typeof MemoryFrontmatterSchema>;

export interface MemoryEntry {
  weight: number; // 1-5
  timestamp: string;
  content: string;
}

export interface MemoryFile {
  frontmatter: MemoryFrontmatter;
  entries: MemoryEntry[];
}

// ============================================================================
// relation.md — 关系矩阵
// ============================================================================

export const RelationTypeSchema = z.enum(["human", "system", "agent", "concept"]);

export type RelationType = z.infer<typeof RelationTypeSchema>;

export const RelationEntrySchema = z.object({
  entity: z.string().min(1),
  resonance: z.number().min(0).max(1),
  type: RelationTypeSchema,
  description: z.string(),
});

export type RelationEntry = z.infer<typeof RelationEntrySchema>;

export interface RelationFile {
  entries: RelationEntry[];
}

// ============================================================================
// rules.md — 规则张量
// ============================================================================

export interface RuleSection {
  title: string;
  rules: string[];
}

export interface RulesFile {
  sections: RuleSection[];
}

// ============================================================================
// docs.md — 术语字典
// ============================================================================

export interface TermEntry {
  term: string;
  definition: string;
}

export interface DocsFile {
  terms: TermEntry[];
}

// ============================================================================
// 完整位格
// ============================================================================

export interface Persona {
  id: string;
  core: CoreFile;
  state: State;
  stm: MemoryFile;
  ltm: MemoryFile;
  relation: RelationFile;
  rules: RulesFile;
  docs: DocsFile;
}

// ============================================================================
// 配置
// ============================================================================

export const ConfigSchema = z.object({
  defaultPersona: z.string().default("default"),
  personasDir: z.string().default("~/.openclaw/openupsp/personas"),
  zettelkasten: z
    .object({
      enabled: z.boolean().default(true),
      databasePath: z.string().default("~/.openclaw/zettelkasten/zettelkasten.db"),
      notesDir: z.string().default("~/.openclaw/zettelkasten/notes"),
      compatibleSchemaVersions: z.array(z.string()).default(["2.0.0"]),
    })
    .default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
