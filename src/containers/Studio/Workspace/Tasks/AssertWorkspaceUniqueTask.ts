import "server-only";
import { Task } from "@/ship/parents/Task";
import { WorkspaceRepository } from "../Data/Repositories/WorkspaceRepository";
import { WorkspaceAlreadyRegisteredException } from "../Exceptions/WorkspaceAlreadyRegisteredException";
import { WorkspaceNameTakenException } from "../Exceptions/WorkspaceNameTakenException";
import { WorkspacePathInUseException } from "../Exceptions/WorkspacePathInUseException";

export type AssertWorkspaceUniqueInput = {
  name?: string;
  path?: string;
  /** id lấy từ config.json khi import. */
  id?: string;
  /** Bỏ qua chính Workspace đang sửa. */
  excludeId?: string;
};

/** Tên duy nhất, thư mục không thuộc Workspace khác, id chưa có trong registry (spec 3.0.1 Validation). */
export class AssertWorkspaceUniqueTask extends Task<AssertWorkspaceUniqueInput, void> {
  constructor(private readonly repo = new WorkspaceRepository()) {
    super();
  }

  async run({ name, path, id, excludeId }: AssertWorkspaceUniqueInput): Promise<void> {
    const other = (w: { id: string } | undefined) => w && w.id !== excludeId;
    if (id) {
      const existing = await this.repo.findByIdOrNull(id);
      if (other(existing)) throw new WorkspaceAlreadyRegisteredException({ path: existing!.path });
    }
    if (path && other(await this.repo.findByPath(path))) throw new WorkspacePathInUseException({ path });
    if (name && other(await this.repo.findByName(name))) throw new WorkspaceNameTakenException({ name });
  }
}
