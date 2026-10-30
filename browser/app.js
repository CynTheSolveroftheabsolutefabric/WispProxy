const base = new URL("./", location.href).pathname;
const endpointInput = document.querySelector("#wisp");
const addressInput = document.querySelector("#address");
const status = document.querySelector("#status");
const iframe = document.querySelector("#page");
let controller;
let frame;

endpointInput.value = localStorage.getItem("wisp-endpoint") || "";

function normalizeAddress(value) {
  const text = value.trim();
  if (!text) throw new Error("Enter a website address.");
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(text)) return "https://" + text;
  return "https://www.google.com/search?q=" + encodeURIComponent(text);
}

async function connect(endpoint) {
  if (!/^wss?:\/\//i.test(endpoint)) throw new Error("The Wisp endpoint must start with ws:// or wss://.");
  status.textContent = "Registering browser service worker…";
  const registration = await navigator.serviceWorker.register(base + "sw.js", { scope: base });
  await navigator.serviceWorker.ready;

  if (!navigator.serviceWorker.controller) {
    status.textContent = "Activating service worker (the page may reload once)…";
    await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
  }
  const serviceworker = navigator.serviceWorker.controller ?? registration.active;
  if (!serviceworker) throw new Error("No active service worker was found.");

  const { default: LibcurlClient } = await import(base + "libcurl/index.mjs");
  const { Controller } = globalThis.$scramjetController;
  controller = new Controller({
    serviceworker,
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

document.querySelector("#settings").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await connect(endpointInput.value.trim());
  } catch (error) {
    status.textContent = "Connection failed: " + (error?.message || String(error));
  }
});

document.querySelector("#navigate").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    if (!frame) throw new Error("Connect to Wisp first.");
    const url = normalizeAddress(addressInput.value);
    status.textContent = "Loading " + url;
    frame.go(url);
  } catch (error) {
    status.textContent = error?.message || String(error);
  }
});

if (!("serviceWorker" in navigator)) {
  status.textContent = "This browser does not support service workers. Open this site over HTTPS.";
}
