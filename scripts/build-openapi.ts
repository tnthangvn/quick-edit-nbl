/**
 * Sinh docs/api.json từ mọi defineRoute (src/containers/registry.ts).
 * Chạy: pnpm api:build (tsx --conditions=react-server để import được module "server-only").
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { allRoutes } from "@/containers/registry";
import { buildOpenApiDocument } from "@/ship/engine/openapi";

const out = path.resolve("docs/api.json");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(buildOpenApiDocument(allRoutes), null, 2) + "\n");
console.log(`docs/api.json: ${allRoutes.length} operation`);
