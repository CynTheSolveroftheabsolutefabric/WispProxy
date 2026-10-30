const base = new URL("./", location.href).pathname;
const endpointInput = document.querySelector("#wisp");
const addressInput = document.querySelector("#address");
const status = document.querySelector("#status");
const iframe = document.querySelector("#page");
const params = new URLSearchParams(location.search);
const embedded = params.get("embedded") === "1";
let controller;
let frame;

if (embedded) {
  document.querySelector("#settings").hidden = true;
  document.querySelector("#navigate").hidden = true;
  document.querySelector("h2").hidden = true;
  document.body.style.padding = "0";
  document.querySelector("main").style.margin = "0";
  iframe.style.height = "100vh";
  iframe.style.border = "0";
}
endpointInput.value = params.get("wisp") || localStorage.getItem("wisp-endpoint") || "";

function detail(error) { return error?.stack || error?.message || String(error); }
function normalizeAddress(value) {
  const text = value.trim();
  if (!text) throw new Error("Enter a website address.");
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(text)) return "https://" + text;
  return "https://www.google.com/search?q=" + encodeURIComponent(text);
}
async function workerDiagnostics(worker) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => resolve("No diagnostic response from service worker."), 2500);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      const data = event.data || {};
      resolve(data.initError || (data.controllerLoaded ? "Service worker initialized." : "Scramjet controller did not load."));
    };
    worker.postMessage({ type: "WISPPROXY_DIAGNOSTICS" }, [channel.port2]);
  });
}
async function connect(endpoint) {
  if (!/^wss?:\/\//i.test(endpoint)) throw new Error("Wisp endpoint must start with ws:// or wss://.");
  status.hidden = false;
  status.textContent = "Registering service worker…";
  let registration;
  try {
    registration = await navigator.serviceWorker.register(base + "sw.js", { scope: base });
    await navigator.serviceWorker.ready;
  } catch (error) {
    throw new Error("Service worker registration failed: " + detail(error));
  }
  const worker = navigator.serviceWorker.controller ?? registration.active ?? registration.waiting;
  if (!worker) throw new Error("No active/waiting worker. Check HTTPS and sw.js path.");
  const diagnostic = await workerDiagnostics(worker);
  if (diagnostic !== "Service worker initialized.") throw new Error("Worker startup details:\n" + diagnostic);
  const { default: LibcurlClient } = await import(base + "libcurl/index.mjs");
  const { Controller } = globalThis.$scramjetController;
  if (!Controller) throw new Error("Scramjet Controller API missing from controller.api.js.");
  controller = new Controller({
    serviceworker: worker,
    transport: new LibcurlClient({ wisp: endpoint }),
    config: {
      prefix: base + "~/sj/",
      scramjetPath: base + "scram/scramjet.js",
      wasmPath: base + "scram/scramjet.wasm",
      injectPath: base + "controller/controller.inject.js"
    }
  });
  await controller.wait();
  frame = controller.createFrame(iframe);
  localStorage.setItem("wisp-endpoint", endpoint);
  status.textContent = "Connected to Wisp. Enter a URL above to browse.";
}
function browse(value) {
  if (!frame) throw new Error("Connect to Wisp first.");
  const url = normalizeAddress(value);
  status.textContent = "Loading " + url;
  frame.go(url);
}
document.querySelector("#settings").addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await connect(endpointInput.value.trim()); }
  catch (error) { status.hidden = false; status.textContent = "Connection failed:\n" + detail(error); }
});
document.querySelector("#navigate").addEventListener("submit", (event) => {
  event.preventDefault();
  try { browse(addressInput.value); }
  catch (error) { status.textContent = detail(error); }
});
if (embedded && endpointInput.value && params.get("url")) {
  connect(endpointInput.value).then(() => browse(params.get("url"))).catch((error) => {
    status.hidden = false;
    status.style.cssText = "display:block;white-space:pre-wrap;padding:12px;background:#fff0f0;color:#900;font:13px monospace;position:relative;z-index:9999";
    status.textContent = "WispProxy diagnostic:\n" + detail(error);
  });
}
if (!("serviceWorker" in navigator)) status.textContent = "Service workers unsupported; use HTTPS.";
