import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { RevealApiKeyController } from "../Controllers/RevealApiKeyController";
import { revealApiKeyContract } from "../Requests/RevealApiKeyRequest";

export const revealApiKeyRoute = defineRoute({
  ...revealApiKeyContract,
  operationId: "revealApiKey",
  method: "post",
  path: "/api/settings/api-key/reveal",
  tags: ["Setting"],
  summary: "Xem API key của provider đang chọn (plaintext, không cache)",
  controller: RevealApiKeyController,
});
