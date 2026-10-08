import "server-only";
import { studio } from "@/containers/providers";
import type { SpecAccess } from "@/ship/contracts/studioAccess";
import { Task } from "@/ship/parents/Task";
import type { ContextSpec } from "../Models/ContextSpec";

/** Đọc nội dung các spec người dùng tick trên Sidebar (spec 6.1 bước 2). Lỗi SPEC.* từ Studio đi thẳng ra ngoài. */
export class LoadContextSpecsTask extends Task<{ workspaceId: string; files: string[] }, ContextSpec[]> {
  constructor(private readonly specs: SpecAccess = studio.specs()) {
    super();
  }

  async run({ workspaceId, files }: { workspaceId: string; files: string[] }): Promise<ContextSpec[]> {
    const unique = [...new Set(files)];
    return Promise.all(unique.map(async (file) => ({ file, content: await this.specs.readSpec(workspaceId, file) })));
  }
}
