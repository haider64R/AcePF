import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "dist");
const pages = ["index.html", "visualizer.html", "notes.html", "practice.html", "exam.html"];
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const file of [...pages, "favicon.svg", "SUPPORTED_CPP.md", "src"])
  cpSync(resolve(root, file), resolve(out, file), { recursive: true });

// The site has no bundler. Emit the package's browser module and resolve the
// single shared Analytics entrypoint for static browsers during the build.
mkdirSync(resolve(out, "vendor"));
cpSync(
  fileURLToPath(import.meta.resolve("@vercel/analytics")),
  resolve(out, "vendor/vercel-analytics.js"),
);
const entry = resolve(out, "src/ui/analytics.js");
const source = readFileSync(entry, "utf8");
const browserSource = source.replace(
  'from "@vercel/analytics"',
  'from "../../vendor/vercel-analytics.js"',
);
if (browserSource === source) throw Error("Analytics package import was not found.");
writeFileSync(entry, browserSource);
for (const page of pages) {
  const path = resolve(out, page);
  const html = readFileSync(path, "utf8");
  if (!html.includes("</body>")) throw Error(`Missing body close in ${page}.`);
  writeFileSync(
    path,
    html.replace(
      "</body>",
      '  <script type="module" src="./src/ui/analytics.js"></script>\n  </body>',
    ),
  );
}
console.log(
  "Static application built in dist/. Serve this folder over HTTP(S).",
);
