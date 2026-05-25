import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import rootPackage from "../../package.json";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  define: {
    __QUICKNOTE_VERSION__: JSON.stringify(rootPackage.version),
  },
  resolve: {
    alias: {
      "@quicknote/branding": fileURLToPath(new URL("../../packages/branding/src", import.meta.url)),
      "@quicknote/native-bridge": fileURLToPath(new URL("../../packages/native-bridge/src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["tests/layout/**"],
    coverage: {
      enabled: false,
      reporter: ["text"],
    },
  },
});
