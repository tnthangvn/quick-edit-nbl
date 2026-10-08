import "server-only";
import type { SpecAccess, SpecFileInfo, WorkspaceRef } from "@/ship/contracts/studioAccess";
import { GetSpecAction } from "../Actions/GetSpecAction";
import { GetSpecsWorkspaceAction } from "../Actions/GetSpecsWorkspaceAction";
import { ListSpecsAction } from "../Actions/ListSpecsAction";

/**
 * Cổng đọc spec cho Section Agent (nối ở src/containers/providers.ts). Chỉ đọc; Agent đề xuất sửa bằng
 * SpecProposedEvent, không ghi file. Đường dẫn đi qua cùng path guard với API (SPEC.PATH_OUTSIDE_WORKSPACE...).
 */
export class SpecAccessProvider implements SpecAccess {
  async getWorkspace(workspaceId: string): Promise<WorkspaceRef> {
    return new GetSpecsWorkspaceAction().run({ workspaceId });
  }

  async listSpecs(workspaceId: string): Promise<SpecFileInfo[]> {
    const files = await new ListSpecsAction().run({ workspaceId });
    return files.map(({ file, size, updatedAt }) => ({ file, size, updatedAt }));
  }

  async readSpec(workspaceId: string, file: string): Promise<string> {
    return (await new GetSpecAction().run({ workspaceId, file })).content;
  }
}
