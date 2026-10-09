import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { RevealWorkspaceSecretController } from "../Controllers/RevealWorkspaceSecretController";
import { revealWorkspaceSecretContract } from "../Requests/RevealWorkspaceSecretRequest";

export const revealWorkspaceSecretRoute = defineRoute({
  ...revealWorkspaceSecretContract,
  operationId: "revealWorkspaceSecret",
  method: "post",
  path: "/api/workspaces/{workspaceId}/secrets/{kind}/reveal",
  tags: ["Setting"],
  summary: "Xem secret của Workspace do người dùng nhập (plaintext, không cache)",
  controller: RevealWorkspaceSecretController,
});
