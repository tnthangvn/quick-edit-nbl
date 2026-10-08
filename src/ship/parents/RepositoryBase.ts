import "server-only";
import { v7 as uuidv7 } from "uuid";
import { dataDriver } from "@/ship/adapters/data";
import type {
  DataDriver,
  Filter,
  FindOptions,
  Joined,
  JoinSpec,
  ModelName,
  NewRow,
  Row,
  RowPatch,
} from "@/ship/contracts/data";

export type Page<R> = { items: R[]; total: number; page: number; perPage: number };

/**
 * Lớp gốc của mọi repository. Chạy được trên mọi driver (JSON / POSTGRES) nhờ DataDriver.
 * Mọi hàm truy cập dữ liệu đều `protected`: repository con chỉ public hàm mang nghĩa nghiệp vụ.
 *
 *   export class WorkspaceRepository extends RepositoryBase<"workspaces"> {
 *     protected readonly model = "workspaces" as const;
 *     findByPath(path: string) { return this.findOne({ path }); }
 *   }
 */
export abstract class RepositoryBase<M extends ModelName> {
  /** Tên model = tên file JSON = tên bảng Postgres. */
  protected abstract readonly model: M;

  constructor(protected readonly driver: DataDriver = dataDriver()) {}

  /** Repository cùng loại chạy trong transaction do Action mở. */
  withTransaction(trx: DataDriver): this {
    const Ctor = this.constructor as new (driver: DataDriver) => this;
    return new Ctor(trx);
  }

  // ---------- đọc ----------

  protected findById(id: string): Promise<Row<M> | undefined> {
    return this.findOne({ id } as Filter<Row<M>>);
  }

  protected async findOne(filter: Filter<Row<M>>): Promise<Row<M> | undefined> {
    return (await this.driver.findMany<Row<M>>(this.model, filter, { limit: 1 }))[0];
  }

  protected findMany(filter: Filter<Row<M>> = {}, opts?: FindOptions<Row<M>>): Promise<Row<M>[]> {
    return this.driver.findMany<Row<M>>(this.model, filter, opts);
  }

  /** Bí danh của findMany, cho đọc gần với cách nghĩ "where ...". */
  protected where(filter: Filter<Row<M>>, opts?: FindOptions<Row<M>>): Promise<Row<M>[]> {
    return this.findMany(filter, opts);
  }

  protected join(joins: JoinSpec[], filter: Filter<Row<M>> = {}, opts?: FindOptions<Row<M>>): Promise<Joined<Row<M>>[]> {
    return this.driver.join<Row<M>>(this.model, joins, filter, opts);
  }

  protected async paginate(filter: Filter<Row<M>>, page = 1, perPage = 20, opts: Omit<FindOptions<Row<M>>, "limit" | "offset"> = {}): Promise<Page<Row<M>>> {
    const [items, total] = await Promise.all([
      this.findMany(filter, { ...opts, limit: perPage, offset: (page - 1) * perPage }),
      this.count(filter),
    ]);
    return { items, total, page, perPage };
  }

  protected count(filter: Filter<Row<M>> = {}): Promise<number> {
    return this.driver.count<Row<M>>(this.model, filter);
  }

  protected async exists(filter: Filter<Row<M>>): Promise<boolean> {
    return (await this.count(filter)) > 0;
  }

  // ---------- ghi ----------

  /** Gán id (UUID v7), created_at, updated_at nếu chưa có. */
  protected prepare(row: NewRow<M>): Row<M> {
    const now = new Date().toISOString();
    return { id: uuidv7(), created_at: now, updated_at: now, ...row } as unknown as Row<M>;
  }

  protected insert(row: NewRow<M>): Promise<Row<M>> {
    return this.driver.insert<Row<M>>(this.model, this.prepare(row));
  }

  protected multipleInsert(rows: NewRow<M>[]): Promise<Row<M>[]> {
    return this.driver.insertMany<Row<M>>(this.model, rows.map((r) => this.prepare(r)));
  }

  protected upsert(row: NewRow<M>, conflict: (keyof Row<M> & string)[]): Promise<Row<M>> {
    return this.driver.upsert<Row<M>>(this.model, this.prepare(row), conflict);
  }

  protected update(filter: Filter<Row<M>>, patch: RowPatch<M>): Promise<number> {
    this.assertFilter(filter, "update");
    return this.driver.update<Row<M>>(this.model, filter, { ...patch, updated_at: new Date().toISOString() } as Partial<Row<M>>);
  }

  protected updateById(id: string, patch: RowPatch<M>): Promise<number> {
    return this.update({ id } as Filter<Row<M>>, patch);
  }

  protected delete(filter: Filter<Row<M>>): Promise<number> {
    this.assertFilter(filter, "delete");
    return this.driver.delete<Row<M>>(this.model, filter);
  }

  protected deleteById(id: string): Promise<number> {
    return this.delete({ id } as Filter<Row<M>>);
  }

  /** Chặn update/delete không điều kiện (lỡ tay sửa / xoá cả bảng). */
  private assertFilter(filter: Filter<Row<M>>, op: string) {
    if (!Object.values(filter).some((v) => v !== undefined)) {
      throw new Error(`${this.model}.${op}() cần điều kiện lọc`);
    }
  }
}
