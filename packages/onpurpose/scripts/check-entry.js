import fs from "node:fs";

const js = fs.readFileSync(new URL("../dist/index.js", import.meta.url), "utf8");
const dts = fs.readFileSync(new URL("../dist/index.d.ts", import.meta.url), "utf8");

if (!js.startsWith('"use client";')) {
  console.error('dist/index.js must start with "use client";');
  console.error(js.slice(0, 120));
  process.exit(1);
}

if (dts.includes("use client")) {
  console.error("dist/index.d.ts must not contain the use client directive");
  process.exit(1);
}
