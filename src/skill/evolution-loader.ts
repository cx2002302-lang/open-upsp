import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Persona } from "../persona/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 进化参数接口 — 对应 skill/evolvable/PARAMS.yaml 的结构
 */
export interface EvolutionParams {
  version: string;
  limits: {
    stateUpdate: {
      deltaMax: number;
      valenceRange: [number, number];
      arousalRange: [number, number];
      focusRange: [number, number];
      moodRange: [number, number];
      humorRange: [number, number];
      safetyRange: [number, number];
    };
    relationUpdate: {
      resonanceDeltaMax: number;
    };
    coreAxis: {
      changeThresholdRounds: number;
      requiresUserConfirm: boolean;
    };
  };
  memory: {
    maxStmEntriesPerSession: number;
    syncWeightThreshold: number;
    autoArchive: boolean;
  };
  search: {
    depth: number;
    linkThreshold: number;
  };
  behavior: {
    contextInjection: boolean;
    autoRecord: boolean;
    autoSync: boolean;
  };
}

/**
 * 默认进化参数（硬编码兜底，当 PARAMS.yaml 不存在或解析失败时使用）
 */
const DEFAULT_PARAMS: EvolutionParams = {
  version: "0.3.0",
  limits: {
    stateUpdate: {
      deltaMax: 5,
      valenceRange: [-100, 100],
      arousalRange: [0, 100],
      focusRange: [0, 100],
      moodRange: [0, 100],
      humorRange: [0, 100],
      safetyRange: [0, 100],
    },
    relationUpdate: {
      resonanceDeltaMax: 0.05,
    },
    coreAxis: {
      changeThresholdRounds: 256,
      requiresUserConfirm: true,
    },
  },
  memory: {
    maxStmEntriesPerSession: 5,
    syncWeightThreshold: 3,
    autoArchive: true,
  },
  search: {
    depth: 20,
    linkThreshold: 0.6,
  },
  behavior: {
    contextInjection: true,
    autoRecord: true,
    autoSync: true,
  },
};

/**
 * 简单的 YAML 子集解析器
 * 仅支持：嵌套对象、数组、[a, b] 格式、数字、布尔值、字符串
 */
function parseSimpleYaml(yaml: string): unknown {
  const lines = yaml.split("\n");
  const root: Record<string, unknown> = {};
  const stack: { obj: Record<string, unknown>; indent: number }[] = [{ obj: root, indent: -1 }];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 去除行内注释（但保留字符串内的 #）
    const commentIdx = line.indexOf(" #");
    if (commentIdx >= 0 && !line.slice(0, commentIdx).includes('"')) {
      line = line.slice(0, commentIdx);
    }

    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // 找到当前层级
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1].obj;

    if (trimmed.startsWith("- ")) {
      // 数组元素
      const val = trimmed.slice(2).trim();
      const lastKey = Object.keys(current).pop();
      if (lastKey) {
        const arr = (current[lastKey] as unknown[]) || [];
        arr.push(parseYamlValue(val));
        current[lastKey] = arr;
      }
    } else if (trimmed.includes(":")) {
      const colonIdx = trimmed.indexOf(":");
      const key = trimmed.slice(0, colonIdx).trim();
      const valStr = trimmed.slice(colonIdx + 1).trim();

      if (!valStr) {
        // 嵌套对象开始
        const child: Record<string, unknown> = {};
        current[key] = child;
        stack.push({ obj: child, indent });
      } else {
        current[key] = parseYamlValue(valStr);
      }
    }
  }

  return root;
}

function parseYamlValue(val: string): unknown {
  val = val.trim();
  if (val === "true") return true;
  if (val === "false") return false;
  if (val === "null" || val === "~") return null;
  // 数组 [a, b]
  if (val.startsWith("[") && val.endsWith("]")) {
    return val
      .slice(1, -1)
      .split(",")
      .map((s) => parseYamlValue(s.trim()));
  }
  // 数字
  if (/^-?\d+$/.test(val)) return Number.parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return Number.parseFloat(val);
  // 字符串（去除引号）
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  return val;
}

