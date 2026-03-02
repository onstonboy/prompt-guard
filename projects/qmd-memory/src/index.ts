import { promises as fs } from "fs";
import * as path from "path";

export interface QmdRecordMeta {
  id: string;
  text: string;
  createdAt: string;
  tags?: string[] | undefined;
  [key: string]: unknown;
}

export interface QmdStoredRecord extends QmdRecordMeta {
  vector: number[];
}

export interface QmdQueryResult extends QmdRecordMeta {
  score: number;
}

export interface Embedder {
  embed(text: string): Promise<number[]>;
  embedMany?(texts: string[]): Promise<number[][]>; // optional fast path
}

export interface QmdOptions {
  /** Absolute path to the JSON file backing the store. */
  filePath: string;
  /** Vector dimension; must match the embedder output. */
  dimension?: number;
}

interface QmdFileFormat {
  dimension: number;
  records: QmdStoredRecord[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }
  if (!na || !nb) return 0;
  return dot / Math.sqrt(na * nb);
}

/**
 * Simple, local JSON-backed vector store (QMD).
 * This is meant as a lightweight, no-deps "vector DB" for agent memory.
 */
export class QmdStore {
  private filePath: string;
  private embedder: Embedder;
  private dimension: number;
  private loaded = false;
  private records: QmdStoredRecord[] = [];

  constructor(options: QmdOptions, embedder: Embedder) {
    this.filePath = options.filePath;
    this.embedder = embedder;
    this.dimension = options.dimension ?? 256;
  }

  private async ensureLoaded() {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as QmdFileFormat;
      this.dimension = parsed.dimension;
      this.records = parsed.records ?? [];
    } catch {
      // No existing file; start empty.
      this.records = [];
    }
    this.loaded = true;
  }

  private async persist() {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const payload: QmdFileFormat = {
      dimension: this.dimension,
      records: this.records,
    };
    await fs.writeFile(this.filePath, JSON.stringify(payload, null, 2), "utf8");
  }

  /**
   * Insert a new memory record. Vector is computed via the provided embedder.
   */
  async put(text: string, meta?: Omit<Partial<QmdRecordMeta>, "text" | "id">) {
    await this.ensureLoaded();
    const vector = await this.embedder.embed(text);
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Embedder returned empty vector");
    }
    this.dimension = vector.length;

    const id = (meta as any)?.id ?? `${Date.now()}-${this.records.length + 1}`;
    const record: QmdStoredRecord = {
      id,
      text,
      createdAt: (meta as any)?.createdAt ?? new Date().toISOString(),
      tags: (meta as any)?.tags,
      ...meta,
      vector,
    };
    this.records.push(record);
    await this.persist();
    return id;
  }

  /**
   * Search for the most relevant memories to a query string.
   */
  async query(query: string, topK = 5): Promise<QmdQueryResult[]> {
    await this.ensureLoaded();
    if (!this.records.length) return [];
    const q = await this.embedder.embed(query);
    if (!q.length) return [];

    const scored: QmdQueryResult[] = this.records.map((r) => ({
      id: r.id,
      text: r.text,
      createdAt: r.createdAt,
      tags: r.tags,
      score: cosineSimilarity(q, r.vector),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}

/**
 * Very simple, deterministic local embedder.
 * This is NOT semantic like OpenAI embeddings, but good enough to wire QMD
 * without external services. You can replace it with a real embedder later.
 */
export class HashingEmbedder implements Embedder {
  private dim: number;

  constructor(dim = 256) {
    this.dim = dim;
  }

  async embed(text: string): Promise<number[]> {
    const vec = new Array(this.dim).fill(0);
    const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      let h = 0;
      for (let i = 0; i < token.length; i++) {
        h = (h * 31 + token.charCodeAt(i)) >>> 0;
      }
      const idx = h % this.dim;
      vec[idx] += 1;
    }
    return vec;
  }
}

