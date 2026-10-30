import http from "node:http";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const port = Number(process.env.PORT || 5001);
const host = process.env.HOST || "0.0.0.0";

// Safe baseline: TCP only, limited concurrent streams, no private/loopback targets.
wisp.options.allow_udp_streams = false;
wisp.options.allow_tcp_streams = true;
wisp.options.allow_private_ips = false;
wisp.options.allow_loopback_ips = false;
wisp.options.stream_limit_total = 128;
wisp.options.stream_limit_per_host = 16;
wisp.options.wisp_version = 2;

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, service: "wisp-proxy" }));
    return;
  }

  res.writeHead(200, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end("Wisp proxy is online. Connect a Wisp-compatible client at this WebSocket endpoint: /");
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
  console.log(`Wisp proxy listening on ${host}:${port}`);
  console.log(`WebSocket endpoint: ws(s)://<host>:${port}/`);
});
