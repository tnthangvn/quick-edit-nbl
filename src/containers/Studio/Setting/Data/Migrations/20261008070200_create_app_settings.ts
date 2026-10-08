import { sql, type Kysely } from "kysely";
import { AppSettingKey } from "../../Enums/AppSettingKey";

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("app_settings")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("key", "text", (c) => c.notNull().unique().check(sql`key IN (${inList(AppSettingKey.options)})`))
    .addColumn("value", "jsonb", (c) => c.notNull())
    .addColumn("created_at", "text", (c) => c.notNull())
    .addColumn("updated_at", "text", (c) => c.notNull())
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("app_settings").execute();
}
