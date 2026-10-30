let initError = null;
try {
  importScripts("./scram/scramjet.js", "./controller/controller.sw.js");
} catch (error) {
  initError = error?.stack || error?.message || String(error);
  console.error("[WispProxy] Service worker initialization failed:", initError);
}
self.addEventListener("message", (event) => {
  if (event.data?.type === "WISPPROXY_DIAGNOSTICS") {
    event.ports[0]?.postMessage({ initError, controllerLoaded: !!self.$scramjetController });
  }
});
self.addEventListener("fetch", (event) => {
  if (self.$scramjetController?.shouldRoute(event)) {
    event.respondWith(self.$scramjetController.route(event));
  }
});
