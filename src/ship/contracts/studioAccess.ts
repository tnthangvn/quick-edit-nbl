/**
 * Cổng để Section Agent đọc dữ liệu của Section Studio mà không import trực tiếp (Porto: khác Section).
 * Implement trong Studio (Spec/Providers, Setting/Providers), nối ở composition root src/containers/providers.ts.
 */
import type { AgentSettings } from "./agentSettings";

export type WorkspaceRef = { id: string; name: string; path: string; specsDir: string };
export type SpecFileInfo = { file: string; size: number; updatedAt: string };

export interface SpecAccess {
  /** Ném lỗi WORKSPACE.NOT_FOUND nếu không có. */
  getWorkspace(workspaceId: string): Promise<WorkspaceRef>;
  listSpecs(workspaceId: string): Promise<SpecFileInfo[]>;
  /** Ném lỗi SPEC.NOT_FOUND / SPEC.PATH_OUTSIDE_WORKSPACE. */
  readSpec(workspaceId: string, file: string): Promise<string>;
}

export interface AgentSettingsAccess {
  /** Cấu hình hiệu lực cho workspace (settings chung, workspace có thể ghi đè). */
  get(workspaceId?: string): Promise<AgentSettings>;
}
