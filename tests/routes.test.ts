import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allRoutes } from "@/containers/registry";

/** "/api/workspaces/{workspaceId}" → "app/api/workspaces/[workspaceId]/route.ts" */
const routeFile = (p: string) => path.join("app", p.replace(/\{(\w+)\}/g, "[$1]"), "route.ts");

describe("routes", () => {
  for (const route of allRoutes) {
    it(`${route.method.toUpperCase()} ${route.path} có file route khớp`, () => {
      const file = routeFile(route.path);
      expect(existsSync(file), `thiếu ${file}`).toBe(true);
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(new RegExp(`export const ${route.method.toUpperCase()}\\s*=`));
    });
  }

  it("operationId không trùng", () => {
    const ids = allRoutes.map((r) => r.operationId);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
});
