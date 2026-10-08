import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PublishStep, SpecChangedEvent } from "@/ship/contracts/events";
import { eventBus } from "@/ship/engine/eventBus";
import type { WorkspaceConfig } from "../../Setting/Models/WorkspaceConfig";
import type { WorkspaceRow } from "../../Workspace/Models/Workspace";
import { StorageNotSupportedException } from "../../Storage/Exceptions/StorageNotSupportedException";
import { ExecutePublishRunAction } from "../Actions/ExecutePublishRunAction";
import { publishRunStore } from "../Data/PublishRunStore";
import { PlanPublishTargetsTask } from "../Tasks/PlanPublishTargetsTask";

const config = (over: { storage?: Partial<WorkspaceConfig["storage"]>; nbl?: Partial<WorkspaceConfig["nbl"]> } = {}): WorkspaceConfig => ({
  version: 1,
  workspace: { id: "w", name: "W", specsDir: "./specs" },
  storage: {
    git: null,
    drive: { folderId: "folder1", pullOnOpen: false, pushOnApprove: true },
    ...over.storage,
  },
  nbl: { notebookId: "nb123456789", syncStrategy: "DRIVE_SYNC", driveFolderId: "folder1", autoSyncOnApprove: true, confirmBeforeSync: false, ...over.nbl },
});

const brief = (steps: PublishStep[]) => steps.map((s) => `${s.target}:${s.status}`);

describe("PlanPublishTargetsTask", () => {
  const plan = new PlanPublishTargetsTask();

  it("chỉ đích đã cấu hình, đúng thứ tự; Approve tôn trọng tuỳ chọn tự động", async () => {
    expect(brief(await plan.run({ config: undefined, trigger: "APPROVE" }))).toEqual(["LOCAL:PENDING"]);
    expect(brief(await plan.run({ config: config(), trigger: "APPROVE" }))).toEqual(["LOCAL:PENDING", "DRIVE:PENDING", "NOTEBOOK:PENDING"]);
    const manual = config({ nbl: { confirmBeforeSync: true }, storage: { drive: { folderId: "f", pullOnOpen: false, pushOnApprove: false } } });
    const steps = await plan.run({ config: manual, trigger: "APPROVE" });
    expect(brief(steps)).toEqual(["LOCAL:PENDING", "DRIVE:SKIPPED", "NOTEBOOK:SKIPPED"]);
    expect(steps[2].detail).toBe("Chờ xác nhận sync NotebookLM");
    expect(brief(await plan.run({ config: manual, trigger: "FORCE" }))).toEqual(["LOCAL:PENDING", "DRIVE:PENDING", "NOTEBOOK:PENDING"]);
  });

  it("Thử lại một đích: LOCAL + đích đó; đích chưa cấu hình → PUBLISH.TARGET_NOT_CONFIGURED", async () => {
    expect(brief(await plan.run({ config: config(), trigger: "FORCE", only: "NOTEBOOK" }))).toEqual(["LOCAL:PENDING", "NOTEBOOK:PENDING"]);
    await expect(plan.run({ config: config(), trigger: "FORCE", only: "GIT" })).rejects.toMatchObject({ code: "PUBLISH.TARGET_NOT_CONFIGURED" });
  });
});

