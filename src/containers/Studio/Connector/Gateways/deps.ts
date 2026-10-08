import "server-only";
import { gitProviderClient } from "@/ship/adapters/git-providers";
import { callMcpTool, listMcpTools, withMcpClient } from "@/ship/adapters/mcp";
import { run, versionOf, which } from "@/ship/adapters/process";
import { secrets, type SecretStore } from "@/ship/adapters/secrets";

/** Phụ thuộc bên ngoài của connector; test thay bằng bản giả qua constructor. */
export type ConnectorDeps = {
  process: { run: typeof run; which: typeof which; versionOf: typeof versionOf };
  secrets: SecretStore;
  restClient: typeof gitProviderClient;
  mcp: { withClient: typeof withMcpClient; listTools: typeof listMcpTools; call: typeof callMcpTool };
};

export const defaultConnectorDeps = (): ConnectorDeps => ({
  process: { run, which, versionOf },
  secrets,
  restClient: gitProviderClient,
  mcp: { withClient: withMcpClient, listTools: listMcpTools, call: callMcpTool },
});
