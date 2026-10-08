import { listWorkspacesRoute } from "@/containers/Studio/Workspace/UI/API/Routes/listWorkspaces.route";
import { createWorkspaceRoute } from "@/containers/Studio/Workspace/UI/API/Routes/createWorkspace.route";

export const GET = listWorkspacesRoute.handler;
export const POST = createWorkspaceRoute.handler;
