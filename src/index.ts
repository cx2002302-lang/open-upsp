// open-upsp — Universal Persona Substrate Protocol
// Library exports

export { CliBridge, CliBridgeWriteError } from "./bridge/cli-bridge.js";
export {
  SQLiteBridge,
  ZettelkastenConnectionError,
  ZettelkastenVersionError,
} from "./bridge/sqlite-bridge.js";
export type {
  CreateNoteParams,
  GraphPath,
  KnowledgeBridge,
  NetworkData,
  SearchResult,
  ZettelLink,
  ZettelNote,
} from "./bridge/types.js";
export { getConfig, getConfigDir, getPersonasDir, resolvePath, saveConfig } from "./config.js";
export { ContextBuilder } from "./context/builder.js";
export { SessionDistiller } from "./context/distiller.js";
export { StateUpdater } from "./context/state-updater.js";
export { PersonaSync } from "./context/sync.js";
export { PersonaLoadError, PersonaLoader } from "./persona/loader.js";
export { PersonaSaver } from "./persona/saver.js";
export type {
  Config,
  CoreAxes,
  CoreFile,
  DocsFile,
  DynamicAxes,
  MemoryEntry,
  MemoryFile,
  Persona,
  RelationEntry,
  RelationFile,
  RhythmPoint,
  RulesFile,
  SpeedWheel,
  State,
} from "./persona/types.js";
export { ensureDir, readJson, readText, writeJson, writeText } from "./utils/file.js";
