import "server-only";
import { defineRoute } from "@/ship/engine/defineRoute";
import { ImportSettingsController } from "../Controllers/ImportSettingsController";
import { importSettingsContract } from "../Requests/ImportSettingsRequest";

export const importSettingsRoute = defineRoute({
  ...importSettingsContract,
  operationId: "importSettings",
  method: "post",
  path: "/api/settings/import",
  tags: ["Setting"],
  summary: "Nhập cấu hình cơ bản: ghi đè Direct API/CLI Runner, thêm connector mới (bỏ qua trùng tên)",
  controller: ImportSettingsController,
});
