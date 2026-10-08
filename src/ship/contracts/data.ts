import { z } from "zod";

/** Nguồn dữ liệu của repository, chọn bằng env DATA_DRIVER. */
export const DataDriverName = z.enum(["JSON", "POSTGRES"]).meta({ id: "DataDriver" });
export type DataDriverName = z.infer<typeof DataDriverName>;

/**
 * Danh bạ model. Mỗi container tự khai model của mình bằng module augmentation:
 *
 *   declare module "@/ship/contracts/data" {
 *     interface DataModels { workspaces: WorkspaceRow }
 *   }
 *
 * Tên model = tên file JSON = tên bảng Postgres (snake_case, số nhiều).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DataModels {}

export type ModelName = keyof DataModels & string;
export type Row<M extends ModelName> = DataModels[M];

/** Cột hệ thống do RepositoryBase tự gán. */
export type SystemColumns = { id: string; created_at: string; updated_at: string };
export type NewRow<M extends ModelName> = Omit<Row<M>, keyof SystemColumns> & Partial<SystemColumns>;
export type RowPatch<M extends ModelName> = Partial<Omit<Row<M>, "id" | "created_at">>;

export type FilterOperators<V> = {
  ne?: V | null;
  gt?: V;
  gte?: V;
  lt?: V;
  lte?: V;
  like?: string;
};

/** Điều kiện lọc dùng chung cho mọi driver: =, IN (mảng), IS NULL (null), toán tử so sánh. */
export type Filter<R> = { [K in keyof R]?: R[K] | R[K][] | null | FilterOperators<R[K]> };

export type FindOptions<R> = {
  orderBy?: [keyof R & string, "asc" | "desc"][];
  limit?: number;
  offset?: number;
};

export type JoinSpec = {
  /** model được join */
  model: ModelName;
  /** [cột của model gốc, cột của model được join] */
  on: [string, string];
  /** tên khoá chứa row được join trong kết quả */
  as: string;
  type?: "inner" | "left";
};

/** Kết quả join: row gốc kèm các row được join theo `as`. */
export type Joined<R> = R & Record<string, unknown>;

export interface DataDriver {
  readonly name: DataDriverName;
  findMany<R>(model: ModelName, filter: Filter<R>, opts?: FindOptions<R>): Promise<R[]>;
  count<R>(model: ModelName, filter: Filter<R>): Promise<number>;
  insert<R>(model: ModelName, row: R): Promise<R>;
  insertMany<R>(model: ModelName, rows: R[]): Promise<R[]>;
  upsert<R>(model: ModelName, row: R, conflict: (keyof R & string)[]): Promise<R>;
  update<R>(model: ModelName, filter: Filter<R>, patch: Partial<R>): Promise<number>;
  delete<R>(model: ModelName, filter: Filter<R>): Promise<number>;
  join<R>(model: ModelName, joins: JoinSpec[], filter: Filter<R>, opts?: FindOptions<R>): Promise<Joined<R>[]>;
  /** Xoá toàn bộ dữ liệu của mọi model (make db-reset). */
  reset(): Promise<void>;
  transaction<T>(fn: (trx: DataDriver) => Promise<T>): Promise<T>;
}
