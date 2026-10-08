import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonDataDriver } from "@/ship/adapters/data/JsonDataDriver";
import type { ModelName } from "@/ship/contracts/data";

type Item = { id: string; name: string; group: string; n: number; created_at: string; updated_at: string };
const M = "items" as ModelName;
const row = (id: string, group: string, n: number): Item => ({ id, name: `item-${id}`, group, n, created_at: "", updated_at: "" });

describe("JsonDataDriver", () => {
  let dir: string;
  let driver: JsonDataDriver;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "spec-studio-json-"));
    driver = new JsonDataDriver(dir);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("insert, lọc, sắp xếp, phân trang", async () => {
    await driver.insertMany<Item>(M, [row("1", "a", 3), row("2", "b", 1), row("3", "a", 2)]);
    expect((await driver.findMany<Item>(M, { group: "a" }, { orderBy: [["n", "asc"]] })).map((r) => r.id)).toEqual(["3", "1"]);
    expect(await driver.count<Item>(M, { n: { gte: 2 } })).toBe(2);
    expect((await driver.findMany<Item>(M, { id: ["1", "2"] }, { limit: 1, orderBy: [["id", "desc"]] }))[0].id).toBe("2");
    expect((await driver.findMany<Item>(M, { name: { like: "item-%" } })).length).toBe(3);
  });

  it("update, delete, upsert", async () => {
    await driver.insertMany<Item>(M, [row("1", "a", 1), row("2", "b", 2)]);
    expect(await driver.update<Item>(M, { group: "a" }, { n: 9 })).toBe(1);
    expect(await driver.delete<Item>(M, { id: "2" })).toBe(1);
    await driver.upsert<Item>(M, { ...row("x", "a", 5), name: "item-1" }, ["name"]);
    const all = await driver.findMany<Item>(M, {});
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: "1", n: 5 });
  });

  it("transaction lỗi thì không ghi gì", async () => {
    await driver.insert<Item>(M, row("1", "a", 1));
    await expect(
      driver.transaction(async (trx) => {
        await trx.insert<Item>(M, row("2", "a", 2));
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect(await driver.count<Item>(M, {})).toBe(1);
  });

  it("join", async () => {
    const P = "parents" as ModelName;
    await driver.insert(P, { id: "p1", title: "P" });
    await driver.insertMany<Item>(M, [{ ...row("1", "p1", 1) }, { ...row("2", "none", 1) }]);
    const joined = await driver.join<Item>(M, [{ model: P, on: ["group", "id"], as: "parent" }], {});
    expect(joined).toHaveLength(1);
    expect(joined[0].parent).toMatchObject({ title: "P" });
  });
});
