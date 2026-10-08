import "server-only";
import { z } from "zod";
import { SpecSyncStatus } from "@/ship/contracts/enums/sync";
import { Transformer } from "@/ship/parents/Transformer";
import type { SpecFileWithStatus } from "../../../Models/SpecFile";

export const SpecFileResponse = z
  .object({
    /** Đường dẫn tương đối trong thư mục spec, phân cách "/". Trong URL {file} phải encodeURIComponent. */
    file: z.string(),
    size: z.number().int().nonnegative(),
    updatedAt: z.iso.datetime(),
    /** UNSAVED không bao giờ do BE trả (trạng thái editor phía FE). */
    syncStatus: SpecSyncStatus,
  })
  .meta({ id: "SpecFile" });
export type SpecFileResponse = z.infer<typeof SpecFileResponse>;

export const SpecFileListResponse = z.object({ items: z.array(SpecFileResponse) }).meta({ id: "SpecFileList" });

export const SpecDetailResponse = SpecFileResponse.extend({ content: z.string() }).meta({ id: "SpecDetail" });
export type SpecDetailResponse = z.infer<typeof SpecDetailResponse>;

export const ApproveSpecResponse = z
  .object({
    spec: SpecDetailResponse,
    /** Lần chạy pipeline publish vừa xếp hàng; theo dõi qua SSE PUBLISH_PROGRESS. */
    runId: z.string(),
  })
  .meta({ id: "ApproveSpecResult" });

export class SpecFileTransformer extends Transformer<SpecFileWithStatus, SpecFileResponse> {
  transform(f: SpecFileWithStatus): SpecFileResponse {
    return { file: f.file, size: f.size, updatedAt: f.updatedAt, syncStatus: f.syncStatus };
  }
}

export class SpecDetailTransformer extends Transformer<SpecFileWithStatus & { content: string }, SpecDetailResponse> {
  transform(f: SpecFileWithStatus & { content: string }): SpecDetailResponse {
    return { ...new SpecFileTransformer().transform(f), content: f.content };
  }
}
