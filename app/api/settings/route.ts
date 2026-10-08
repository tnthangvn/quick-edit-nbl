import { getSettingsRoute } from "@/containers/Studio/Setting/UI/API/Routes/getSettings.route";
import { updateSettingsRoute } from "@/containers/Studio/Setting/UI/API/Routes/updateSettings.route";

export const GET = getSettingsRoute.handler;
export const PUT = updateSettingsRoute.handler;
