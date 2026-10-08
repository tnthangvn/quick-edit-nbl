import { sql, type Kysely } from "kysely";
import { StorageType } from "@/ship/contracts/enums/StorageType";
import { WorkspaceStatus } from "../../Enums/WorkspaceStatus";

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("workspaces")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("name", "text", (c) => c.notNull())
    .addColumn("description", "text")
    .addColumn("path", "text", (c) => c.notNull().unique())
    .addColumn("specs_dir", "text", (c) => c.notNull())
    .addColumn("storage_type", "text", (c) => c.notNull().check(sql`storage_type IN (${inList(StorageType.options)})`))
    .addColumn("storage_label", "text")
    .addColumn("notebook_id", "text")
    .addColumn("status", "text", (c) => c.notNull().check(sql`status IN (${inList(WorkspaceStatus.options)})`))
    .addColumn("last_opened_at", "text")
    .addColumn("created_at", "text", (c) => c.notNull())
    .addColumn("updated_at", "text", (c) => c.notNull())
    .execute();
  await db.schema.createIndex("workspaces_name_lower_idx").on("workspaces").expression(sql`lower(name)`).unique().execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("workspaces").execute();
}
