import "server-only";
import { z } from "zod";
import { WorkspaceSecretKind } from "../../../Enums/WorkspaceSecretKind";

export const WorkspaceSecretStateResponse = z.object({ kind: WorkspaceSecretKind, isSet: z.boolean() }).meta({ id: "WorkspaceSecretState" });
export const WorkspaceSecretListResponse = z.object({ items: z.array(WorkspaceSecretStateResponse) }).meta({ id: "WorkspaceSecretList" });
