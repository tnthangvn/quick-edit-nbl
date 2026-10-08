import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { CliRunStarted } from "../Transformers/CliRunTransformer";

/** Đường dẫn tương đối trong specsDir: không tuyệt đối, không "..", không "\\". */
export const SpecRelativePath = z
  .string()
  .min(1)
  .max(500)
  .refine((f) => !f.startsWith("/") && !f.includes("\\") && !f.includes("\0") && !f.split("/").includes(".."));

export const StartCliRunBody = z
  .object({
    workspaceId: z.string().min(1),
    profileId: z.string().min(1),
    prompt: z.string().trim().min(1).max(20_000),
    contextFiles: z.array(SpecRelativePath).max(50).default([]),
  })
  .meta({ id: "StartCliRunBody" });

export const startCliRunContract = defineContract({
  request: { body: StartCliRunBody },
  responses: {
    202: CliRunStarted,
    400: ErrorResponse,
    404: ErrorResponse,
    409: ErrorResponse,
  },
});
