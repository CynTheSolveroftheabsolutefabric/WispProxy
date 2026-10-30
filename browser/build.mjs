import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "dist");
const require = createRequire(import.meta.url);

async function packageRoot(specifier) {
  let current = path.dirname(require.resolve(specifier));
  while (true) {
    try {
      const metadata = JSON.parse(await readFile(path.join(current, "package.json"), "utf8"));
      if (metadata.name === specifier) return current;
    } catch {}
    const parent = path.dirname(current);
    if (parent === current) throw new Error(`Could not locate package root for ${specifier}`);
    current = parent;
  }
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const [pkg, target] of [
  ["@mercuryworkshop/scramjet", "scram"],
  ["@mercuryworkshop/scramjet-controller", "controller"],
  ["@mercuryworkshop/scramjet-utils", "utils"],
  ["@mercuryworkshop/libcurl-transport", "libcurl"],
]) {
  await cp(await packageRoot(pkg), path.join(out, target), { recursive: true });
}

for (const file of ["index.html", "app.js", "sw.js"]) {
  await cp(path.join(here, file), path.join(out, file));
}
console.log("Built browser frontend into browser/dist");
