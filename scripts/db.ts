/**
 * Lệnh dữ liệu, tự xử lý theo DATA_DRIVER:
 *   pnpm db:migrate | db:rollback | db:status   — chỉ POSTGRES (JSON: bỏ qua)
 *   pnpm db:make --name create_x --container Studio/Workspace
 *   pnpm db:seed    — chạy mọi Seeder qua repository (cả hai driver)
 *   pnpm db:reset   — xoá toàn bộ dữ liệu của driver hiện tại
 *
 * Migration: src/containers/<Section>/<Container>/Data/Migrations/<yyyyMMddHHmmss>_<name>.ts
 *   export async function up(db: Kysely<any>) {}  export async function down(db: Kysely<any>) {}
 * Seeder:    src/containers/<Section>/<Container>/Data/Seeders/<name>.ts
 *   export default async function seed(): Promise<void> {}
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Migrator, type Migration, type MigrationProvider } from "kysely/migration";
import { createPostgresKysely, dataDriver } from "@/ship/adapters/data";
import { env } from "@/ship/engine/env";

const CONTAINERS = path.resolve("src/containers");

function containerDirs(): string[] {
  return readdirSync(CONTAINERS, { withFileTypes: true })
    .filter((s) => s.isDirectory())
    .flatMap((s) =>
      readdirSync(path.join(CONTAINERS, s.name), { withFileTypes: true })
        .filter((c) => c.isDirectory())
        .map((c) => path.join(CONTAINERS, s.name, c.name)),
    );
}

function filesIn(sub: string): string[] {
  return containerDirs()
    .map((d) => path.join(d, sub))
    .filter(existsSync)
    .flatMap((d) => readdirSync(d).filter((f) => /\.ts$/.test(f) && !f.endsWith(".test.ts")).map((f) => path.join(d, f)));
}

/** Gom migration của mọi container, sắp theo tên file (tiền tố thời gian). */
class ContainersMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    const out: Record<string, Migration> = {};
    for (const file of filesIn("Data/Migrations").sort((a, b) => path.basename(a).localeCompare(path.basename(b)))) {
      const name = path.basename(file, ".ts");
      if (out[name]) throw new Error(`Trùng tên migration: ${name}`);
      out[name] = (await import(pathToFileURL(file).href)) as Migration;
    }
    return out;
  }
}

async function withMigrator<T>(fn: (m: Migrator) => Promise<T>): Promise<T | undefined> {
  const e = env();
  if (e.DATA_DRIVER !== "POSTGRES") {
    console.log("DATA_DRIVER=JSON: không cần migration, bỏ qua.");
    return undefined;
  }
  const db = createPostgresKysely(e.DATABASE_URL!);
  try {
    return await fn(new Migrator({ db, provider: new ContainersMigrationProvider() }));
  } finally {
    await db.destroy();
  }
}

function report(results: { migrationName: string; status: string }[] | undefined, error: unknown) {
  for (const r of results ?? []) console.log(`${r.status === "Success" ? "✓" : "✗"} ${r.migrationName}`);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  if (!results?.length) console.log("Không có migration nào cần chạy.");
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const commands: Record<string, () => Promise<void>> = {
  async migrate() {
    await withMigrator(async (m) => {
      const { results, error } = await m.migrateToLatest();
      report(results, error);
    });
  },
  async rollback() {
    await withMigrator(async (m) => {
      const { results, error } = await m.migrateDown();
      report(results, error);
    });
  },
  async status() {
    await withMigrator(async (m) => {
      for (const mig of await m.getMigrations()) console.log(`${mig.executedAt ? "✓" : "·"} ${mig.name}`);
    });
  },
  async make() {
    const name = arg("name");
    const container = arg("container");
    if (!name || !/^[a-z0-9_]+$/.test(name)) throw new Error("--name bắt buộc, dạng snake_case");
    if (!container || !existsSync(path.join(CONTAINERS, container))) throw new Error(`--container không tồn tại: ${container}`);
    const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const dir = path.join(CONTAINERS, container, "Data/Migrations");
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${stamp}_${name}.ts`);
    writeFileSync(
      file,
      `import type { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // await db.schema.createTable("...").addColumn("id", "text", (c) => c.primaryKey()).execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  // await db.schema.dropTable("...").execute();
}
`,
    );
    console.log(`Đã tạo ${path.relative(process.cwd(), file)}`);
  },
  async seed() {
    const files = filesIn("Data/Seeders");
    for (const file of files) {
      const mod = (await import(pathToFileURL(file).href)) as { default?: () => Promise<void> };
      if (typeof mod.default !== "function") throw new Error(`${file}: thiếu export default async function`);
      await mod.default();
      console.log(`✓ ${path.relative(CONTAINERS, file)}`);
    }
    if (!files.length) console.log("Chưa có seeder nào.");
  },
  async reset() {
    await dataDriver().reset();
    console.log(`Đã xoá dữ liệu (${env().DATA_DRIVER}).`);
  },
};

const cmd = process.argv[2];
if (!cmd || !commands[cmd]) {
  console.error(`Lệnh không hợp lệ. Dùng: ${Object.keys(commands).join(" | ")}`);
  process.exit(2);
}
commands[cmd]()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
