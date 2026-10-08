import { z } from "zod";

export const WorkspaceIdParams = z.object({ workspaceId: z.string().min(1).max(64) });
export const WorkspaceName = z.string().trim().min(1).max(100);
export const WorkspaceDescription = z.string().trim().max(500).nullable();
