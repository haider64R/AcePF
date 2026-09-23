import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve(import.meta.dirname, "..");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".md": "text/plain",
  ".json": "application/json",
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost"),
      path = resolve(
        root,
        "." +
          decodeURIComponent(
            url.pathname === "/" ? "/index.html" : url.pathname,
          ),
      );
    if (
      !path.startsWith(root + sep) ||
      path.includes("/.") ||
      ![".html", ".js", ".css", ".svg", ".md", ".json"].includes(extname(path))
    )
      throw Error("Forbidden");
    const body = await readFile(path);
    res.writeHead(200, {
      "Content-Type": types[extname(path)],
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; worker-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(Number(process.env.PORT ?? 4173), "127.0.0.1", () =>
  console.log("C++ Execution Visualizer http://127.0.0.1:4173"),
);
