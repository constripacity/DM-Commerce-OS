import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    clearMocks: true,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("src", import.meta.url)) },
  },
  root: projectRoot,
});
