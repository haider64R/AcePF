import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
function walk(p) {
  for (const f of readdirSync(p, { withFileTypes: true })) {
    const name = p + "/" + f.name;
    if (f.isDirectory()) walk(name);
    else if (name.endsWith(".js"))
      execFileSync(process.execPath, ["--check", name]);
  }
}
walk("src");
walk("scripts");
console.log("JavaScript syntax checked.");
