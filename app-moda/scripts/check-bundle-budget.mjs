// Bundle budget gate: first-load shared JS (gzip) must stay under 180KB.
// Run after `pnpm build --webpack`. Mirrors the Next.js "First Load JS
// shared by all" metric: framework + main + webpack runtime + polyfills.
// Page/lazy chunks are excluded (covered by dynamic imports + LHCI).
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CHUNKS_DIR = join(ROOT, ".next", "static", "chunks");

const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 180);
const BUDGET_BYTES = BUDGET_KB * 1024;

// First-load shared runtime: framework, main app, webpack runtime, polyfills.
const SHARED_PATTERNS = [/^framework-/, /^main-/, /^webpack-/, /^polyfills-/];

function main() {
  if (!existsSync(CHUNKS_DIR)) {
    console.error(
      `Bundle budget: ${CHUNKS_DIR} not found. Run 'pnpm build --webpack' first.`,
    );
    process.exit(2);
  }
  const files = readdirSync(CHUNKS_DIR)
    .filter(
      (f) => f.endsWith(".js") && SHARED_PATTERNS.some((re) => re.test(f)),
    )
    .map((f) => join(CHUNKS_DIR, f));

  if (files.length === 0) {
    console.error(
      "Bundle budget: no shared chunks (framework/main/webpack/polyfills) found.",
    );
    process.exit(2);
  }

  let totalRaw = 0;
  let totalGzip = 0;
  const rows = files.map((file) => {
    const buf = readFileSync(file);
    const gz = gzipSync(buf);
    totalRaw += buf.length;
    totalGzip += gz.length;
    return { file: file.split(".next")[1], raw: buf.length, gzip: gz.length };
  });

  rows.sort((a, b) => b.gzip - a.gzip);
  console.log("Bundle budget (first-load shared, gzip):");
  for (const row of rows) {
    console.log(
      `  ${(row.gzip / 1024).toFixed(1)}KB gzip (${(row.raw / 1024).toFixed(1)}KB raw)  ${row.file}`,
    );
  }
  console.log(
    `Total first-load shared: ${(totalGzip / 1024).toFixed(1)}KB gzip / budget ${BUDGET_KB}KB`,
  );

  if (totalGzip > BUDGET_BYTES) {
    console.error(
      `BUNDLE BUDGET EXCEEDED: ${(totalGzip / 1024).toFixed(1)}KB > ${BUDGET_KB}KB`,
    );
    process.exit(1);
  }
  console.log("Bundle budget OK");
}

main();
