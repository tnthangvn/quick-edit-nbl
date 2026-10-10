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

/** Ảnh dán từ clipboard: base64 không có tiền tố data:, tối đa ~5MB mỗi ảnh. */
export const CliImageInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    mediaType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
    data: z
      .string()
      .max(7_000_000)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  })
  .meta({ id: "CliImageInput" });

export const StartCliRunBody = z
  .object({
    workspaceId: z.string().min(1),
    /** Phiên chat Agent chứa lượt này (giữ transcript, nối tiếp hội thoại CLI). */
    sessionId: z.string().min(1).max(64),
    profileId: z.string().min(1),
    prompt: z.string().trim().min(1).max(20_000),
    contextFiles: z.array(SpecRelativePath).max(50).default([]),
    images: z.array(CliImageInput).max(5).default([]),
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
