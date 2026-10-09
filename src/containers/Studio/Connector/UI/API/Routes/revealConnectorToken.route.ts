import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { RevealConnectorTokenController } from "../Controllers/RevealConnectorTokenController";
import { revealConnectorTokenContract } from "../Requests/RevealConnectorTokenRequest";

export const revealConnectorTokenRoute = defineRoute({
  ...revealConnectorTokenContract,
  operationId: "revealConnectorToken",
  method: "post",
  path: "/api/connectors/{connectorId}/token/reveal",
  tags: ["Connector"],
  summary: "Xem token PAT của connector (plaintext, không cache)",
  controller: RevealConnectorTokenController,
});
