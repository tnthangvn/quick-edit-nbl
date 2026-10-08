import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { ExportSettingsController } from "../Controllers/ExportSettingsController";
import { exportSettingsContract } from "../Requests/ExportSettingsRequest";

export const exportSettingsRoute = defineRoute({
  ...exportSettingsContract,
  operationId: "exportSettings",
  method: "get",
  path: "/api/settings/export",
  tags: ["Setting"],
  summary: "Xuất cấu hình cơ bản (Direct API, CLI Agent Runner, Connectors) — không kèm secret",
  controller: ExportSettingsController,
});
