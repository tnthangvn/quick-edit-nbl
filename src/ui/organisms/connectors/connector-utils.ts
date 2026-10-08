import type { Connector, ConnectorStatus, GitProvider } from "@/client/api/generated/model";
import type { ConnectorRowState } from "@/ui/molecules/connector-row";

/** Trạng thái connector của API → trạng thái hiển thị của ConnectorRow (null = chưa kiểm tra lần nào). */
export function toRowState(status: ConnectorStatus | null | undefined): ConnectorRowState {
  switch (status) {
    case "CONNECTED":
      return "CONNECTED";
    case "NEEDS_LOGIN":
      return "NEEDS_LOGIN";
    case "CLI_NOT_FOUND":
      return "NOT_FOUND";
    case "ERROR":
      return "ERROR";
    default:
      return "UNCHECKED";
  }
}

/** Connector liệt kê được repo / branch (SSH chỉ clone/pull/push). */
export const canListRepos = (c: Pick<Connector, "type"> | null | undefined) => Boolean(c && c.type !== "SSH");

/** Host mặc định của provider (khớp mô tả `GitStorageInput.host`). */
export const DEFAULT_HOST: Partial<Record<GitProvider, string>> = {
  GITHUB: "github.com",
  GITLAB: "gitlab.com",
  BITBUCKET: "bitbucket.org",
};