function safeNumber(value: unknown, fallback: number): number {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * 将扁平化的解析结果转换为 EvolutionParams
 */
function toEvolutionParams(raw: Record<string, unknown>): EvolutionParams {
  const get = (obj: unknown, ...keys: string[]): unknown => {
    let current = obj;
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }
    return current;
  };

  const rawArr = (v: unknown): [number, number] => {
    if (Array.isArray(v) && v.length === 2) return [Number(v[0]), Number(v[1])];
    return [0, 100];
  };

  const r = raw as Record<string, unknown>;

  return {
    version: String(get(r, "version") ?? DEFAULT_PARAMS.version),
    limits: {
      stateUpdate: {
        deltaMax: safeNumber(
          get(r, "limits", "state_update", "delta_max"),
          DEFAULT_PARAMS.limits.stateUpdate.deltaMax,
        ),
        valenceRange: rawArr(get(r, "limits", "state_update", "valence_range")),
        arousalRange: rawArr(get(r, "limits", "state_update", "arousal_range")),
        focusRange: rawArr(get(r, "limits", "state_update", "focus_range")),
        moodRange: rawArr(get(r, "limits", "state_update", "mood_range")),
        humorRange: rawArr(get(r, "limits", "state_update", "humor_range")),
        safetyRange: rawArr(get(r, "limits", "state_update", "safety_range")),
      },
      relationUpdate: {
        resonanceDeltaMax: safeNumber(
          get(r, "limits", "relation_update", "resonance_delta_max"),
          DEFAULT_PARAMS.limits.relationUpdate.resonanceDeltaMax,
        ),
      },
      coreAxis: {
        changeThresholdRounds: safeNumber(
          get(r, "limits", "core_axis", "change_threshold_rounds"),
          DEFAULT_PARAMS.limits.coreAxis.changeThresholdRounds,
        ),
        requiresUserConfirm: Boolean(
          get(r, "limits", "core_axis", "requires_user_confirm") ??
            DEFAULT_PARAMS.limits.coreAxis.requiresUserConfirm,
        ),
      },
    },
    memory: {
      maxStmEntriesPerSession: safeNumber(
        get(r, "memory", "max_stm_entries_per_session"),
        DEFAULT_PARAMS.memory.maxStmEntriesPerSession,
      ),
      syncWeightThreshold: safeNumber(
        get(r, "memory", "sync_weight_threshold"),
        DEFAULT_PARAMS.memory.syncWeightThreshold,
      ),
      autoArchive: Boolean(get(r, "memory", "auto_archive") ?? DEFAULT_PARAMS.memory.autoArchive),
    },
    search: {
      depth: safeNumber(get(r, "search", "depth"), DEFAULT_PARAMS.search.depth),
      linkThreshold: safeNumber(
        get(r, "search", "link_threshold"),
        DEFAULT_PARAMS.search.linkThreshold,
      ),
    },
    behavior: {
      contextInjection: Boolean(
        get(r, "behavior", "context_injection") ?? DEFAULT_PARAMS.behavior.contextInjection,
      ),
      autoRecord: Boolean(get(r, "behavior", "auto_record") ?? DEFAULT_PARAMS.behavior.autoRecord),
      autoSync: Boolean(get(r, "behavior", "auto_sync") ?? DEFAULT_PARAMS.behavior.autoSync),
    },
  };
}

/**
 * 进化参数加载器
 */
export class EvolutionLoader {
  private cachedParams: EvolutionParams | null = null;
  private cacheMtime = 0;

  private getParamsPath(): string {
    // 优先从已安装的 skill 目录读取
    const skillDir = path.join(process.env.HOME || "", ".openclaw", "skills", "open-upsp");
    const paramsPath = path.join(skillDir, "evolvable", "PARAMS.yaml");
    if (fs.existsSync(paramsPath)) return paramsPath;

    // 回退到源码目录（开发模式）
    const devPath = path.join(__dirname, "..", "..", "skill", "evolvable", "PARAMS.yaml");
    if (fs.existsSync(devPath)) return devPath;

    return paramsPath;
  }

  /**
   * 加载进化参数（带缓存，文件修改后自动刷新）
   */
  loadParams(): EvolutionParams {
    const paramsPath = this.getParamsPath();

    if (!fs.existsSync(paramsPath)) {
      return DEFAULT_PARAMS;
    }

    const stats = fs.statSync(paramsPath);
    if (this.cachedParams && stats.mtimeMs <= this.cacheMtime) {
      return this.cachedParams;
    }

    try {
      const content = fs.readFileSync(paramsPath, "utf8");
      const raw = parseSimpleYaml(content) as Record<string, unknown>;
      this.cachedParams = toEvolutionParams(raw);
      this.cacheMtime = stats.mtimeMs;
      return this.cachedParams;
    } catch (e) {
      console.warn(
        `[EvolutionLoader] 解析 PARAMS.yaml 失败: ${e instanceof Error ? e.message : String(e)}，使用默认参数`,
      );
      return DEFAULT_PARAMS;
    }
  }