describe("ExecutePublishRunAction", () => {
  let ws: string;
  let row: WorkspaceRow;
  const events: SpecChangedEvent[] = [];
  let off: () => void;

  beforeEach(() => {
    ws = mkdtempSync(path.join(os.tmpdir(), "publish-"));
    mkdirSync(path.join(ws, "specs"));
    writeFileSync(path.join(ws, "specs/a.md"), "# A");
    row = {
      id: `ws-${Math.random()}`,
      name: "W",
      description: null,
      path: ws,
      specs_dir: "./specs",
      storage_type: "DRIVE",
      storage_label: null,
      notebook_id: null,
      status: "ACTIVE",
      last_opened_at: null,
      created_at: "",
      updated_at: "",
    };
    events.length = 0;
    off = eventBus.on<SpecChangedEvent>("SPEC_CHANGED", (e) => events.push(e));
  });
  afterEach(() => {
    off();
    rmSync(ws, { recursive: true, force: true });
  });

  function setup(cfg: WorkspaceConfig, opts: { driveFails?: boolean; file?: string } = {}) {
    const uploads: { name: string; asGoogleDoc: boolean; folderId: string }[] = [];
    const refreshed: unknown[] = [];
    const runId = `run-${Math.random()}`;
    const steps = cfg.nbl.notebookId ? ["LOCAL", "DRIVE", "NOTEBOOK"] : ["LOCAL", "DRIVE"];
    publishRunStore.add({
      runId,
      workspaceId: row.id,
      file: opts.file ?? "a.md",
      trigger: "APPROVE",
      action: "update",
      steps: steps.map((t) => ({ target: t as PublishStep["target"], status: "PENDING", detail: null, url: null, error: null })),
      finished: false,
      createdAt: new Date().toISOString(),
      finishedAt: null,
    });
    const action = new ExecutePublishRunAction(
      undefined,
      undefined,
      undefined,
      { run: async () => row } as never,
      { run: async () => cfg } as never,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        run: async (i: { name: string; asGoogleDoc: boolean; folderId: string }) => {
          if (opts.driveFails && !i.asGoogleDoc) throw new StorageNotSupportedException();
          if (opts.driveFails && i.folderId === "folder1") throw new StorageNotSupportedException();
          uploads.push({ name: i.name, asGoogleDoc: i.asGoogleDoc, folderId: i.folderId });
          return { fileId: `doc-${i.folderId}`, url: "https://drive/doc", folderName: "Specs", created: false };
        },
      } as never,
      undefined,
      { run: async (i: unknown) => (refreshed.push(i), { sourceId: "s", added: false }) } as never,
    );
    return { action, runId, uploads, refreshed };
  }

  it("gộp Drive storage + Drive Sync cùng thư mục: ghi Google Doc một lần, NotebookLM dùng lại doc", async () => {
    const { action, runId, uploads, refreshed } = setup(config());
    await action.run({ runId });
    const run = publishRunStore.get(runId)!;
    expect(brief(run.steps)).toEqual(["LOCAL:DONE", "DRIVE:DONE", "NOTEBOOK:DONE"]);
    expect(run.steps.map((s) => s.detail)).toEqual(["specs/a.md · 3 B", "Specs/a.md · đã ghi đè", "nb123456 · source a.md"]);
    expect(uploads).toEqual([{ name: "a.md", asGoogleDoc: true, folderId: "folder1" }]);
    expect(refreshed).toEqual([{ notebookId: "nb123456789", documentId: "doc-folder1", title: "a.md" }]);
    expect(run.finished).toBe(true);
    expect(events.at(-1)).toMatchObject({ file: "a.md", syncStatus: "SYNCED" });
  });

  it("đích lỗi không chặn đích sau; spec chuyển ERROR", async () => {
    const { action, runId } = setup(config({ nbl: { driveFolderId: "other" } }), { driveFails: true });
    await action.run({ runId });
    const run = publishRunStore.get(runId)!;
    expect(brief(run.steps)).toEqual(["LOCAL:DONE", "DRIVE:ERROR", "NOTEBOOK:DONE"]);
    expect(run.steps[1].error).toEqual({ code: "STORAGE.NOT_SUPPORTED" });
    expect(events.at(-1)).toMatchObject({ syncStatus: "ERROR" });
  });

  it("LOCAL lỗi (file không còn) → các đích sau SKIPPED với PUBLISH.PREREQUISITE_FAILED", async () => {
    const { action, runId, uploads } = setup(config(), { file: "missing.md" });
    await action.run({ runId });
    const run = publishRunStore.get(runId)!;
    expect(brief(run.steps)).toEqual(["LOCAL:ERROR", "DRIVE:SKIPPED", "NOTEBOOK:SKIPPED"]);
    expect(run.steps[0].error).toMatchObject({ code: "SPEC.NOT_FOUND" });
    expect(run.steps[2].error).toEqual({ code: "PUBLISH.PREREQUISITE_FAILED" });
    expect(uploads).toEqual([]);
  });
});
