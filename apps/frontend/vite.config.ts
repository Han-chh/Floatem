import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import rootPackage from "../../package.json";

export default defineConfig(({ mode }) => {
  const frontendRoot = fileURLToPath(new URL(".", import.meta.url));
  const buildInput: Record<string, string> = mode === "stickit-main"
    ? { main: resolve(frontendRoot, "index.html") }
    : mode === "stickit-floating"
      ? { floating: resolve(frontendRoot, "floating.html") }
      : {
          main: resolve(frontendRoot, "index.html"),
          floating: resolve(frontendRoot, "floating.html"),
        };

  return {
    root: frontendRoot,
    base: "./",
    plugins: [react(), tailwindcss()],
    clearScreen: false,
    define: {
      __STICKIT_VERSION__: JSON.stringify(rootPackage.version),
      __STICKIT_BUILD__: JSON.stringify(String(rootPackage.buildNumber)),
    },
    resolve: {
      alias: {
        "@stickit/branding": fileURLToPath(new URL("../../packages/branding/src", import.meta.url)),
        "@stickit/native-bridge": fileURLToPath(new URL("../../packages/native-bridge/src", import.meta.url)),
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: mode !== "stickit-floating",
      rollupOptions: {
        input: buildInput,
      },
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
  };
});
