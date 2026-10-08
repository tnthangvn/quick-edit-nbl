import "server-only";
import { Kysely, PostgresDialect, sql, type Transaction } from "kysely";
import { Pool } from "pg";
import type { DataDriver, Filter, FindOptions, Joined, JoinSpec, ModelName } from "@/ship/contracts/data";
import { assertIdentifier, isOperatorObject } from "./filter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = Kysely<any> | Transaction<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQb = any;

export function createPostgresKysely(url: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Kysely<any>({ dialect: new PostgresDialect({ pool: new Pool({ connectionString: url, max: 10 }) }) });
}

/** Áp Filter vào query builder của Kysely (select / update / delete). */
function applyFilter<R>(qb: AnyQb, filter: Filter<R>, table?: string): AnyQb {
  const col = (c: string) => (table ? `${table}.${assertIdentifier(c)}` : assertIdentifier(c));
  for (const [key, cond] of Object.entries(filter)) {
    if (cond === undefined) continue;
    if (cond === null) qb = qb.where(col(key), "is", null);
    else if (Array.isArray(cond)) qb = cond.length ? qb.where(col(key), "in", cond) : qb.where(sql<boolean>`false`);
    else if (isOperatorObject(cond)) {
      if ("ne" in cond) qb = cond.ne === null ? qb.where(col(key), "is not", null) : qb.where(col(key), "<>", cond.ne);
      if (cond.gt !== undefined) qb = qb.where(col(key), ">", cond.gt);
      if (cond.gte !== undefined) qb = qb.where(col(key), ">=", cond.gte);
      if (cond.lt !== undefined) qb = qb.where(col(key), "<", cond.lt);
      if (cond.lte !== undefined) qb = qb.where(col(key), "<=", cond.lte);
      if (cond.like !== undefined) qb = qb.where(col(key), "ilike", cond.like);
    } else qb = qb.where(col(key), "=", cond);
  }
  return qb;
}

function applyOptions<R>(qb: AnyQb, opts: FindOptions<R> = {}, table?: string): AnyQb {
  for (const [c, dir] of opts.orderBy ?? []) qb = qb.orderBy(table ? `${table}.${assertIdentifier(c)}` : assertIdentifier(c), dir);
  if (opts.limit !== undefined) qb = qb.limit(opts.limit);
  if (opts.offset !== undefined) qb = qb.offset(opts.offset);
  return qb;
}

/** Mỗi model là một bảng cùng tên. Schema bảng do migration của container tạo (make migrate). */
export class PostgresDataDriver implements DataDriver {
  readonly name = "POSTGRES" as const;

  constructor(private readonly db: AnyDb) {}

  async findMany<R>(model: ModelName, filter: Filter<R>, opts?: FindOptions<R>): Promise<R[]> {
    const qb = this.db.selectFrom(assertIdentifier(model)).selectAll();
    return applyOptions(applyFilter(qb, filter), opts).execute();
  }

  async count<R>(model: ModelName, filter: Filter<R>): Promise<number> {
    const qb = this.db.selectFrom(assertIdentifier(model)).select(sql<string>`count(*)`.as("n"));
    const row = await applyFilter(qb, filter).executeTakeFirstOrThrow();
    return Number(row.n);
  }

  async insert<R>(model: ModelName, row: R): Promise<R> {
    return (await this.insertMany(model, [row]))[0];
  }

  async insertMany<R>(model: ModelName, rows: R[]): Promise<R[]> {
    if (!rows.length) return [];
    const out: R[] = [];
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      out.push(...((await this.db.insertInto(assertIdentifier(model)).values(chunk as never).returningAll().execute()) as R[]));
    }
    return out;
  }

  async upsert<R>(model: ModelName, row: R, conflict: (keyof R & string)[]): Promise<R> {
    const { id: _id, created_at: _createdAt, ...patch } = row as Record<string, unknown>;
    for (const c of conflict) delete patch[c];
    return (await this.db
      .insertInto(assertIdentifier(model))
      .values(row as never)
      .onConflict((oc) => oc.columns(conflict.map(assertIdentifier)).doUpdateSet(patch as never))
      .returningAll()
      .executeTakeFirstOrThrow()) as R;
  }

  async update<R>(model: ModelName, filter: Filter<R>, patch: Partial<R>): Promise<number> {
    const qb = this.db.updateTable(assertIdentifier(model)).set(patch as never);
    const res = await applyFilter(qb, filter).executeTakeFirst();
    return Number(res.numUpdatedRows);
  }

  async delete<R>(model: ModelName, filter: Filter<R>): Promise<number> {
    const res = await applyFilter(this.db.deleteFrom(assertIdentifier(model)), filter).executeTakeFirst();
    return Number(res.numDeletedRows);
  }

  async join<R>(model: ModelName, joins: JoinSpec[], filter: Filter<R>, opts?: FindOptions<R>): Promise<Joined<R>[]> {
    const base = assertIdentifier(model);
    let qb: AnyQb = this.db.selectFrom(base).selectAll(base);
    for (const j of joins) {
      const target = `${assertIdentifier(j.model)} as ${assertIdentifier(j.as)}`;
      const left = `${base}.${assertIdentifier(j.on[0])}`;
      const right = `${j.as}.${assertIdentifier(j.on[1])}`;
      qb = (j.type ?? "inner") === "inner" ? qb.innerJoin(target, left, right) : qb.leftJoin(target, left, right);
      qb = qb.select(sql.raw(`to_jsonb("${j.as}".*)`).as(j.as));
    }
    return applyOptions(applyFilter(qb, filter, base), opts, base).execute();
  }

  async reset(): Promise<void> {
    const { rows } = await sql<{ tablename: string }>`
      select tablename from pg_tables where schemaname = current_schema() and tablename not like 'kysely_%'
    `.execute(this.db);
    if (rows.length) await sql.raw(`truncate ${rows.map((r) => `"${assertIdentifier(r.tablename)}"`).join(", ")} cascade`).execute(this.db);
  }

  transaction<T>(fn: (trx: DataDriver) => Promise<T>): Promise<T> {
    if (this.db.isTransaction) return fn(this);
    return (this.db as Kysely<unknown>).transaction().execute((trx) => fn(new PostgresDataDriver(trx)));
  }
}
