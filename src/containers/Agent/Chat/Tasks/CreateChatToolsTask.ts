import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { studio } from "@/containers/providers";
import { SpecProposedEvent } from "@/ship/contracts/events";
import type { SpecAccess } from "@/ship/contracts/studioAccess";
import { eventBus } from "@/ship/engine/eventBus";
import { AppException } from "@/ship/parents/AppException";
import { Task } from "@/ship/parents/Task";

type Bus = { emit<T>(name: string, payload: T): void };

/** Đường dẫn tương đối tới file .md, không thoát ra ngoài thư mục spec. */
const SpecFilename = z
  .string()
  .min(1)
  .max(500)
  .refine((f) => !f.startsWith("/") && !f.includes("\\") && !f.split("/").includes("..") && /\.md$/i.test(f), {
    message: "filename must be a relative .md path inside the specs folder",
  })
  .describe("Path of the spec file relative to the specs folder, e.g. `auth/login.md`");

/** Lỗi nghiệp vụ (SPEC.NOT_FOUND...) trả về cho model dạng mã để nó tự xử lý; lỗi khác để AI SDK báo tool-error. */
async function guard<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppException) return { error: err.code };
    throw err;
  }
}

/**
 * Tools 5.2 cấp cho Agent ở chế độ Direct API: list_specs, read_spec, propose_spec_update.
 * Các tool cần người dùng xác nhận (apply_spec_update, delete_spec, trigger_nbl_sync, publish_specs) KHÔNG cấp cho model:
 * chúng là hành động của người dùng trên UI (Approve & Save, Delete, Sync, Publish), model chỉ được hướng dẫn người dùng.
 */
function buildChatTools(workspaceId: string, specs: SpecAccess, bus: Bus) {
  return {
    list_specs: tool({
      description: "List the Markdown spec files of the workspace.",
      inputSchema: z.object({}),
      execute: () => guard(async () => ({ files: await specs.listSpecs(workspaceId) })),
    }),
    read_spec: tool({
      description: "Read the full content of one spec file.",
      inputSchema: z.object({ filename: SpecFilename }),
      execute: ({ filename }) => guard(async () => ({ filename, content: await specs.readSpec(workspaceId, filename) })),
    }),
    propose_spec_update: tool({
      description:
        "Propose new content for a spec file (or a new file). The user reviews a diff and decides; nothing is written to disk by this tool.",
      inputSchema: z.object({
        filename: SpecFilename,
        newContent: z.string().max(2_000_000).describe("The COMPLETE new Markdown content of the file"),
      }),
      execute: ({ filename, newContent }, { toolCallId }) =>
        guard(async () => {
          const exists = (await specs.listSpecs(workspaceId)).some((s) => s.file === filename);
          const original = exists ? await specs.readSpec(workspaceId, filename) : "";
          if (original === newContent) return { proposed: false, filename, reason: "NO_CHANGES" };
          const event = SpecProposedEvent.parse({
            type: "SPEC_PROPOSED",
            workspaceId,
            file: filename,
            original,
            proposed: newContent,
            sourceId: toolCallId,
          });
          bus.emit(event.type, event);
          return {
            proposed: true,
            filename,
            isNewFile: !exists,
            note: "Proposal sent to the user's diff review. The file has NOT been written; the user will Approve or Reject it.",
          };
        }),
    }),
  };
}

export type ChatTools = ReturnType<typeof buildChatTools>;

export class CreateChatToolsTask extends Task<{ workspaceId: string }, ChatTools> {
  constructor(
    private readonly specs: SpecAccess = studio.specs(),
    private readonly bus: Bus = eventBus,
  ) {
    super();
  }

  async run({ workspaceId }: { workspaceId: string }): Promise<ChatTools> {
    return buildChatTools(workspaceId, this.specs, this.bus);
  }
}
