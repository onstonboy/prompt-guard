import * as path from "path";
import { HashingEmbedder, QmdStore, type QmdQueryResult } from "./index";

/**
 * Shared entrypoint for the agent to use QMD-based memory.
 * Assumes the workspace root is the process.cwd() where the agent is running.
 */

let defaultStore: QmdStore | null = null;

function getWorkspaceRoot(): string {
  return process.cwd();
}

export function getDefaultMemoryStore(): QmdStore {
  if (defaultStore) return defaultStore;
  const root = getWorkspaceRoot();
  const filePath = path.join(root, ".qmd", "memory-store.json");
  defaultStore = new QmdStore(
    { filePath, dimension: 256 },
    new HashingEmbedder(256)
  );
  return defaultStore;
}

export async function remember(
  text: string,
  meta?: { tags?: string[]; [key: string]: unknown }
): Promise<string> {
  const store = getDefaultMemoryStore();
  return store.put(text, meta as any);
}

export async function recall(
  query: string,
  topK = 5
): Promise<QmdQueryResult[]> {
  const store = getDefaultMemoryStore();
  return store.query(query, topK);
}

