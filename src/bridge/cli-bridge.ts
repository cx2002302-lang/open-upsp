import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { CreateNoteParams, ZettelNote } from "./types.js";

const execAsync = promisify(exec);

export class CliBridgeWriteError extends Error {
  constructor(
    message: string,
    public readonly stderr?: string,
  ) {
    super(message);
    this.name = "CliBridgeWriteError";
  }
}

export interface CliBridgeOptions {
  /** openclaw CLI 命令路径，默认 "openclaw" */
  cliPath?: string;
  /** 创建笔记后的等待时间(ms)，用于确保数据库写入完成 */
  writeDelayMs?: number;
}

/**
 * CliBridge — 通过 openclaw CLI 子进程向 Zettelkasten 写入笔记。
 *
 * 解耦原则：不直接操作 ZK 数据库，而是通过 ZK 公开的 CLI 接口写入，
 * 确保 ZK 的 NoteService 逻辑（置信度路由、标签处理等）被完整执行。
 */
export class CliBridge {
  private readonly options: Required<CliBridgeOptions>;

  constructor(options: CliBridgeOptions = {}) {
    this.options = {
      cliPath: "openclaw",
      writeDelayMs: 500,
      ...options,
    };
  }

  /**
   * 创建笔记
   */
  async createNote(params: CreateNoteParams): Promise<ZettelNote> {
    const args = [
      "zk",
      "new",
      "--title",
      this.escapeShellArg(params.title),
      `--content`,
      this.escapeShellArg(params.content),
    ];

    if (params.tags && params.tags.length > 0) {
      args.push(`--tags`, params.tags.join(","));
    }

    if (params.confidence !== undefined) {
      args.push(`--confidence`, String(params.confidence));
    }

    const source = params.source ?? "manual";
    args.push(`--source`, source);

    // 嵌入 UPSP 元数据到内容中
    const meta: Record<string, unknown> = {};
    if (params.resonance !== undefined) meta.resonance = params.resonance;
    if (params.relationType) meta.relationType = params.relationType;
    let content = params.content;
    if (Object.keys(meta).length > 0) {
      content += `\n\n<!-- UPSP-META: ${JSON.stringify(meta)} -->`;
    }
    // 更新 args 中的 content
    const contentIdx = args.indexOf(`--content`);
    if (contentIdx !== -1 && contentIdx + 1 < args.length) {
      args[contentIdx + 1] = this.escapeShellArg(content);
    }

    const command = `${this.options.cliPath} ${args.join(" ")}`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });

      // 解析输出获取 note ID
      const idMatch = stdout.match(/Created note:\s+(\S+)/);
      if (!idMatch) {
        throw new CliBridgeWriteError(`Failed to parse note ID from output: ${stdout}`, stderr);
      }

      const noteId = idMatch[1];

      // 等待数据库写入完成
      await this.sleep(this.options.writeDelayMs);

      // 通过 SQLiteBridge 读取创建的笔记（验证）
      const { SQLiteBridge } = await import("./sqlite-bridge.js");
      const { getConfig, resolvePath } = await import("../config.js");
      const config = getConfig();

      const sqlite = new SQLiteBridge({
        dbPath: resolvePath(config.zettelkasten.databasePath),
        compatibleSchemaVersions: config.zettelkasten.compatibleSchemaVersions,
      });

      const note = sqlite.getNote(noteId);
      sqlite.close();

      if (!note) {
        throw new CliBridgeWriteError(`Note created but not found in database: ${noteId}`, stderr);
      }

      return note;
    } catch (err) {
      if (err instanceof CliBridgeWriteError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new CliBridgeWriteError(`CLI command failed: ${message}`);
    }
  }

  private escapeShellArg(arg: string): string {
    return JSON.stringify(arg);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
