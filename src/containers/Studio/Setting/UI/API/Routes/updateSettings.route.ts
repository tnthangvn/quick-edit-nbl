import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { UpdateSettingsController } from "../Controllers/UpdateSettingsController";
import { updateSettingsContract } from "../Requests/UpdateSettingsRequest";

export const updateSettingsRoute = defineRoute({
  ...updateSettingsContract,
  operationId: "updateSettings",
  method: "put",
  path: "/api/settings",
  tags: ["Setting"],
  summary: "Lưu cấu hình Agent chung; API key chỉ ghi",
  controller: UpdateSettingsController,
});
