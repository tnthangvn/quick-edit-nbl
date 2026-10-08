import "server-only";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DataDriver, Filter, FindOptions, Joined, JoinSpec, ModelName } from "@/ship/contracts/data";
import { applyOptions, assertIdentifier, matches } from "./filter";

/** Hàng đợi ghi theo thư mục dữ liệu: mọi thao tác ghi / transaction chạy tuần tự. */
const queues = new Map<string, Promise<unknown>>();

function serialize<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  queues.set(
    key,
    next.catch(() => undefined),
  );
  return next;
}

/**
 * Mỗi model là một file `<DATA_DIR>/<model>.json` chứa mảng row.
 * Ghi file tạm rồi rename (không hỏng file khi tắt ngang), quyền 600.
 * Phù hợp app local một tiến trình; nhiều tiến trình cùng ghi thì dùng POSTGRES.
 */
export class JsonDataDriver implements DataDriver {
  readonly name = "JSON" as const;

  constructor(
    private readonly dir: string,
    /** Có giá trị khi đang trong transaction: đọc/ghi vào bản nháp, commit một lần ở cuối. */
    private readonly staged?: Map<string, unknown[]>,
  ) {}

  private file(model: string) {
    return path.join(this.dir, `${assertIdentifier(model)}.json`);
  }

  private async load<R>(model: string): Promise<R[]> {
    if (this.staged?.has(model)) return this.staged.get(model) as R[];
    try {
      const rows = JSON.parse(await readFile(this.file(model), "utf8")) as R[];
      if (this.staged) this.staged.set(model, rows);
      return rows;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }

  private async save<R>(model: string, rows: R[]) {
    if (this.staged) {
      this.staged.set(model, rows);
      return;
    }
    await writeAtomic(this.file(model), rows);
  }

  /** Ghi: trong transaction thì chạy thẳng (đã giữ khoá), ngoài transaction thì xếp hàng. */
  private mutate<T>(fn: () => Promise<T>): Promise<T> {
    return this.staged ? fn() : serialize(this.dir, fn);
  }

  async findMany<R>(model: ModelName, filter: Filter<R>, opts?: FindOptions<R>): Promise<R[]> {
    const rows = await this.load<R>(model);
    return applyOptions(
      rows.filter((r) => matches(r, filter)),
      opts,
    ).map((r) => structuredClone(r));
  }

  async count<R>(model: ModelName, filter: Filter<R>): Promise<number> {
    return (await this.load<R>(model)).filter((r) => matches(r, filter)).length;
  }

  insert<R>(model: ModelName, row: R): Promise<R> {
    return this.insertMany(model, [row]).then((r) => r[0]);
  }

  insertMany<R>(model: ModelName, newRows: R[]): Promise<R[]> {
    return this.mutate(async () => {
      const rows = await this.load<R>(model);
      const ids = new Set(rows.map((r) => (r as { id?: unknown }).id));
      for (const r of newRows) {
        const id = (r as { id?: unknown }).id;
        if (id !== undefined && ids.has(id)) throw new Error(`${model}: trùng id ${String(id)}`);
        ids.add(id);
      }
      await this.save(model, [...rows, ...newRows.map((r) => structuredClone(r))]);
      return newRows.map((r) => structuredClone(r));
    });
  }

  upsert<R>(model: ModelName, row: R, conflict: (keyof R & string)[]): Promise<R> {
    return this.mutate(async () => {
      const rows = await this.load<R>(model);
      const idx = rows.findIndex((r) => conflict.every((c) => r[c] === row[c]));
      if (idx === -1) {
        await this.save(model, [...rows, structuredClone(row)]);
        return structuredClone(row);
      }
      const { id: _id, created_at: _createdAt, ...rest } = row as Record<string, unknown>;
      const merged = { ...rows[idx], ...rest } as R;
      const next = [...rows];
      next[idx] = merged;
      await this.save(model, next);
      return structuredClone(merged);
    });
  }

  update<R>(model: ModelName, filter: Filter<R>, patch: Partial<R>): Promise<number> {
    return this.mutate(async () => {
      const rows = await this.load<R>(model);
      let n = 0;
      const next = rows.map((r) => {
        if (!matches(r, filter)) return r;
        n++;
        return { ...r, ...patch };
      });
      if (n) await this.save(model, next);
      return n;
    });
  }

  delete<R>(model: ModelName, filter: Filter<R>): Promise<number> {
    return this.mutate(async () => {
      const rows = await this.load<R>(model);
      const next = rows.filter((r) => !matches(r, filter));
      const n = rows.length - next.length;
      if (n) await this.save(model, next);
      return n;
    });
  }

  async join<R>(model: ModelName, joins: JoinSpec[], filter: Filter<R>, opts?: FindOptions<R>): Promise<Joined<R>[]> {
    const base = await this.findMany<R>(model, filter, opts);
    const others = await Promise.all(joins.map((j) => this.load<Record<string, unknown>>(j.model)));
    const out: Joined<R>[] = [];
    for (const row of base) {
      const result: Record<string, unknown> = { ...(row as object) };
      let keep = true;
      joins.forEach((j, i) => {
        const [left, right] = j.on;
        const match = others[i].find((o) => o[right] === (row as Record<string, unknown>)[left]);
        if (!match && (j.type ?? "inner") === "inner") keep = false;
        result[j.as] = match ? structuredClone(match) : null;
      });
      if (keep) out.push(result as Joined<R>);
    }
    return out;
  }

  reset(): Promise<void> {
    return serialize(this.dir, async () => {
      const files = await readdir(this.dir).catch(() => [] as string[]);
      await Promise.all(files.filter((f) => f.endsWith(".json")).map((f) => rm(path.join(this.dir, f), { force: true })));
    });
  }

  transaction<T>(fn: (trx: DataDriver) => Promise<T>): Promise<T> {
    if (this.staged) return fn(this); // transaction lồng nhau dùng chung bản nháp
    return serialize(this.dir, async () => {
      const staged = new Map<string, unknown[]>();
      const result = await fn(new JsonDataDriver(this.dir, staged));
      for (const [model, rows] of staged) await writeAtomic(this.file(model), rows);
      return result;
    });
  }
}

async function writeAtomic(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  await rename(tmp, file);
}
