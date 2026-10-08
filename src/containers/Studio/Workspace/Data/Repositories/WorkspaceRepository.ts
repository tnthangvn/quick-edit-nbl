import "server-only";
import type { Filter, NewRow, RowPatch } from "@/ship/contracts/data";
import type { StorageType } from "@/ship/contracts/enums/StorageType";
import { RepositoryBase } from "@/ship/parents/RepositoryBase";
import type { WorkspaceRow } from "../../Models/Workspace";

export type WorkspaceSort = "RECENT" | "NAME";

export class WorkspaceRepository extends RepositoryBase<"workspaces"> {
  protected readonly model = "workspaces" as const;

  search(opts: { q?: string; storageType?: StorageType; sort: WorkspaceSort }): Promise<WorkspaceRow[]> {
    const filter: Filter<WorkspaceRow> = {};
    if (opts.storageType) filter.storage_type = opts.storageType;
    if (opts.q) filter.name = { like: `%${opts.q}%` };
    return this.findMany(filter, {
      orderBy: opts.sort === "NAME" ? [["name", "asc"]] : [["last_opened_at", "desc"], ["created_at", "desc"]],
    });
  }

  findByIdOrNull(id: string): Promise<WorkspaceRow | undefined> {
    return this.findById(id);
  }

  /** Tên trùng không phân biệt hoa thường (like không có ký tự đại diện an toàn → so khớp lại chính xác). */
  async findByName(name: string): Promise<WorkspaceRow | undefined> {
    const target = name.trim().toLowerCase();
    return (await this.findMany({ name: { like: name.trim() } })).find((w) => w.name.trim().toLowerCase() === target);
  }

  findByPath(path: string): Promise<WorkspaceRow | undefined> {
    return this.findOne({ path });
  }

  create(row: NewRow<"workspaces">): Promise<WorkspaceRow> {
    return this.insert(row);
  }

  async patch(id: string, patch: RowPatch<"workspaces">): Promise<WorkspaceRow | undefined> {
    await this.updateById(id, patch);
    return this.findById(id);
  }

  async remove(id: string): Promise<boolean> {
    return (await this.deleteById(id)) > 0;
  }
}
