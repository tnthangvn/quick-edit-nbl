import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonDataDriver, setDataDriverForTesting } from "@/ship/adapters/data";
import { AppException } from "@/ship/parents/AppException";
import type { ResolveGitCredentialsTask } from "../../Connector/Tasks/ResolveGitCredentialsTask";
import type { CheckNotebookTask } from "../../Notebook/Tasks/CheckNotebookTask";
import { WorkspaceConfig } from "../../Setting/Models/WorkspaceConfig";
import { CloneRepositoryTask } from "../../Storage/Tasks/CloneRepositoryTask";
import { CheckWorkspaceAction } from "../Actions/CheckWorkspaceAction";
import { CreateWorkspaceAction, type CreateWorkspaceInput } from "../Actions/CreateWorkspaceAction";
import { ImportWorkspaceAction } from "../Actions/ImportWorkspaceAction";
import { ListWorkspacesAction } from "../Actions/ListWorkspacesAction";
import { OpenWorkspaceAction } from "../Actions/OpenWorkspaceAction";
import { RemoveWorkspaceAction } from "../Actions/RemoveWorkspaceAction";
import { UpdateWorkspaceAction } from "../Actions/UpdateWorkspaceAction";
import { AddGitignoreEntryTask } from "../Tasks/AddGitignoreEntryTask";
import { AssertWorkspaceUniqueTask } from "../Tasks/AssertWorkspaceUniqueTask";
import { CreateSpecsDirTask } from "../Tasks/CreateSpecsDirTask";
import { CreateWorkspaceRecordTask } from "../Tasks/CreateWorkspaceRecordTask";
import { PrepareWorkspaceFolderTask } from "../Tasks/PrepareWorkspaceFolderTask";
import { WriteWorkspaceConfigTask } from "../../Setting/Tasks/WriteWorkspaceConfigTask";
import { DownloadDriveFolderTask } from "../../Storage/Tasks/DownloadDriveFolderTask";
import { GetWorkspaceTask } from "../Tasks/GetWorkspaceTask";
import { InspectFolderTask } from "../Tasks/InspectFolderTask";
import { ReadWorkspaceConfigTask } from "../../Setting/Tasks/ReadWorkspaceConfigTask";
import { CheckGitRemoteTask } from "../../Connector/Tasks/CheckGitRemoteTask";
import { CheckDriveAccessTask } from "../Tasks/CheckDriveAccessTask";

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (err) {
    return err instanceof AppException ? err.code : String(err);
  }
  return "NO_ERROR";
};

const localInput = (dir: string, name = "Demo"): CreateWorkspaceInput => ({
  name,
  description: null,
  path: dir,
  specsDir: "./specs",
  storage: { git: null, drive: null, shareConfig: false },
  notebook: null,
});

/** Clone giả: tạo repo rỗng có README. */
class FakeClone extends CloneRepositoryTask {
  calls: Parameters<CloneRepositoryTask["run"]>[0][] = [];
  async run(input: Parameters<CloneRepositoryTask["run"]>[0]) {
    this.calls.push(input);
    mkdirSync(input.targetPath, { recursive: true });
    writeFileSync(path.join(input.targetPath, "README.md"), "# repo\n");
    return { headSha: "abc" };
  }
}

const fakeCreds = { run: async ({ remote }: { remote: string }) => ({ env: { GIT_TERMINAL_PROMPT: "0" }, remoteUrl: remote }) } as unknown as ResolveGitCredentialsTask;

function createAction(clone = new FakeClone()) {
  return new CreateWorkspaceAction(
    new AssertWorkspaceUniqueTask(),
    new PrepareWorkspaceFolderTask(),
    fakeCreds,
    clone,
    new DownloadDriveFolderTask(),
    new AddGitignoreEntryTask(),
    new CreateSpecsDirTask(),
    new WriteWorkspaceConfigTask(),
    new CreateWorkspaceRecordTask(),
  );
}

