import { getWorkspaceRoute } from "@/containers/Studio/Workspace/UI/API/Routes/getWorkspace.route";
import { updateWorkspaceRoute } from "@/containers/Studio/Workspace/UI/API/Routes/updateWorkspace.route";
import { removeWorkspaceRoute } from "@/containers/Studio/Workspace/UI/API/Routes/removeWorkspace.route";

export const GET = getWorkspaceRoute.handler;
export const PATCH = updateWorkspaceRoute.handler;
export const DELETE = removeWorkspaceRoute.handler;
