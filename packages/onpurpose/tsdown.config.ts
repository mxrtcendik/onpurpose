import { defineConfig } from "tsdown";

export default defineConfig({
  platform: "neutral",
  dts: true,
  deps: {
    onlyBundle: [],
  },
  outputOptions: {
    banner(chunk) {
      return chunk.fileName.endsWith(".js") ? '"use client";\n' : "";
    },
  },
});
