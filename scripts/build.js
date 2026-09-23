import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "dist");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const file of ["index.html", "notes.html", "favicon.svg", "SUPPORTED_CPP.md", "src"])
  cpSync(resolve(root, file), resolve(out, file), { recursive: true });
console.log(
  "Static application built in dist/. Serve this folder over HTTP(S).",
);
