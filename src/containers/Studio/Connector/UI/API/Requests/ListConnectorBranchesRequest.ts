import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { RepoFullName } from "../../../../Setting/Models/ConfigFields";
import { GitBranchListResponse } from "../Transformers/ConnectorResultTransformers";
import { ConnectorIdParams } from "./connectorFields";

export const listConnectorBranchesContract = defineContract({
  request: { params: ConnectorIdParams, query: z.object({ repo: RepoFullName }) },
  responses: { 200: GitBranchListResponse, 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse, 502: ErrorResponse },
});
