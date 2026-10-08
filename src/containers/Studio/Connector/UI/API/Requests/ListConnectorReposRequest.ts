import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { GitRepositoryListResponse } from "../Transformers/ConnectorResultTransformers";
import { ConnectorIdParams } from "./connectorFields";

export const listConnectorReposContract = defineContract({
  request: {
    params: ConnectorIdParams,
    query: z.object({ q: z.string().trim().max(200).optional().meta({ description: "Lọc theo tên hoặc owner/repo" }) }),
  },
  responses: { 200: GitRepositoryListResponse, 400: ErrorResponse, 401: ErrorResponse, 404: ErrorResponse, 502: ErrorResponse },
});
