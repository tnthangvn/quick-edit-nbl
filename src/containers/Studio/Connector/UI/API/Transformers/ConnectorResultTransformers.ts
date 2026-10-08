import "server-only";
import { z } from "zod";
import { GitProvider } from "@/ship/contracts/enums/sync";
import { ConnectorStatus } from "../../../Enums/ConnectorStatus";

/** Kết quả nút Kiểm tra connector. */
export const ConnectorCheckResponse = z
  .object({
    status: ConnectorStatus,
    account: z.string().nullable(),
    host: z.string().nullable(),
    scopes: z.array(z.string()),
    loginCommand: z.string().nullable().meta({ description: "Lệnh gợi ý khi CLI chưa đăng nhập" }),
    checkedAt: z.iso.datetime(),
  })
  .meta({ id: "ConnectorCheck" });

export const DetectedCliResponse = z
  .object({
    command: z.string(),
    provider: GitProvider,
    path: z.string().nullable(),
    version: z.string().nullable(),
    loggedIn: z.boolean(),
    host: z.string().nullable(),
    account: z.string().nullable(),
    loginCommand: z.string(),
  })
  .meta({ id: "DetectedCli" });
export const DetectedCliListResponse = z.object({ items: z.array(DetectedCliResponse) }).meta({ id: "DetectedCliList" });

export const GitRepositoryResponse = z
  .object({
    fullName: z.string(),
    defaultBranch: z.string().nullable(),
    private: z.boolean(),
    cloneUrl: z.string(),
    sshUrl: z.string().nullable(),
    webUrl: z.string(),
  })
  .meta({ id: "GitRepository" });
export const GitRepositoryListResponse = z.object({ items: z.array(GitRepositoryResponse) }).meta({ id: "GitRepositoryList" });

export const GitBranchResponse = z.object({ name: z.string(), isDefault: z.boolean() }).meta({ id: "GitBranch" });
export const GitBranchListResponse = z.object({ items: z.array(GitBranchResponse) }).meta({ id: "GitBranchList" });

export const ConnectorToolResponse = z
  .object({ name: z.string(), description: z.string().nullable(), enabled: z.boolean() })
  .meta({ id: "ConnectorTool" });
export const ConnectorToolListResponse = z.object({ items: z.array(ConnectorToolResponse) }).meta({ id: "ConnectorToolList" });
