import { setWorkspaceSecretRoute } from "@/containers/Studio/Setting/UI/API/Routes/setWorkspaceSecret.route";
import { deleteWorkspaceSecretRoute } from "@/containers/Studio/Setting/UI/API/Routes/deleteWorkspaceSecret.route";

export const PUT = setWorkspaceSecretRoute.handler;
export const DELETE = deleteWorkspaceSecretRoute.handler;
