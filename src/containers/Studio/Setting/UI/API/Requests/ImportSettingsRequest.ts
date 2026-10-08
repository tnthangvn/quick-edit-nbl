import { defineContract } from "@/ship/engine/defineRoute";
import { ExportedSettings } from "../../../Models/ExportedSettings";
import { ImportSettingsResultResponse } from "../Transformers/SettingsExportTransformer";

export const importSettingsContract = defineContract({
  request: { body: ExportedSettings },
  responses: { 200: ImportSettingsResultResponse },
});
