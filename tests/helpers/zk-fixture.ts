import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

/**
 * 测试用 Zettelkasten 临时数据库夹具。
 * 避免测试直连真实生产库（~/.openclaw/zettelkasten/zettelkasten.db），
 * 同时可以模拟 schema 2.0.0 / 2.1.0 以及 zettel_fts 有无 id 列的差异。
 */

export interface ZkFixtureOptions {
  /** 写入 zettel_meta 的 schema_version，默认 "2.1.0" */
  schemaVersion?: string;
  /** zettel_fts 是否带 id 列（2.0.0 及官方 2.1.0 带，部分 2.1.0 部署不带），默认 true */
  ftsHasIdColumn?: boolean;
  /** 是否创建 zettel_fts 表（false 时 bridge 走 LIKE 降级），默认 true */
  withFts?: boolean;
}

export interface ZkFixture {
  dbPath: string;
  cleanup: () => void;
}

interface FixtureNote {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  type: string;
  status: string;
  folder: string;
  confidence: number | null;
  source: string | null;
  reviewed: number;
  session_key: string | null;
  file_path: string;
  created_at: string;
  updated_at: string;
}

// 固定种子数据：覆盖测试中用到的查询词（test / 笔记 / 独立 token "a"），
// 另有一条 archive 笔记用于验证归档目录被搜索排除。
const FIXTURE_NOTES: FixtureNote[] = [
  {
    id: "fixture-note-1",
    title: "Test Note Alpha",
    content:
      'This is a test note about testing. 笔记 keyword lives here, marker a.\n\n<!-- UPSP-META: {"resonance":0.75,"relationType":"system"} -->',
    summary: "Alpha summary",
    type: "atomic",
    status: "PERMANENT",
    folder: "inbox",
    confidence: 0.9,
    source: "manual",
    reviewed: 1,
    session_key: "fixture-session",
    file_path: "inbox/fixture-note-1.md",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "fixture-note-2",
    title: "笔记 Beta",
    content: "Another test note with 笔记 content, linking back to Alpha.",
    summary: null,
    type: "structure",
    status: "FLEETING",
    folder: "zettels",
    confidence: null,
    source: "distilled",
    reviewed: 0,
    session_key: null,
    file_path: "zettels/fixture-note-2.md",
    created_at: "2026-01-03T00:00:00Z",
    updated_at: "2026-01-04T00:00:00Z",
  },
  {
    id: "fixture-note-3",
    title: "Archived test note",
    content: "An archived test note that search must not return.",
    summary: null,
    type: "atomic",
    status: "LITERATURE",
    folder: "archive",
    confidence: null,
    source: null,
    reviewed: 0,
    session_key: null,
    file_path: "archive/fixture-note-3.md",
    created_at: "2026-01-05T00:00:00Z",
    updated_at: "2026-01-06T00:00:00Z",
  },
];

export function createZkFixture(options: ZkFixtureOptions = {}): ZkFixture {
  const { schemaVersion = "2.1.0", ftsHasIdColumn = true, withFts = true } = options;

  const dir = mkdtempSync(join(tmpdir(), "open-upsp-zk-fixture-"));
  const dbPath = join(dir, "zettelkasten.db");
  const db = new Database(dbPath);

  try {
    db.exec(`
      CREATE TABLE zettel_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE zettel_notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        folder TEXT NOT NULL DEFAULT 'inbox',
        confidence REAL,
        source TEXT,
        reviewed BOOLEAN NOT NULL DEFAULT FALSE,
        session_key TEXT,
        file_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE zettel_links (
        from_note_id TEXT NOT NULL,
        to_note_id TEXT NOT NULL,
        type TEXT NOT NULL,
        context TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE zettel_tags (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );
      CREATE TABLE zettel_note_tags (
        note_id TEXT NOT NULL,
        tag_id INTEGER NOT NULL
      );
    `);

    db.prepare("INSERT INTO zettel_meta (key, value) VALUES ('schema_version', ?)").run(
      schemaVersion,
    );

    const insertNote = db.prepare(`
      INSERT INTO zettel_notes (id, title, content, summary, type, status, folder,
        confidence, source, reviewed, session_key, file_path, created_at, updated_at)
      VALUES (@id, @title, @content, @summary, @type, @status, @folder,
        @confidence, @source, @reviewed, @session_key, @file_path, @created_at, @updated_at)
    `);
    for (const note of FIXTURE_NOTES) {
      insertNote.run(note);
    }

    const insertLink = db.prepare(`
      INSERT INTO zettel_links (from_note_id, to_note_id, type, context, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertLink.run(
      "fixture-note-2",
      "fixture-note-1",
      "related",
      "fixture link",
      "2026-01-03T00:00:00Z",
    );
    insertLink.run("fixture-note-1", "fixture-note-2", "related", null, "2026-01-04T00:00:00Z");

    db.prepare("INSERT INTO zettel_tags (id, name) VALUES (?, ?)").run(1, "testing");
    db.prepare("INSERT INTO zettel_note_tags (note_id, tag_id) VALUES (?, ?)").run(
      "fixture-note-1",
      1,
    );

    if (withFts) {
      db.exec(
        ftsHasIdColumn
          ? "CREATE VIRTUAL TABLE zettel_fts USING fts5(id UNINDEXED, title, content)"
          : "CREATE VIRTUAL TABLE zettel_fts USING fts5(title, content)",
      );

      // 无 id 列时按 rowid 对齐 zettel_notes，模拟外部内容 FTS 的关联方式
      const noteRows = db
        .prepare("SELECT rowid, id, title, content FROM zettel_notes")
        .all() as Array<{ rowid: number; id: string; title: string; content: string }>;

      if (ftsHasIdColumn) {
        const insertFts = db.prepare(
          "INSERT INTO zettel_fts (id, title, content) VALUES (?, ?, ?)",
        );
        for (const note of noteRows) {
          insertFts.run(note.id, note.title, note.content);
        }
      } else {
        const insertFts = db.prepare(
          "INSERT INTO zettel_fts (rowid, title, content) VALUES (?, ?, ?)",
        );
        for (const note of noteRows) {
          insertFts.run(note.rowid, note.title, note.content);
        }
      }
    }
  } finally {
    db.close();
  }

  return {
    dbPath,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
