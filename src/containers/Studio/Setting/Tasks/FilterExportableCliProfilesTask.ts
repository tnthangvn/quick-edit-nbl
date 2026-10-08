import "server-only";
import type { CliProfile } from "@/ship/contracts/agentSettings";
import { Task } from "@/ship/parents/Task";

/** Lọc bỏ entry `env` dạng "secret:ref" trước khi xuất — ref vô dụng ở máy khác, không nên lộ cấu trúc nội bộ. */
export class FilterExportableCliProfilesTask extends Task<CliProfile[], CliProfile[]> {
  async run(profiles: CliProfile[]): Promise<CliProfile[]> {
    return profiles.map((p) => ({
      ...p,
      env: Object.fromEntries(Object.entries(p.env).filter(([, v]) => !v.startsWith("secret:"))),
    }));
  }
}
