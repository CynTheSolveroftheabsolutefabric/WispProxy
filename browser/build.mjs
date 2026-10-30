import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "dist");
const require = createRequire(import.meta.url);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const [pkg, target] of [
  ["@mercuryworkshop/scramjet", "scram"],
  ["@mercuryworkshop/scramjet-controller", "controller"],
  ["@mercuryworkshop/scramjet-utils", "utils"],
  ["@mercuryworkshop/libcurl-transport", "libcurl"],
]) {
  const pkgDir = path.dirname(require.resolve(pkg + "/package.json"));
  await cp(pkgDir, path.join(out, target), { recursive: true });
}

for (const file of ["index.html", "app.js", "sw.js"]) {
  await cp(path.join(here, file), path.join(out, file));
}
console.log("Built browser frontend into browser/dist");
