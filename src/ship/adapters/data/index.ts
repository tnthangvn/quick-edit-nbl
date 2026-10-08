import "server-only";
import type { DataDriver } from "@/ship/contracts/data";
import { env } from "@/ship/engine/env";
import { JsonDataDriver } from "./JsonDataDriver";
import { createPostgresKysely, PostgresDataDriver } from "./PostgresDataDriver";

const globalForData = globalThis as unknown as { __specStudioData?: DataDriver };

/** Driver theo DATA_DRIVER, tạo một lần và giữ qua hot reload. */
export function dataDriver(): DataDriver {
  if (!globalForData.__specStudioData) {
    const e = env();
    globalForData.__specStudioData =
      e.DATA_DRIVER === "POSTGRES" ? new PostgresDataDriver(createPostgresKysely(e.DATABASE_URL!)) : new JsonDataDriver(e.DATA_DIR);
  }
  return globalForData.__specStudioData;
}

/** Chỉ dùng trong test: thay driver (vd JsonDataDriver trỏ thư mục tạm). */
export function setDataDriverForTesting(driver: DataDriver | undefined) {
  globalForData.__specStudioData = driver;
}

export { JsonDataDriver, PostgresDataDriver, createPostgresKysely };
