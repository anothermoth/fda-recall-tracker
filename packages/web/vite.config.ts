import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const apiTarget = "http://127.0.0.1:3001";

const apiProxy = {
  "/recalls": { target: apiTarget, changeOrigin: true },
  "/health": { target: apiTarget, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  envDir: fileURLToPath(new URL("../..", import.meta.url)),
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: apiProxy,
  },
  preview: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: apiProxy,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    restoreMocks: true,
    css: true,
  },
});
