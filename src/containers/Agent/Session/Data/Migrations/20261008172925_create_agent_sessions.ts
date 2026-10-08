import { sql, type Kysely } from "kysely";
import { CliRunStatus } from "../../../CliRunner/Enums/CliRunStatus";

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("agent_sessions")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("workspace_id", "text", (c) => c.notNull())
    .addColumn("title", "text")
    .addColumn("cli_profile_id", "text")
    .addColumn("cli_session_id", "text")
    .addColumn("messages", "jsonb", (c) => c.notNull().defaultTo(sql`'{"items":[]}'::jsonb`))
    .addColumn("created_at", "text", (c) => c.notNull())
    .addColumn("updated_at", "text", (c) => c.notNull())
    .execute();
  await db.schema.createIndex("agent_sessions_workspace_idx").on("agent_sessions").columns(["workspace_id", "updated_at"]).execute();

  await db.schema
    .createTable("agent_session_runs")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("session_id", "text", (c) => c.notNull().references("agent_sessions.id").onDelete("cascade"))
    .addColumn("prompt", "text", (c) => c.notNull())
    .addColumn("profile_id", "text", (c) => c.notNull())
    .addColumn("status", "text", (c) => c.notNull().check(sql`status IN (${inList(CliRunStatus.options)})`))
    .addColumn("exit_code", "integer")
    .addColumn("error", "jsonb")
    .addColumn("events", "jsonb", (c) => c.notNull().defaultTo(sql`'{"items":[]}'::jsonb`))
    .addColumn("created_at", "text", (c) => c.notNull())
    .addColumn("updated_at", "text", (c) => c.notNull())
    .execute();
  await db.schema.createIndex("agent_session_runs_session_idx").on("agent_session_runs").columns(["session_id", "created_at"]).execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("agent_session_runs").execute();
  await db.schema.dropTable("agent_sessions").execute();
}
