import { z } from "zod";
import { ErrorResponse } from "@/ship/contracts/errors";
import { defineContract } from "@/ship/engine/defineRoute";
import { AbsolutePath } from "../../../../Setting/Models/ConfigFields";

/** Tên một thư mục: không rỗng, không chứa / \ hay ký tự điều khiển, không phải "." / "..". */
export const DirectoryName = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine((n) => n !== "." && n !== ".." && !/[/\\\u0000-\u001f]/.test(n), { message: "FIELD.INVALID_VALUE" });

export const createDirectoryContract = defineContract({
  request: {
    body: z.object({ parent: AbsolutePath, name: DirectoryName }).meta({ id: "CreateDirectoryInput" }),
  },
  responses: {
    201: z.object({ path: z.string() }).meta({ id: "CreatedDirectory" }),
    403: ErrorResponse,
    404: ErrorResponse,
    409: ErrorResponse,
  },
});
