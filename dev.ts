// Dev server: builds to dist/, watches for changes, serves static files
import { watch } from "fs";
import { $ } from "bun";

const PORT = 3000;
const DIST = "./dist";

// Initial build
console.log("Building...");
await $`bun build.ts`.quiet();
console.log("Built!\n");

// Watch for changes
console.log("Watching for changes...");

watch("./blog/posts", async (event, filename) => {
  if (!filename?.endsWith(".md")) return;
  console.log(`Change: blog/posts/${filename}`);
  await $`bun build.ts`.quiet();
  console.log("Rebuilt!");
});

watch("./blog/index.css", async () => {
  console.log("Change: blog/index.css");
  await $`bun build.ts`.quiet();
  console.log("Rebuilt!");
});

watch("./games", { recursive: true }, async (event, filename) => {
  if (!filename) return;
  console.log(`Change: games/${filename}`);
  await $`bun build.ts`.quiet();
  console.log("Rebuilt!");
});

watch("./build.ts", async () => {
  console.log("Change: build.ts");
  await $`bun build.ts`.quiet();
  console.log("Rebuilt!");
});

// Simple static file server
const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

Bun.serve({
  port: PORT,
  async fetch(req) {
    let path = new URL(req.url).pathname;
    if (path.endsWith("/")) path += "index.html";

    const file = Bun.file(`${DIST}${path}`);
    if (await file.exists()) {
      const ext = path.substring(path.lastIndexOf("."));
      return new Response(file, {
        headers: {
          "Content-Type": mimeTypes[ext] || "application/octet-stream",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`\nDev server: http://localhost:${PORT}`);
