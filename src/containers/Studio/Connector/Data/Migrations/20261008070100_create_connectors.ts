import { sql, type Kysely } from "kysely";
import { ConnectorType, GitProvider } from "@/ship/contracts/enums/sync";
import { ConnectorStatus } from "../../Enums/ConnectorStatus";
import { McpTransport } from "../../Enums/McpTransport";

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("connectors")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("name", "text", (c) => c.notNull())
    .addColumn("type", "text", (c) => c.notNull().check(sql`type IN (${inList(ConnectorType.options)})`))
    .addColumn("provider", "text", (c) => c.notNull().check(sql`provider IN (${inList(GitProvider.options)})`))
    .addColumn("host", "text")
    .addColumn("command", "text")
    .addColumn("args", sql`text[]`, (c) => c.notNull().defaultTo(sql`'{}'`))
    .addColumn("env", "jsonb", (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("transport", "text", (c) => c.check(sql`transport IN (${inList(McpTransport.options)})`))
    .addColumn("url", "text")
    .addColumn("headers", "jsonb", (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("secret_keys", sql`text[]`, (c) => c.notNull().defaultTo(sql`'{}'`))
    .addColumn("agent_tools", sql`text[]`, (c) => c.notNull().defaultTo(sql`'{}'`))
    .addColumn("has_token", "boolean", (c) => c.notNull().defaultTo(false))
    .addColumn("status", "text", (c) => c.check(sql`status IN (${inList(ConnectorStatus.options)})`))
    .addColumn("account", "text")
    .addColumn("scopes", sql`text[]`, (c) => c.notNull().defaultTo(sql`'{}'`))
    .addColumn("checked_at", "text")
    .addColumn("created_at", "text", (c) => c.notNull())
    .addColumn("updated_at", "text", (c) => c.notNull())
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("connectors").execute();
}
