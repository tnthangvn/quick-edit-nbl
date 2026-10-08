import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { WorkspaceEvent } from "@/ship/contracts/events";
import { defineContract } from "@/ship/engine/defineRoute";
import { ApproveSpecResponse, SpecDetailResponse, SpecFileListResponse, SpecFileResponse } from "../Transformers/SpecTransformer";

/** Nội dung spec tối đa 5 MB. */
const SpecContent = z.string().max(5_000_000);
const SpecFileName = z.string().trim().min(1).max(1024).meta({ description: "Tên file .md tương đối trong thư mục spec (vd \"sidebar.md\", \"ui/header.md\")" });

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const SpecParams = WorkspaceParams.extend({
  file: SpecFileName.meta({ description: "Tên file spec, encodeURIComponent (\"/\" → %2F)" }),
});

export const listSpecsContract = defineContract({
  request: { params: WorkspaceParams },
  responses: { 200: SpecFileListResponse, 403: ErrorResponse, 404: ErrorResponse },
});

export const createSpecContract = defineContract({
  request: {
    params: WorkspaceParams,
    body: z.object({ file: SpecFileName, content: SpecContent.default("") }).meta({ id: "CreateSpecBody" }),
  },
  responses: { 201: SpecDetailResponse, 400: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse },
});

export const getSpecContract = defineContract({
  request: { params: SpecParams },
  responses: { 200: SpecDetailResponse, 400: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse },
});

export const approveSpecContract = defineContract({
  request: { params: SpecParams, body: z.object({ content: SpecContent }).meta({ id: "ApproveSpecBody" }) },
  responses: { 200: ApproveSpecResponse, 400: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse },
});

export const renameSpecContract = defineContract({
  request: { params: SpecParams, body: z.object({ newFile: SpecFileName }).meta({ id: "RenameSpecBody" }) },
  responses: { 200: SpecFileResponse, 400: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse },
});

export const deleteSpecContract = defineContract({
  request: { params: SpecParams },
  responses: { 204: null, 400: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse },
});

export const streamWorkspaceEventsContract = defineContract({
  request: { params: WorkspaceParams },
  responses: { 200: { eventStream: WorkspaceEvent }, 403: ErrorResponse, 404: ErrorResponse },
});
