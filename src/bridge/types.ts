// 轻量类型定义（从 Zettelkasten 概念映射，不依赖 ZK 源码）

export type ZettelNoteType = "atomic" | "structure" | "source";
export type ZettelNoteStatus = "FLEETING" | "LITERATURE" | "PERMANENT";
export type ZettelNoteFolder = "inbox" | "references" | "zettels" | "archive";
export type ZettelSourceType = "manual" | "distilled" | "ceqrc";

export type ZettelLinkType =
  | "supports"
  | "supported_by"
  | "refines"
  | "refined_by"
  | "extends"
  | "extended_by"
  | "contradicts"
  | "contradicted_by"
  | "is_example_of"
  | "has_example"
  | "related";

export interface UpsMeta {
  resonance?: number;
  relationType?: string;
}

export interface ZettelNote {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  type: ZettelNoteType;
  status: ZettelNoteStatus;
  folder: ZettelNoteFolder;
  confidence: number | null;
  source: ZettelSourceType | null;
  reviewed: boolean;
  sessionKey: string | null;
  filePath: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  links: ZettelLink[];
  upsMeta?: UpsMeta;
}

export interface ZettelLink {
  to: string;
  type: ZettelLinkType;
  context: string | null;
  createdAt: string;
}

export interface SearchResult {
  note: ZettelNote;
  score: number;
  snippet: string | null;
}

export interface GraphPath {
  path: string[];
  length: number;
  stepCount: number;
  totalWeight: number;
  explanation: string;
}

export interface NetworkData {
  nodes: Array<{ id: string; title: string; glow: number }>;
  edges: Array<{ from: string; to: string; type: string }>;
}

export interface CreateNoteParams {
  title: string;
  content: string;
  tags?: string[];
  confidence?: number;
  source?: "manual" | "distilled" | "ceqrc";
  /** UPSP 关系共振度（0-1），写入时会嵌入笔记内容 */
  resonance?: number;
  /** UPSP 关系类型 */
  relationType?: string;
}

// KnowledgeBridge 抽象接口
export interface KnowledgeBridge {
  searchNotes(query: string, limit?: number, resonanceMap?: Map<string, number>): SearchResult[];
  getNote(id: string): ZettelNote | null;
  getBacklinks(noteId: string): ZettelLink[];
  findPath(from: string, to: string): GraphPath | null;
  getNetworkGraph(limit?: number): NetworkData;
}
