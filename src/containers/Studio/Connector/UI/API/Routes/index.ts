import type { RouteDefinition } from "@/ship/engine/defineRoute";
import { checkConnectorRoute } from "./checkConnector.route";
import { createConnectorRoute } from "./createConnector.route";
import { deleteConnectorRoute } from "./deleteConnector.route";
import { detectConnectorsRoute } from "./detectConnectors.route";
import { listConnectorBranchesRoute } from "./listConnectorBranches.route";
import { listConnectorReposRoute } from "./listConnectorRepos.route";
import { listConnectorToolsRoute } from "./listConnectorTools.route";
import { listConnectorsRoute } from "./listConnectors.route";
import { updateConnectorRoute } from "./updateConnector.route";

/** Mọi route của container Connector. Thêm route mới vào mảng này để vào docs/api.json. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const routes: RouteDefinition<any, any>[] = [
  listConnectorsRoute,
  createConnectorRoute,
  updateConnectorRoute,
  deleteConnectorRoute,
  checkConnectorRoute,
  detectConnectorsRoute,
  listConnectorReposRoute,
  listConnectorBranchesRoute,
  listConnectorToolsRoute,
];
