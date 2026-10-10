import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { NotebookConnectionCheckResponse, NotebookConnectionResponse, NotebookConnectionSavedResponse } from "../Transformers/NotebookTransformer";

export const getNotebookConnectionContract = defineContract({
  responses: { 200: NotebookConnectionResponse },
});

export const saveNotebookConnectionContract = defineContract({
  request: {
    body: z
      .object({
        /** Header Cookie của notebooklm.google.com (cần SID, HSID, SSID, APISID, SAPISID). */
        cookie: z.string().trim().min(20).max(16_384),
      })
      .meta({ id: "NotebookConnectionInput" }),
  },
  responses: { 200: NotebookConnectionSavedResponse, 401: ErrorResponse, 502: ErrorResponse },
});

export const checkNotebookConnectionContract = defineContract({
  responses: { 200: NotebookConnectionCheckResponse, 401: ErrorResponse, 502: ErrorResponse },
});

export const deleteNotebookConnectionContract = defineContract({
  responses: { 204: null },
});
