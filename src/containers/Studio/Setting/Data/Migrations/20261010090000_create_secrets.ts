import { type Kysely } from "kysely";

/** Bảng secrets dùng chung (model khai ở ship/contracts/secrets): value luôn là ciphertext "enc:v1:...". */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("secrets")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("ref", "text", (c) => c.notNull().unique())
    .addColumn("value", "text", (c) => c.notNull())
    .addColumn("created_at", "text", (c) => c.notNull())
    .addColumn("updated_at", "text", (c) => c.notNull())
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("secrets").execute();
}
