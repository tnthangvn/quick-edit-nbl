import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { AgentSessionListResponse, AgentSessionResponse } from "../Transformers/AgentSessionTransformer";

const WorkspaceIdField = z.string().min(1).max(64);
const SessionParams = z.object({ sessionId: z.string().min(1).max(64) });

export const listAgentSessionsContract = defineContract({
  request: { query: z.object({ workspaceId: WorkspaceIdField }) },
  responses: { 200: AgentSessionListResponse },
});

export const createAgentSessionContract = defineContract({
  request: { body: z.object({ workspaceId: WorkspaceIdField }).meta({ id: "CreateAgentSessionBody" }) },
  responses: { 201: AgentSessionResponse, 404: ErrorResponse },
});

export const getAgentSessionContract = defineContract({
  request: { params: SessionParams },
  responses: { 200: AgentSessionResponse, 404: ErrorResponse },
});

export const deleteAgentSessionContract = defineContract({
  request: { params: SessionParams },
  responses: { 204: null, 404: ErrorResponse },
});
