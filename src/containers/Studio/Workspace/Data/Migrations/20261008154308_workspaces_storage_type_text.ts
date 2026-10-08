import { sql, type Kysely } from "kysely";
import { StorageType } from "@/ship/contracts/enums/StorageType";

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

/**
 * Workspace giờ bật đồng thời nhiều storage (Local luôn có, Git/Drive tuỳ chọn thêm): `storage_type` đổi từ 1 giá trị
 * có CHECK literal sang chuỗi CSV tự do (`"LOCAL"`, `"LOCAL,GIT"`, `"LOCAL,GIT,DRIVE"`...), lọc bằng LIKE.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("workspaces").dropConstraint("workspaces_storage_type_check").execute();
  await sql`
    update workspaces
    set storage_type = case storage_type
      when 'GIT' then 'LOCAL,GIT'
      when 'DRIVE' then 'LOCAL,DRIVE'
      else storage_type
    end
  `.execute(db);
}

/** Lossy nếu có workspace đang bật nhiều storage cùng lúc (CSV bị cắt về giá trị cuối không khớp CHECK cũ). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    update workspaces
    set storage_type = case
      when storage_type like '%DRIVE%' then 'DRIVE'
      when storage_type like '%GIT%' then 'GIT'
      else 'LOCAL'
    end
  `.execute(db);
  await db.schema
    .alterTable("workspaces")
    .addCheckConstraint("workspaces_storage_type_check", sql`storage_type IN (${inList(StorageType.options)})`)
    .execute();
}
