import { deleteAgentSessionRoute } from "@/containers/Agent/Session/UI/API/Routes/deleteAgentSession.route";
import { getAgentSessionRoute } from "@/containers/Agent/Session/UI/API/Routes/getAgentSession.route";

export const GET = getAgentSessionRoute.handler;
export const DELETE = deleteAgentSessionRoute.handler;