describe("Workspace", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "spec-studio-ws-"));
    setDataDriverForTesting(new JsonDataDriver(path.join(tmp, "data")));
  });
  afterEach(() => {
    setDataDriverForTesting(undefined);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("tạo Workspace Local: tạo thư mục, specsDir, config.json, bản ghi registry", async () => {
    const dir = path.join(tmp, "local");
    const ws = await createAction().run(localInput(dir));
    expect(ws).toMatchObject({ name: "Demo", path: dir, storage_type: "LOCAL", status: "ACTIVE" });
    expect(existsSync(path.join(dir, "specs"))).toBe(true);
    const config = WorkspaceConfig.parse(JSON.parse(readFileSync(path.join(dir, ".spec-studio/config.json"), "utf8")));
    expect(config.workspace).toEqual({ id: ws.id, name: "Demo", specsDir: "./specs" });
    expect(config.nbl.notebookId).toBeNull();
  });

  it("chặn tên trùng (không phân biệt hoa thường), thư mục trùng, thư mục đã có config", async () => {
    const dir = path.join(tmp, "a");
    await createAction().run(localInput(dir));
    expect(await codeOf(createAction().run(localInput(path.join(tmp, "b"), "demo")))).toBe("WORKSPACE.NAME_TAKEN");
    expect(await codeOf(createAction().run(localInput(dir, "Other")))).toBe("WORKSPACE.PATH_IN_USE");
    await new RemoveWorkspaceAction().run({ workspaceId: (await new ListWorkspacesAction().run({ sort: "NAME" }))[0].id });
    expect(await codeOf(createAction().run(localInput(dir, "Other")))).toBe("WORKSPACE.CONFIG_EXISTS");
  });

  it("tạo Workspace Git: clone, thêm .spec-studio/ vào .gitignore, suy ra remote từ repo", async () => {
    const dir = path.join(tmp, "git");
    const clone = new FakeClone();
    const ws = await createAction(clone).run({
      ...localInput(dir),
      specsDir: "docs",
      storage: {
        shareConfig: false,
        drive: null,
        git: {
          provider: "GITHUB",
          connectorId: null,
          repo: "acme/specs",
          branch: "main",
          subdir: "docs",
          publishMode: "PULL_REQUEST",
          prBranchTemplate: "spec/{date}-{filename}",
          autoCommit: true,
          autoPush: false,
          commitMessage: "docs(spec): {action} {filename}",
          pullOnOpen: true,
        },
      },
    });
    expect(clone.calls[0]).toMatchObject({ remoteUrl: "https://github.com/acme/specs.git", branch: "main", targetPath: dir });
    expect(ws.storage_label).toBe("acme/specs@main");
    expect(readFileSync(path.join(dir, ".gitignore"), "utf8")).toContain(".spec-studio/");
  });

  it("clone vào thư mục không trống → FOLDER_NOT_EMPTY; lỗi clone thường → CLONE_FAILED", async () => {
    const dir = path.join(tmp, "busy");
    mkdirSync(dir);
    writeFileSync(path.join(dir, "x"), "");
    const git = {
      shareConfig: true,
      drive: null,
      git: { ...{ provider: "GENERIC" as const, connectorId: null, repo: null, remote: "git@example.com:a/b.git", branch: "main", subdir: "." }, publishMode: "PUSH" as const, prBranchTemplate: "x", autoCommit: false, autoPush: false, commitMessage: "m", pullOnOpen: false },
    };
    expect(await codeOf(createAction().run({ ...localInput(dir), storage: git }))).toBe("WORKSPACE.FOLDER_NOT_EMPTY");
    const failing = new (class extends FakeClone {
      async run(): Promise<never> {
        throw new Error("boom");
      }
    })();
    expect(await codeOf(createAction(failing).run({ ...localInput(path.join(tmp, "new")), storage: git }))).toBe("WORKSPACE.CLONE_FAILED");
  });

  it("import thư mục có config, gỡ không xoá file, danh sách đánh dấu FOLDER_MISSING", async () => {
    const dir = path.join(tmp, "imp");
    const ws = await createAction().run(localInput(dir));
    await new RemoveWorkspaceAction().run({ workspaceId: ws.id });
    expect(existsSync(path.join(dir, ".spec-studio/config.json"))).toBe(true);

    const imported = await new ImportWorkspaceAction().run({ path: dir, name: "Renamed" });
    expect(imported.id).toBe(ws.id);
    expect(JSON.parse(readFileSync(path.join(dir, ".spec-studio/config.json"), "utf8")).workspace.name).toBe("Renamed");
    expect(await codeOf(new ImportWorkspaceAction().run({ path: path.join(tmp, "nope") }))).toBe("WORKSPACE.FOLDER_NOT_FOUND");

    rmSync(dir, { recursive: true });
    const [listed] = await new ListWorkspacesAction().run({ sort: "RECENT" });
    expect(listed.status).toBe("FOLDER_MISSING");
    expect(await codeOf(new OpenWorkspaceAction().run({ workspaceId: ws.id }))).toBe("WORKSPACE.FOLDER_MISSING");
  });

  it("mở Workspace ghi last_opened_at; đổi tên ghi vào config.json", async () => {
    const dir = path.join(tmp, "open");
    const ws = await createAction().run(localInput(dir));
    const opened = await new OpenWorkspaceAction().run({ workspaceId: ws.id });
    expect(opened.workspace.last_opened_at).not.toBeNull();
    expect(opened.config?.workspace.id).toBe(ws.id);

    await new UpdateWorkspaceAction().run({ workspaceId: ws.id, name: "New name" });
    expect(JSON.parse(readFileSync(path.join(dir, ".spec-studio/config.json"), "utf8")).workspace.name).toBe("New name");
  });

  it("kiểm tra: thư mục OK, Git/Drive SKIPPED, Notebook qua CheckNotebookTask", async () => {
    const dir = path.join(tmp, "check");
    const ws = await createAction().run({ ...localInput(dir), notebook: { notebookId: "https://notebooklm.google.com/notebook/nb-123", syncStrategy: "RPC", driveFolderId: null, autoSyncOnApprove: false, confirmBeforeSync: true } });
    const notebook = { run: async () => ({ ok: true, sourceCount: 3, title: "NB" }) } as unknown as CheckNotebookTask;
    const items = await new CheckWorkspaceAction(
      new GetWorkspaceTask(),
      new InspectFolderTask(),
      new ReadWorkspaceConfigTask(),
      fakeCreds,
      new CheckGitRemoteTask(),
      new CheckDriveAccessTask(),
      notebook,
    ).run({ workspaceId: ws.id });
    expect(items.map((i) => [i.target, i.status])).toEqual([
      ["FOLDER", "OK"],
      ["GIT_REMOTE", "SKIPPED"],
      ["DRIVE", "SKIPPED"],
      ["NOTEBOOK", "OK"],
    ]);
    expect(items[3].info).toEqual({ notebookId: "nb-123", title: "NB", sourceCount: 3 });
  });
});
