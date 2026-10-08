import { getWorkspaceConfigRoute } from "@/containers/Studio/Setting/UI/API/Routes/getWorkspaceConfig.route";
import { updateWorkspaceConfigRoute } from "@/containers/Studio/Setting/UI/API/Routes/updateWorkspaceConfig.route";

export const GET = getWorkspaceConfigRoute.handler;
export const PUT = updateWorkspaceConfigRoute.handler;
