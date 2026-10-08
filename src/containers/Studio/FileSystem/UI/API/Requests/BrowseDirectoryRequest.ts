import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { AbsolutePath } from "../../../../Setting/Models/ConfigFields";
import { BrowseDirectoryResponse } from "../Transformers/DirectoryTransformer";

export const browseDirectoryContract = defineContract({
  request: { query: z.object({ path: AbsolutePath.optional().meta({ description: "Bỏ trống = thư mục home" }) }) },
  responses: { 200: BrowseDirectoryResponse, 404: ErrorResponse },
});
