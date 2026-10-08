import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Quy tắc cho AI agent nằm ở CLAUDE.md (AGENTS.md là symlink); không để `next dev` tự ghi vào đó.
  agentRules: false,
  // Module native / chỉ chạy trên Node, không bundle.
  serverExternalPackages: ["@napi-rs/keyring", "pg", "simple-git", "chokidar", "execa"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
