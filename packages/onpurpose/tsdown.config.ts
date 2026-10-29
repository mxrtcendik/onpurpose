import { defineConfig } from "tsdown";

export default defineConfig({
  platform: "neutral",
  dts: true,
  sourcemap: true,
  deps: {
    onlyBundle: [],
  },
  outputOptions: {
    banner(chunk) {
      return chunk.fileName.endsWith(".js") ? '"use client";\n' : "";
    },
  },
});
