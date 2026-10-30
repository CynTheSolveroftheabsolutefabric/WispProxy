# WispProxy

A small Node.js server for the [Wisp protocol](https://github.com/MercuryWorkshop/wisp-protocol), powered by `@mercuryworkshop/wisp-js`.

Wisp tunnels TCP/UDP streams over a WebSocket. It is a transport layer—not a complete web-page renderer. To browse websites, connect a compatible browser/proxy client (for example, a client built with a web-proxy framework) to this server.

## Run locally

Requires Node.js 20 or newer.

```sh
npm install
npm start
```

By default, the server listens on port `5001`. Set `PORT` for hosting platforms:

```sh
PORT=8080 npm start
```

- WebSocket endpoint: `ws://localhost:5001/` (use `wss://` behind HTTPS)
- Health endpoint: `http://localhost:5001/health`

## Client connection

A Wisp JS client can connect to the endpoint:

```js
import { client as wisp } from "@mercuryworkshop/wisp-js/client";

const connection = new wisp.ClientConnection("ws://localhost:5001/");
connection.onopen = () => console.log("Wisp connection ready");
connection.onerror = () => console.error("Wisp connection failed");
```

For secure public deployment, terminate TLS at your host/reverse proxy and use the resulting `wss://` URL.

## Security defaults

The server allows TCP streams, disables UDP, rejects private and loopback IP destinations, and limits stream counts. Do not enable private/loopback destinations on a public instance unless you understand the server-side request risks. Add authentication and rate limits before operating a public service.

## Deploy

Deploy this as a **Node.js service** on a host that supports persistent WebSocket connections. Static-only hosts (including typical static-site deployments) cannot run this server process.
