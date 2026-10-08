import { updateConnectorRoute } from "@/containers/Studio/Connector/UI/API/Routes/updateConnector.route";
import { deleteConnectorRoute } from "@/containers/Studio/Connector/UI/API/Routes/deleteConnector.route";

export const PATCH = updateConnectorRoute.handler;
export const DELETE = deleteConnectorRoute.handler;
