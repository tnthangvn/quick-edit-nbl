import { z } from "zod";
import { PublishStepStatus, PublishTarget, SpecSyncStatus } from "./enums/sync";
import { ErrorCode, ErrorParams } from "./errors";

/**
 * Sự kiện đi qua eventBus (src/ship/engine/eventBus.ts) và ra FE qua SSE
 * GET /api/workspaces/{workspaceId}/events (container Spec phát). Tên event trên bus = trường `type`.
 */

/** Agent (Chat / CliRunner) đề xuất sửa spec → FE mở DiffView. Không ghi file. */
export const SpecProposedEvent = z
  .object({
    type: z.literal("SPEC_PROPOSED"),
    workspaceId: z.string(),
    file: z.string(),
    original: z.string(),
    proposed: z.string(),
    /** id lần chạy Agent đề xuất (chat message id / cli runId) */
    sourceId: z.string(),
  })
  .meta({ id: "SpecProposedEvent" });
export type SpecProposedEvent = z.infer<typeof SpecProposedEvent>;

/** File spec đổi trên đĩa (watcher / sau khi ghi) hoặc đổi trạng thái sync. */
export const SpecChangedEvent = z
  .object({
    type: z.literal("SPEC_CHANGED"),
    workspaceId: z.string(),
    file: z.string(),
    change: z.enum(["CREATED", "UPDATED", "DELETED"]).meta({ id: "SpecChangeKind" }),
    syncStatus: SpecSyncStatus,
  })
  .meta({ id: "SpecChangedEvent" });
export type SpecChangedEvent = z.infer<typeof SpecChangedEvent>;

/** Tiến trình pipeline sau Approve, mỗi đích một dòng (Sync Activity, spec 3.3.1). */
export const PublishStep = z
  .object({
    target: PublishTarget,
    status: PublishStepStatus,
    /** Chi tiết bước hiện tại, hiển thị font mono: "git push origin main…", "PR #12"... */
    detail: z.string().nullable(),
    /** Link mở trình duyệt (PR, Drive file, notebook) nếu có. */
    url: z.string().nullable(),
    error: z.object({ code: ErrorCode, params: ErrorParams.optional() }).nullable(),
  })
  .meta({ id: "PublishStep" });
export type PublishStep = z.infer<typeof PublishStep>;

export const PublishProgressEvent = z
  .object({
    type: z.literal("PUBLISH_PROGRESS"),
    workspaceId: z.string(),
    runId: z.string(),
    file: z.string(),
    steps: z.array(PublishStep),
    finished: z.boolean(),
  })
  .meta({ id: "PublishProgressEvent" });
export type PublishProgressEvent = z.infer<typeof PublishProgressEvent>;

export const WorkspaceEvent = z
  .discriminatedUnion("type", [SpecProposedEvent, SpecChangedEvent, PublishProgressEvent])
  .meta({ id: "WorkspaceEvent" });
export type WorkspaceEvent = z.infer<typeof WorkspaceEvent>;

/** Spec vừa được Approve & Save (Spec phát, Publish nghe để chạy pipeline). Chỉ trên bus, không ra SSE. */
export type SpecApprovedPayload = { workspaceId: string; file: string; content: string };
export const SPEC_APPROVED = "Spec.Approved";
