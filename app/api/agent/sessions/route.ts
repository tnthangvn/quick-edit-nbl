import { createAgentSessionRoute } from "@/containers/Agent/Session/UI/API/Routes/createAgentSession.route";
import { listAgentSessionsRoute } from "@/containers/Agent/Session/UI/API/Routes/listAgentSessions.route";

export const GET = listAgentSessionsRoute.handler;
export const POST = createAgentSessionRoute.handler;
