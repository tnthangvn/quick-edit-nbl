import "server-only";
import { z } from "zod";
import { WorkspaceSecretKind } from "../../../Enums/WorkspaceSecretKind";

export const WorkspaceSecretStateResponse = z
  .object({
    kind: WorkspaceSecretKind,
    isSet: z.boolean(),
    /** Bản che, vd "ghp_••••••••a1b2"; null khi chưa nhập. */
    masked: z.string().nullable(),
    /** Có xem lại được qua revealWorkspaceSecret không. */
    revealable: z.boolean(),
  })
  .meta({ id: "WorkspaceSecretState" });
export const WorkspaceSecretListResponse = z.object({ items: z.array(WorkspaceSecretStateResponse) }).meta({ id: "WorkspaceSecretList" });

export const SecretValueResponse = z.object({ value: z.string() }).meta({ id: "SecretValue" });
