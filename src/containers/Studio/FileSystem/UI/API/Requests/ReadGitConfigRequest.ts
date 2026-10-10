import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { AbsolutePath } from "../../../../Setting/Models/ConfigFields";
import { GitConfigResponse } from "../Transformers/GitConfigTransformer";

export const readGitConfigContract = defineContract({
  request: { query: z.object({ path: AbsolutePath }) },
  responses: { 200: GitConfigResponse, 404: ErrorResponse },
});
