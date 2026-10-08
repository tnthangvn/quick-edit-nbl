import type { RouteDefinition } from "@/ship/engine/defineRoute";
import { deleteWorkspaceSecretRoute } from "./deleteWorkspaceSecret.route";
import { getSettingsRoute } from "./getSettings.route";
import { getWorkspaceConfigRoute } from "./getWorkspaceConfig.route";
import { listWorkspaceSecretsRoute } from "./listWorkspaceSecrets.route";
import { setWorkspaceSecretRoute } from "./setWorkspaceSecret.route";
import { updateSettingsRoute } from "./updateSettings.route";
import { updateWorkspaceConfigRoute } from "./updateWorkspaceConfig.route";

/** Mọi route của container Setting. Thêm route mới vào mảng này để vào docs/api.json. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const routes: RouteDefinition<any, any>[] = [
  getSettingsRoute,
  updateSettingsRoute,
  getWorkspaceConfigRoute,
  updateWorkspaceConfigRoute,
  listWorkspaceSecretsRoute,
  setWorkspaceSecretRoute,
  deleteWorkspaceSecretRoute,
];
