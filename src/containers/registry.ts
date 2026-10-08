import "server-only";
import type { RouteDefinition } from "@/ship/engine/defineRoute";
import { routes as chat } from "./Agent/Chat/UI/API/Routes";
import { routes as cliRunner } from "./Agent/CliRunner/UI/API/Routes";
import { routes as agentSession } from "./Agent/Session/UI/API/Routes";
import { routes as connector } from "./Studio/Connector/UI/API/Routes";
import { routes as filesystem } from "./Studio/FileSystem/UI/API/Routes";
import { routes as notebook } from "./Studio/Notebook/UI/API/Routes";
import { routes as publish } from "./Studio/Publish/UI/API/Routes";
import { routes as setting } from "./Studio/Setting/UI/API/Routes";
import { routes as spec } from "./Studio/Spec/UI/API/Routes";
import { routes as storage } from "./Studio/Storage/UI/API/Routes";
import { routes as workspace } from "./Studio/Workspace/UI/API/Routes";

/** Composition root: toàn bộ route của app, dùng để sinh docs/api.json và kiểm tra khớp thư mục app/api. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const allRoutes: RouteDefinition<any, any>[] = [
  ...workspace,
  ...spec,
  ...setting,
  ...connector,
  ...filesystem,
  ...storage,
  ...notebook,
  ...publish,
  ...chat,
  ...cliRunner,
  ...agentSession,
];
