import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { GetSettingsController } from "../Controllers/GetSettingsController";
import { getSettingsContract } from "../Requests/GetSettingsRequest";

export const getSettingsRoute = defineRoute({
  ...getSettingsContract,
  operationId: "getSettings",
  method: "get",
  path: "/api/settings",
  tags: ["Setting"],
  summary: "Cấu hình Agent chung (Tab 1, 2)",
  controller: GetSettingsController,
});
