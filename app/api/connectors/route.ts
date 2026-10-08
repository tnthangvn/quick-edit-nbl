import { listConnectorsRoute } from "@/containers/Studio/Connector/UI/API/Routes/listConnectors.route";
import { createConnectorRoute } from "@/containers/Studio/Connector/UI/API/Routes/createConnector.route";

export const GET = listConnectorsRoute.handler;
export const POST = createConnectorRoute.handler;
