import { GOOGLE_REFRESH_TOKEN_REF } from "@/ship/adapters/google";
import { workspaceSecretRef } from "../../Setting/Enums/WorkspaceSecretKind";

/**
 * Nơi tìm refresh token Google: secret GOOGLE_OAUTH của Workspace trước, rồi token dùng chung cả app
 * (đăng nhập khi chưa có Workspace, vd Wizard tạo mới).
 */
export const googleSecretRefs = (workspaceId?: string): string[] =>
  workspaceId ? [workspaceSecretRef(workspaceId, "GOOGLE_OAUTH"), GOOGLE_REFRESH_TOKEN_REF] : [GOOGLE_REFRESH_TOKEN_REF];

/** Ref lưu token khi đăng nhập: theo Workspace nếu có, ngược lại dùng chung. */
export const googleSecretTargetRef = (workspaceId?: string): string =>
  workspaceId ? workspaceSecretRef(workspaceId, "GOOGLE_OAUTH") : GOOGLE_REFRESH_TOKEN_REF;
