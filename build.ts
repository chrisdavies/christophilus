// Build script: compiles site to dist/
import { readdir, readFile, writeFile, mkdir, cp } from "fs/promises";
import { parsePost } from "./lib/md";

const POSTS_DIR = "./blog/posts";
const DIST = "./dist";

interface PostLink {
  title: string;
  slug: string;
}

function siteNav(currentPage: "blog" | "games" | "about", basePath: string): string {
  const blogClass = currentPage === "blog" ? ' class="current"' : "";
  const gamesClass = currentPage === "games" ? ' class="current"' : "";
  const aboutClass = currentPage === "about" ? ' class="current"' : "";

  return `<nav class="site-nav">
    <a href="${basePath}" class="logo"><img src="${basePath}games/favicon.svg" alt="Home"></a>
    <a href="${basePath}"${blogClass}>Blog</a>
    <a href="${basePath}games/"${gamesClass}>Games</a>
    <a href="${basePath}about/"${aboutClass}>About Me</a>
  </nav>`;
}

function postTemplate(
  title: string,
  date: string,
  content: string,
  prev: PostLink | null,
  next: PostLink | null
): string {
  const newerLink = next ? `<a href="./${next.slug}.html">&larr; ${next.title}</a>` : "<span></span>";
  const olderLink = prev ? `<a href="./${prev.slug}.html">${prev.title} &rarr;</a>` : "<span></span>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Christophilus</title>
  <link rel="icon" href="../../games/favicon.svg">
  <link rel="stylesheet" href="../index.css">
</head>
<body>
  ${siteNav("blog", "../../")}
  <article>
    <header>
      <time datetime="${date}">${formatDate(date)}</time>
    </header>
    ${content}
  </article>
  <footer class="post-nav">
    ${newerLink}
    ${olderLink}
  </footer>
</body>
</html>`;
}

function indexTemplate(posts: { title: string; date: string; slug: string }[]): string {
  const list = posts
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((p) => `<li><a href="./blog/posts/${p.slug}.html">${p.title}</a><time datetime="${p.date}">${formatDate(p.date)}</time></li>`)
    .join("\n      ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog | Christophilus</title>
  <link rel="icon" href="./games/favicon.svg">
  <link rel="stylesheet" href="./blog/index.css">
</head>
<body>
  ${siteNav("blog", "./")}
  <main>
    <h1>Blog</h1>
    <ul class="post-list">
      ${list}
    </ul>
  </main>
</body>
</html>`;
}

function gamesTemplate(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Games | Christophilus</title>
  <link rel="icon" href="./favicon.svg">
  <link rel="stylesheet" href="../blog/index.css">
</head>
<body>
  ${siteNav("games", "../")}
  <main>
    <h1>Games</h1>
    <ul class="post-list">
      <li><a href="./tileflip/">Tileflip</a></li>
      <li><a href="./sokoban/">Sokoban</a><span class="desktop-tag">Desktop</span></li>
      <li><a href="./memoji/">Memoji</a></li>
      <li><a href="./blockfit/">Blockfit</a><span class="desktop-tag">Desktop</span></li>
      <li><a href="./gamepad-diagnostic/">Gamepad Diagnostic</a><span class="desktop-tag">Desktop</span></li>
    </ul>
  </main>
</body>
</html>`;
}

function aboutTemplate(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About Me | Christophilus</title>
  <link rel="icon" href="../games/favicon.svg">
  <link rel="stylesheet" href="../blog/index.css">
</head>
<body>
  ${siteNav("about", "../")}
  <main>
    <h1>About Me</h1>
    <p>Coming soon...</p>
  </main>
</body>
</html>`;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
}

console.log("Building site to dist/...\n");

// Create dist directories
await mkdir(`${DIST}/blog/posts`, { recursive: true });
await mkdir(`${DIST}/about`, { recursive: true });

// Copy static files
await cp("./blog/index.css", `${DIST}/blog/index.css`);
await cp("./CNAME", `${DIST}/CNAME`).catch(() => {}); // Optional

// Build games (transpile TypeScript, copy other files)
await mkdir(`${DIST}/games`, { recursive: true });
const gamesDirs = await readdir("./games", { withFileTypes: true });

for (const entry of gamesDirs) {
  const src = `./games/${entry.name}`;
  const dest = `${DIST}/games/${entry.name}`;

  if (entry.isDirectory()) {
    await mkdir(dest, { recursive: true });
    const files = await readdir(src);

    for (const file of files) {
      if (file.endsWith(".ts")) {
        // Bundle TypeScript
        const result = await Bun.build({
          entrypoints: [`${src}/${file}`],
          outdir: dest,
          format: "esm",
        });
        if (!result.success) {
          console.error(`Failed to build ${src}/${file}`);
        }
      } else if (file.endsWith(".html")) {
        // Copy HTML, replacing .ts with .js
        let html = await readFile(`${src}/${file}`, "utf-8");
        html = html.replace(/src="\.\/([^"]+)\.ts"/g, 'src="./$1.js"');
        await writeFile(`${dest}/${file}`, html);
      } else {
        // Copy other files as-is
        await cp(`${src}/${file}`, `${dest}/${file}`);
      }
    }
  } else {
    // Copy root-level files in games/
    await cp(src, dest);
  }
}
console.log("Built games");

// Build blog posts
const files = await readdir(POSTS_DIR);
const mdFiles = files.filter((f) => f.endsWith(".md"));

// Parse all posts first
const posts = await Promise.all(
  mdFiles.map(async (file) => {
    const content = await readFile(`${POSTS_DIR}/${file}`, "utf-8");
    return parsePost(file, content);
  })
);

// Sort by date (newest first)
posts.sort((a, b) => b.date.localeCompare(a.date));

// Generate HTML with prev/next links
for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  const prev = i < posts.length - 1 ? posts[i + 1] : null; // older
  const next = i > 0 ? posts[i - 1] : null; // newer

  const html = postTemplate(post.title, post.date, post.html, prev, next);
  await writeFile(`${DIST}/blog/posts/${post.slug}.html`, html);
}

// Generate blog index at root
const indexHtml = indexTemplate(posts);
await writeFile(`${DIST}/index.html`, indexHtml);

// Generate games index
const gamesHtml = gamesTemplate();
await writeFile(`${DIST}/games/index.html`, gamesHtml);

// Generate about page
const aboutHtml = aboutTemplate();
await writeFile(`${DIST}/about/index.html`, aboutHtml);

console.log(`Built ${posts.length} blog posts`);
console.log(`\nOutput: ${DIST}/`);
