import "server-only";
import { z } from "zod";
import { CliAgentKind } from "@/ship/contracts/enums/agent";
import { Transformer } from "@/ship/parents/Transformer";
import { CliLoginStatus } from "../../../Enums/CliLoginStatus";
import type { CliAgentDetection } from "../../../Tasks/DetectCliAgentTask";

export const CliAgentDetectionResponse = z
  .object({
    kind: CliAgentKind,
    binary: z.string(),
    found: z.boolean(),
    path: z.string().nullable(),
    version: z.string().nullable(),
    loginStatus: CliLoginStatus,
    /** Lệnh cài đặt gợi ý, hiển thị nguyên văn; null nếu không có lệnh chuẩn. */
    installCommand: z.string().nullable(),
  })
  .meta({ id: "CliAgentDetection" });
export type CliAgentDetectionResponse = z.infer<typeof CliAgentDetectionResponse>;

export const CliAgentDetectionList = z.object({ items: z.array(CliAgentDetectionResponse) }).meta({ id: "CliAgentDetectionList" });

export class CliAgentDetectionTransformer extends Transformer<CliAgentDetection, CliAgentDetectionResponse> {
  transform(d: CliAgentDetection): CliAgentDetectionResponse {
    return {
      kind: d.kind,
      binary: d.binary,
      found: d.found,
      path: d.path,
      version: d.version,
      loginStatus: d.loginStatus,
      installCommand: d.installCommand,
    };
  }
}