  /**
   * 检查进化模块是否已解锁
   */
  isUnlocked(persona: Persona): boolean {
    const manifest = this.loadManifest();
    const condition = manifest?.evolvable?.unlockCondition;
    if (!condition) return false;

    const roundOk = persona.state.round >= (condition.round ?? 10);
    const workhoodOk = persona.state.workhoodIndex >= (condition.workhoodIndex ?? 0.3);
    return roundOk && workhoodOk;
  }

  private getUnlockCondition(): { round: number; workhoodIndex: number } {
    const manifest = this.loadManifest();
    const c = manifest?.evolvable?.unlockCondition;
    return {
      round: c?.round ?? 10,
      workhoodIndex: c?.workhoodIndex ?? 0.3,
    };
  }

  /**
   * 加载解锁进度提示文本
   */
  getProgressHint(persona: Persona): string {
    const condition = this.getUnlockCondition();

    const roundProgress = Math.min(100, Math.round((persona.state.round / condition.round) * 100));
    const workhoodProgress = Math.min(
      100,
      Math.round((persona.state.workhoodIndex / condition.workhoodIndex) * 100),
    );

    return [
      "",
      "---",
      "# 进化提示",
      `你的位格正在成长。达到 Round ${condition.round} 且工化指数 >= ${condition.workhoodIndex} 后，可以解锁更多自定义参数。`,
      "",
      `| 条件 | 进度 |`,
      `|------|------|`,
      `| 轮数 (Round ${condition.round}) | ${roundProgress}% (${persona.state.round}/${condition.round}) |`,
      `| 工化指数 (${condition.workhoodIndex}) | ${workhoodProgress}% (${persona.state.workhoodIndex.toFixed(2)}/${condition.workhoodIndex}) |`,
      "",
    ].join("\n");
  }

  /**
   * 加载进化模块内容（用于注入 context）
   */
  loadEvolvableContent(): string | null {
    const skillDir = path.join(process.env.HOME || "", ".openclaw", "skills", "open-upsp");
    const evolvableDir = path.join(skillDir, "evolvable");

    if (!fs.existsSync(evolvableDir)) return null;

    const parts: string[] = [];

    // PARAMS.yaml 内容
    const paramsPath = path.join(evolvableDir, "PARAMS.yaml");
    if (fs.existsSync(paramsPath)) {
      parts.push("## 进化参数");
      parts.push("```yaml");
      parts.push(fs.readFileSync(paramsPath, "utf8"));
      parts.push("```");
    }

    // EXTENSIONS.md 内容
    const extensionsPath = path.join(evolvableDir, "EXTENSIONS.md");
    if (fs.existsSync(extensionsPath)) {
      const ext = fs.readFileSync(extensionsPath, "utf8");
      // 只取 "## 你的自定义规则" 之后的内容
      const marker = "## 你的自定义规则";
      const idx = ext.indexOf(marker);
      if (idx >= 0) {
        const userRules = ext.slice(idx + marker.length).trim();
        if (userRules && userRules !== "<!-- 在此添加你的规则 -->") {
          parts.push("## 自定义规则");
          parts.push(userRules);
        }
      }
    }

    return parts.length > 0 ? parts.join("\n\n") : null;
  }

  private loadManifest(): {
    evolvable?: { unlockCondition?: { round?: number; workhoodIndex?: number } };
  } | null {
    const skillDir = path.join(process.env.HOME || "", ".openclaw", "skills", "open-upsp");
    const manifestPath = path.join(skillDir, "manifest.json");
    const devPath = path.join(__dirname, "..", "..", "skill", "manifest.json");

    for (const p of [manifestPath, devPath]) {
      if (fs.existsSync(p)) {
        try {
          return JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
        } catch {
          // ignore
        }
      }
    }
    return null;
  }
}

/**
 * 全局单例
 */
export const evolutionLoader = new EvolutionLoader();
