import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import {
  GoogleOAuthStartResponse,
  GoogleOAuthStatusResponse,
  PullResultListResponse,
  PushResultListResponse,
  StorageStatusListResponse,
} from "../Transformers/StorageTransformer";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });

export const pullWorkspaceContract = defineContract({
  request: { params: WorkspaceParams },
  responses: { 200: PullResultListResponse, 401: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse, 502: ErrorResponse, 503: ErrorResponse },
});

export const pushWorkspaceContract = defineContract({
  request: { params: WorkspaceParams },
  responses: { 200: PushResultListResponse, 401: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse, 502: ErrorResponse, 503: ErrorResponse },
});

export const getStorageStatusContract = defineContract({
  request: { params: WorkspaceParams },
  responses: { 200: StorageStatusListResponse, 404: ErrorResponse, 502: ErrorResponse },
});

/** Có workspaceId → token lưu cho riêng Workspace (secret GOOGLE_OAUTH); bỏ trống → token dùng chung cả app. */
const GoogleOAuthQuery = z.object({ workspaceId: z.string().min(1).optional() });

export const startGoogleOAuthContract = defineContract({
  request: { query: GoogleOAuthQuery },
  responses: { 200: GoogleOAuthStartResponse, 404: ErrorResponse, 503: ErrorResponse },
});

export const completeGoogleOAuthContract = defineContract({
  request: {
    query: z.object({
      code: z.string().min(1).optional(),
      state: z.string().min(1),
      /** Google trả `error` (vd access_denied) khi người dùng từ chối. */
      error: z.string().optional(),
    }),
  },
  responses: { 200: GoogleOAuthStatusResponse, 400: ErrorResponse, 502: ErrorResponse, 503: ErrorResponse },
});

export const getGoogleOAuthStatusContract = defineContract({
  request: { query: GoogleOAuthQuery },
  responses: { 200: GoogleOAuthStatusResponse },
});
