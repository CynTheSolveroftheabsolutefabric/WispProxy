import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const port = Number(process.env.PORT || 5001);
const host = process.env.HOST || "0.0.0.0";
const browserRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "browser", "dist");

wisp.options.allow_udp_streams = false;
wisp.options.allow_tcp_streams = true;
wisp.options.allow_private_ips = false;
wisp.options.allow_loopback_ips = false;
wisp.options.stream_limit_total = 128;
wisp.options.stream_limit_per_host = 16;
wisp.options.wisp_version = 2;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  if (pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, service: "wisp-proxy" }));
    return;
  }

  try {
    const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
    const target = path.resolve(browserRoot, relative);
    if (!target.startsWith(browserRoot + path.sep) && target !== path.join(browserRoot, "index.html")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const body = await readFile(target);
    res.writeHead(200, {
      "content-type": mime[path.extname(target).toLowerCase()] || "application/octet-stream",
      "cache-control": pathname === "/sw.js" ? "no-cache" : "public, max-age=300"
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.on("upgrade", (req, socket, head) => {
  if (req.url !== "/" && req.url !== "/wisp/") {
    socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  wisp.routeRequest(req, socket, head);
});

server.listen(port, host, () => {
  console.log(`WispProxy browser + Wisp listening on ${host}:${port}`);
  console.log(`WebSocket endpoint: ws(s)://<host>:${port}/`);
});
