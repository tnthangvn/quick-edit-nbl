import "server-only";
import { z } from "zod";
import { ErrorCode, ErrorParams } from "@/ship/contracts/errors";
import { WorkspaceConfig } from "../../../../Setting/Models/WorkspaceConfig";
import { WorkspaceCheckStatus, WorkspaceCheckTarget } from "../../../Enums/WorkspaceCheck";
import { WorkspaceResponse } from "./WorkspaceTransformer";

export const OpenedWorkspaceResponse = z
  .object({ workspace: WorkspaceResponse, config: WorkspaceConfig.nullable() })
  .meta({ id: "OpenedWorkspace" });

export const WorkspaceCheckItemResponse = z
  .object({
    target: WorkspaceCheckTarget,
    status: WorkspaceCheckStatus,
    error: z.object({ code: ErrorCode, params: ErrorParams.optional() }).nullable(),
    info: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).nullable(),
  })
  .meta({ id: "WorkspaceCheckItem" });

export const WorkspaceCheckResponse = z.object({ items: z.array(WorkspaceCheckItemResponse) }).meta({ id: "WorkspaceCheckResult" });
