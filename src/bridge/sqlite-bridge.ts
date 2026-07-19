import Database from "better-sqlite3";
import type {
  GraphPath,
  KnowledgeBridge,
  NetworkData,
  SearchResult,
  ZettelLink,
  ZettelNote,
} from "./types.js";

export class ZettelkastenVersionError extends Error {
  constructor(
    public readonly actualVersion: string,
    public readonly expectedVersions: string[],
  ) {
    super(
      `Zettelkasten schema version ${actualVersion} is not compatible. ` +
        `Expected one of: ${expectedVersions.join(", ")}`,
    );
    this.name = "ZettelkastenVersionError";
  }
}

export class ZettelkastenConnectionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ZettelkastenConnectionError";
  }
}

/**
 * 内置兼容的 Zettelkasten schema 版本。
 * 2.1.0 相对 2.0.0 在读路径上向后兼容，因此即使调用方（旧配置）
 * 只声明了 2.0.0，也一并接受，避免生产库升级后被误拒。
 */
const BUILTIN_COMPATIBLE_SCHEMA_VERSIONS = ["2.0.0", "2.1.0"];

export interface SQLiteBridgeOptions {
  dbPath: string;
  compatibleSchemaVersions: string[];
  retryAttempts?: number;
  retryDelayMs?: number;
}

export class SQLiteBridge implements KnowledgeBridge {
  private db: Database.Database | null = null;
  private readonly options: Required<SQLiteBridgeOptions>;

  constructor(options: SQLiteBridgeOptions) {
    this.options = {
      retryAttempts: 3,
      retryDelayMs: 100,
      ...options,
    };
  }

