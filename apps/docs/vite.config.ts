import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      onpurpose: fileURLToPath(new URL("../../packages/onpurpose/src/index.ts", import.meta.url)),
    },
  },
});
