import { defineContract } from "@/ship/engine/defineRoute";
import { ExportedSettings } from "../../../Models/ExportedSettings";

export const exportSettingsContract = defineContract({
  responses: { 200: ExportedSettings },
});
