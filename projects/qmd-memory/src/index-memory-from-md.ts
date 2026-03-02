import { promises as fs } from "fs";
import * as path from "path";
import { glob } from "glob";
import { HashingEmbedder, QmdStore } from "./index";

/**
 * Simple CLI to index existing markdown memories (memory/*.md) into QMD.
 * Usage (from qmd-memory project root):
 *
 *   npm run build
 *   node dist/index-memory-from-md.js
 */
async function main() {
  // dist/ is at: workspace/projects/qmd-memory/dist
  // → workspace root is three levels up from __dirname.
  const workspaceRoot = path.resolve(__dirname, "..", "..", "..");
  const memoryDir = path.join(workspaceRoot, "memory");
  const qmdFile = path.join(workspaceRoot, ".qmd", "memory-store.json");

  const files = await glob("*.md", { cwd: memoryDir, absolute: true });
  if (!files.length) {
    console.log("[QMD] No markdown memory files found in:", memoryDir);
    return;
  }

  const store = new QmdStore(
    { filePath: qmdFile, dimension: 256 },
    new HashingEmbedder(256)
  );

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    const rel = path.relative(workspaceRoot, file);
    const chunks = splitMarkdownIntoChunks(content);
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      await store.put(trimmed, {
        source: rel,
      } as any);
    }
  }

  console.log(
    `[QMD] Indexed ${files.length} markdown files into ${qmdFile} (hashing embeddings).`
  );
}

function splitMarkdownIntoChunks(content: string): string[] {
  // Very simple splitter: split on blank lines and headings.
  return content.split(/\n\s*\n|^#+\s+/gm).filter((c) => c.trim().length > 0);
}

main().catch((err) => {
  console.error("[QMD] Error while indexing markdown memory:", err);
  process.exit(1);
});

