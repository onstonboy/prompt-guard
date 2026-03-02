# qmd-memory

Local vector-memory (QMD) store for agent long-term memory. Designed to work entirely on the **client / local machine**, no external DB.

- Stores memory entries as `{ text, metadata, vector }` inside a JSON file (default: `.qmd/memory-store.json` in workspace).
- Uses a pluggable **embedder** interface; default is a simple hashing embedder (no external API).
- Supports **semantic-like recall** via cosine similarity over vectors, so the agent only pulls back the most relevant memories.

## Core concepts

- **QmdStore**: in-process vector DB (backed by a JSON file).
- **Embedder**: interface to convert text → numeric vector.
- **HashingEmbedder**: default local implementation (bag-of-words hashing); you can swap this for real embeddings (OpenAI, local model, etc.).

## Usage (as a library)

```ts
import { QmdStore, HashingEmbedder } from "qmd-memory";
import * as path from "path";

// 1. Create a store pointing to a local JSON file
const store = new QmdStore(
  {
    filePath: path.join(process.cwd(), ".qmd", "memory-store.json"),
    dimension: 256, // must match embedder
  },
  new HashingEmbedder(256)
);

// 2. Remember something (write)
await store.put("Anh thích agent trả lời bằng tiếng Việt, ngắn gọn.", {
  tags: ["preference", "language"],
});

// 3. Recall when handling a new query
const results = await store.query(
  "Ngôn ngữ trả lời mặc định của anh là gì?",
  5
);
// results = [{ text, score, createdAt, tags, ... }, ...]
```

In a real agent, you would:
- On **each new task**, build a natural-language query describing the situation.
- Call `store.query(query, k)` to get the top-k most relevant memories.
- Attach only those snippets to the model prompt → **fewer tokens, faster responses**.

## CLI: index existing markdown memory

This repo ships a small helper that reads the existing `memory/*.md` files (like the ones in this workspace) and indexes them into QMD.

From the `qmd-memory` folder:

```bash
npm run build
node dist/index-memory-from-md.js
```

This will:
- Look for `memory/*.md` starting from the workspace root (`../../memory`).
- Split each file into chunks (by blank lines / headings).
- Insert each chunk into a store at `.qmd/memory-store.json` with metadata `{ source: 'memory/2026-03-02.md', ... }`.

## Integration idea for the agent

### Writing memory

When the agent decides something is worth remembering:

1. Build a short, self-contained sentence or paragraph (1–3 lines).
2. Call `store.put(text, { tags, source: 'agent', ... })`.
3. The text and its vector are stored locally in `.qmd/memory-store.json`.

### Reading memory

At the start of a session / new task:

1. Build a query like:  
   `"User: Chương, project: Radio Global, topic: monetization and notifications"`.
2. Call `store.query(query, k)`.
3. Attach only those `text` fields (plus minimal metadata) to the system/context prompt.

Compared to loading raw `.md`:
- You avoid dumping **all** of `MEMORY.md` / `memory/*.md` into the prompt.
- You pay tokens only for the few most relevant entries → better cost & speed.

## Swapping to a real embedding model

`HashingEmbedder` is deliberately simple and local. For higher-quality recall, you can implement:

```ts
import type { Embedder } from "qmd-memory";

class OpenAIEmbedder implements Embedder {
  async embed(text: string): Promise<number[]> {
    // call your embedding API here
  }
}
```

and pass it into `new QmdStore({ filePath, dimension }, new OpenAIEmbedder())`.

## Scripts

In `package.json`:

- `"build": "node ./node_modules/typescript/bin/tsc"`

You can add more (test, CLI wrappers) as needed for your environment.