  private connect(): Database.Database {
    if (this.db) return this.db;

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        const db = new Database(this.options.dbPath, { readonly: true });
        this.checkSchemaVersion(db);
        this.db = db;
        return db;
      } catch (err) {
        lastError = err;
        if (err instanceof ZettelkastenVersionError) throw err;

        // 数据库被锁 (SQLITE_BUSY) → 重试
        const isBusy =
          err instanceof Error &&
          (err.message.includes("SQLITE_BUSY") || err.message.includes("database is locked"));

        if (isBusy && attempt < this.options.retryAttempts) {
          const delay = this.options.retryDelayMs * 3 ** (attempt - 1);
          // 同步延迟（better-sqlite3 是同步的）
          const start = Date.now();
          while (Date.now() - start < delay) {
            // 忙等待
          }
          continue;
        }

        // 其他错误或最后一次重试失败
        break;
      }
    }

    // 构建友好错误信息
    const err = lastError instanceof Error ? lastError : new Error(String(lastError));
    if (err.message.includes("unable to open database file")) {
      throw new ZettelkastenConnectionError(
        `Zettelkasten database not found at "${this.options.dbPath}". ` +
          `Run "zk init" to initialize the database.`,
        err,
      );
    }
    if (err.message.includes("SQLITE_CANTOPEN")) {
      throw new ZettelkastenConnectionError(
        `Cannot open Zettelkasten database. Check permissions: chmod 644 "${this.options.dbPath}"`,
        err,
      );
    }

    throw new ZettelkastenConnectionError(
      `Failed to connect to Zettelkasten database: ${err.message}`,
      err,
    );
  }

  private checkSchemaVersion(db: Database.Database): void {
    const acceptedVersions = [
      ...new Set([...this.options.compatibleSchemaVersions, ...BUILTIN_COMPATIBLE_SCHEMA_VERSIONS]),
    ];
    try {
      const row = db.prepare("SELECT value FROM zettel_meta WHERE key = 'schema_version'").get() as
        | { value: string }
        | undefined;

      if (!row) {
        throw new ZettelkastenVersionError("unknown", acceptedVersions);
      }

      const version = row.value;
      if (!acceptedVersions.includes(version)) {
        throw new ZettelkastenVersionError(version, acceptedVersions);
      }
    } catch (err) {
      if (err instanceof ZettelkastenVersionError) throw err;
      // 如果 zettel_meta 表不存在，说明是极旧版本
      throw new ZettelkastenVersionError("unknown", acceptedVersions);
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // =========================================================================
  // 只读查询方法
  // =========================================================================

  searchNotes(query: string, limit = 20, resonanceMap?: Map<string, number>): SearchResult[] {
    const db = this.connect();

    // 使用 FTS5 全文搜索（如果可用）
    const hasFts = this.hasTable(db, "zettel_fts");

    const results = hasFts
      ? this.searchWithFts(db, query, limit)
      : this.searchWithLike(db, query, limit);

    // 关系感知排序：根据 resonanceMap 调整分数
    if (resonanceMap && resonanceMap.size > 0) {
      return this.applyResonanceBoost(results, resonanceMap);
    }

    return results;
  }

  private searchWithFts(db: Database.Database, query: string, limit: number): SearchResult[] {
    // schema 2.1.0 部分部署的 zettel_fts 没有 id 列，此时降级为 rowid 关联
    const joinCondition = this.getFtsColumns(db).includes("id")
      ? "n.id = fts.id"
      : "fts.rowid = n.rowid";

    const stmt = db.prepare(`
      SELECT n.id, n.title, n.content, n.summary, n.type, n.status, n.folder,
             n.confidence, n.source, n.reviewed, n.session_key, n.file_path,
             n.created_at, n.updated_at,
             rank AS score
      FROM zettel_notes n
      JOIN zettel_fts fts ON ${joinCondition}
      WHERE zettel_fts MATCH ?
        AND n.folder != 'archive'
      ORDER BY rank
      LIMIT ?
    `);

    const rows = stmt.all(query, limit) as Array<Record<string, unknown>>;
    return rows.map((row) => this.toSearchResult(db, row));
  }

  /**
   * 探测 zettel_fts 的实际列结构，用于决定 FTS 关联方式：
   * 有 id 列时按 id 关联，否则按 rowid 关联。
   */
  private getFtsColumns(db: Database.Database): string[] {
    const rows = db.prepare("PRAGMA table_info(zettel_fts)").all() as Array<{ name: string }>;
    return rows.map((row) => row.name);
  }

  private searchWithLike(db: Database.Database, query: string, limit: number): SearchResult[] {
    const pattern = `%${query}%`;
    const stmt = db.prepare(`
      SELECT id, title, content, summary, type, status, folder,
             confidence, source, reviewed, session_key, file_path,
             created_at, updated_at,
             1.0 AS score
      FROM zettel_notes
      WHERE (title LIKE ? OR content LIKE ?)
        AND folder != 'archive'
      ORDER BY updated_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(pattern, pattern, limit) as Array<Record<string, unknown>>;
    return rows.map((row) => this.toSearchResult(db, row));
  }

  getNote(id: string): ZettelNote | null {
    const db = this.connect();

    const row = db
      .prepare(
        `
      SELECT id, title, content, summary, type, status, folder,
             confidence, source, reviewed, session_key, file_path,
             created_at, updated_at
      FROM zettel_notes
      WHERE id = ?
    `,
      )
      .get(id) as Record<string, unknown> | undefined;

    if (!row) return null;

    return this.toNote(db, row);
  }

  getBacklinks(noteId: string): ZettelLink[] {
    const db = this.connect();

    const stmt = db.prepare(`
      SELECT from_note_id, to_note_id, type, context, created_at
      FROM zettel_links
      WHERE to_note_id = ?
    `);

    const rows = stmt.all(noteId) as Array<Record<string, unknown>>;
    return rows.map((row) => this.toLink(row));
  }

  findPath(from: string, to: string): GraphPath | null {
    const db = this.connect();

    // BFS 最短路径
    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [{ id: from, path: [from] }];

    while (queue.length > 0) {
      // biome-ignore lint/style/noNonNullAssertion: queue.length > 0 guarantees non-null
      const current = queue.shift()!;

      if (current.id === to) {
        return {
          path: current.path,
          length: current.path.length,
          stepCount: current.path.length - 1,
          totalWeight: current.path.length - 1,
          explanation: `Path found: ${current.path.join(" → ")}`,
        };
      }

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const stmt = db.prepare("SELECT to_note_id FROM zettel_links WHERE from_note_id = ?");
      const neighbors = stmt.all(current.id) as Array<{ to_note_id: string }>;

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.to_note_id)) {
          queue.push({
            id: neighbor.to_note_id,
            path: [...current.path, neighbor.to_note_id],
          });
        }
      }
    }

    return null;
  }

  getNetworkGraph(limit = 200): NetworkData {
    const db = this.connect();

    const notes = db
      .prepare(
        `
      SELECT id, title
      FROM zettel_notes
      WHERE folder != 'archive'
      LIMIT ?
    `,
      )
      .all(limit) as Array<{ id: string; title: string }>;

    const links = db
      .prepare(
        `
      SELECT from_note_id, to_note_id, type
      FROM zettel_links
      WHERE from_note_id IN (${notes.map(() => "?").join(",")})
    `,
      )
      .all(...notes.map((n) => n.id)) as Array<{
      from_note_id: string;
      to_note_id: string;
      type: string;
    }>;

    return {
      nodes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        glow: 0.5, // 简化，实际应从 zettel_note_stats 计算
      })),
      edges: links.map((l) => ({
        from: l.from_note_id,
        to: l.to_note_id,
        type: l.type,
      })),
    };
  }

  // =========================================================================
  // 辅助方法
  // =========================================================================

  private hasTable(db: Database.Database, tableName: string): boolean {
    const row = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(tableName) as { 1: number } | undefined;
    return row !== undefined;
  }

  private toNote(db: Database.Database, row: Record<string, unknown>): ZettelNote {
    const id = String(row.id);

    // 查询标签
    const tagsStmt = db.prepare(`
      SELECT t.name
      FROM zettel_tags t
      JOIN zettel_note_tags nt ON t.id = nt.tag_id
      WHERE nt.note_id = ?
    `);
    const tagRows = tagsStmt.all(id) as Array<{ name: string }>;

    // 查询链接
    const linksStmt = db.prepare(`
      SELECT to_note_id, type, context, created_at
      FROM zettel_links
      WHERE from_note_id = ?
    `);
    const linkRows = linksStmt.all(id) as Array<Record<string, unknown>>;

    const content = String(row.content);

    return {
      id,
      title: String(row.title),
      content,
      summary: row.summary ? String(row.summary) : null,
      type: String(row.type) as ZettelNote["type"],
      status: String(row.status) as ZettelNote["status"],
      folder: String(row.folder) as ZettelNote["folder"],
      confidence: row.confidence ? Number(row.confidence) : null,
      source: row.source ? (String(row.source) as ZettelNote["source"]) : null,
      reviewed: Boolean(row.reviewed),
      sessionKey: row.session_key ? String(row.session_key) : null,
      filePath: String(row.file_path),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      tags: tagRows.map((t) => t.name),
      links: linkRows.map((r) => this.toLink(r)),
      upsMeta: this.extractUpsMeta(content),
    };
  }

  private toSearchResult(db: Database.Database, row: Record<string, unknown>): SearchResult {
    const note = this.toNote(db, row);

    // 生成摘要片段
    const snippet = `${note.content.slice(0, 200).replace(/\n/g, " ")}...`;

    return {
      note,
      score: row.score ? Number(row.score) : 1.0,
      snippet: snippet.length > note.content.length ? null : snippet,
    };
  }

  private applyResonanceBoost(
    results: SearchResult[],
    resonanceMap: Map<string, number>,
  ): SearchResult[] {
    return results
      .map((result) => {
        const note = result.note;
        let boost = 0;

        for (const [entity, resonance] of resonanceMap) {
          const entityLower = entity.toLowerCase();
          const text = `${note.title} ${note.content} ${note.tags.join(" ")}`.toLowerCase();

          if (text.includes(entityLower)) {
            boost += resonance * 0.2; // 最大提升 0.2 * 1.0 = 0.2
          }
        }

        return {
          ...result,
          score: result.score + boost,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private extractUpsMeta(
    content: string,
  ): { resonance?: number; relationType?: string } | undefined {
    const match = content.match(/<!--\s*UPSP-META:\s*(.+?)\s*-->/);
    if (!match) return undefined;
    try {
      const parsed = JSON.parse(match[1]) as Record<string, unknown>;
      const meta: { resonance?: number; relationType?: string } = {};
      if (typeof parsed.resonance === "number") meta.resonance = parsed.resonance;
      if (typeof parsed.relationType === "string") meta.relationType = parsed.relationType;
      return Object.keys(meta).length > 0 ? meta : undefined;
    } catch {
      return undefined;
    }
  }

  private toLink(row: Record<string, unknown>): ZettelLink {
    return {
      to: String(row.to_note_id ?? row.to),
      type: String(row.type) as ZettelLink["type"],
      context: row.context ? String(row.context) : null,
      createdAt: String(row.created_at),
    };
  }
}
