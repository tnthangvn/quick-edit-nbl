import "server-only";
import { createDriveGateway, type DriveGatewayFactory } from "@/ship/adapters/google";
import { Task } from "@/ship/parents/Task";
import { googleFailure } from "../Exceptions/mapFailures";
import { googleSecretRefs } from "../Models/googleSecret";

export type UploadDriveFileInput = {
  /** Workspace có secret GOOGLE_OAUTH riêng (bỏ trống = token dùng chung). */
  workspaceId?: string;
  folderId: string;
  /** Tên trên Drive = tên file spec (vd sidebar.md), để NotebookLM source cùng tên. */
  name: string;
  content: string;
  /** true → Google Doc (dùng cho NotebookLM Drive Sync), false → file .md nguyên văn (storage Drive). */
  asGoogleDoc: boolean;
};
export type UploadDriveFileOutput = { fileId: string; url: string | null; folderName: string; created: boolean };

/** Ghi đè (hoặc tạo) một file trong thư mục Drive. */
export class UploadDriveFileTask extends Task<UploadDriveFileInput, UploadDriveFileOutput> {
  constructor(private readonly drive: DriveGatewayFactory = createDriveGateway) {
    super();
  }

  async run(input: UploadDriveFileInput): Promise<UploadDriveFileOutput> {
    try {
      const gateway = await this.drive(googleSecretRefs(input.workspaceId));
      const folder = await gateway.getFolder(input.folderId);
      const file = await gateway.upsertText({ folderId: input.folderId, name: input.name, content: input.content, asGoogleDoc: input.asGoogleDoc });
      return { fileId: file.id, url: file.webViewLink, folderName: folder.name, created: file.created };
    } catch (err) {
      throw googleFailure(err);
    }
  }
}
