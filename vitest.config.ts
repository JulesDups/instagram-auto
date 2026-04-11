import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["test/**/*.test.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // server-only is a Next.js guard that throws in non-server environments.
      // In Vitest (Node), we stub it out so repo modules can be imported directly.
      "server-only": path.resolve(__dirname, "test/helpers/server-only-stub.ts"),
    },
  },
});
