import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { WorkspaceConfig } from "../../../Models/WorkspaceConfig";

export const WorkspaceIdParams = z.object({ workspaceId: z.string().min(1).max(64) });

export const getWorkspaceConfigContract = defineContract({
  request: { params: WorkspaceIdParams },
  responses: { 200: WorkspaceConfig, 404: ErrorResponse, 409: ErrorResponse },
});
