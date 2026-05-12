import { homedir } from "node:os";
import { join } from "node:path";
import { type Config, ConfigSchema } from "./persona/types.js";
import { readJson, writeJson } from "./utils/file.js";

const CONFIG_DIR = join(homedir(), ".openclaw", "openupsp");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getPersonasDir(): string {
  return join(CONFIG_DIR, "personas");
}

export function getConfig(): Config {
  const raw = readJson<Record<string, unknown>>(CONFIG_PATH);
  return ConfigSchema.parse(raw ?? {});
}

export function saveConfig(config: Config): void {
  writeJson(CONFIG_PATH, config);
}

export function resolvePath(input: string): string {
  if (input.startsWith("~/")) {
    return join(homedir(), input.slice(2));
  }
  return input;
}
