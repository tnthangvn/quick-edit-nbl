import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { WorkspaceConfig } from "../../../Models/WorkspaceConfig";
import { WorkspaceIdParams } from "./GetWorkspaceConfigRequest";

export const updateWorkspaceConfigContract = defineContract({
  request: { params: WorkspaceIdParams, body: WorkspaceConfig },
  responses: { 200: WorkspaceConfig, 400: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse },
});
