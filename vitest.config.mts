import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // "server-only" ném lỗi khi import ngoài React Server; trong test thay bằng module rỗng.
      "server-only": path.resolve("tests/stubs/empty.ts"),
    },
  },
  test: {
    // Test component UI: thêm dòng `// @vitest-environment jsdom` ở đầu file.
    include: ["tests/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
    environment: "node",
    env: { NODE_ENV: "test", DATA_DRIVER: "JSON" },
  },
});
