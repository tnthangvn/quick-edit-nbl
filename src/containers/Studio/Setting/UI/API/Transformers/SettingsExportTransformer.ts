import "server-only";
import { z } from "zod";

export const ImportSettingsResultResponse = z
  .object({ importedConnectors: z.number().int().nonnegative(), skippedConnectors: z.array(z.string()) })
  .meta({ id: "ImportSettingsResult" });
