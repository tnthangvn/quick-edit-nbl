import "server-only";
import type { GitBranch } from "@/ship/adapters/git-providers";
import { Task } from "@/ship/parents/Task";
import { ConnectorGateway } from "../Gateways/ConnectorGateway";
import { defaultConnectorDeps, type ConnectorDeps } from "../Gateways/deps";
import type { ConnectorRow } from "../Models/Connector";

export class ListConnectorBranchesTask extends Task<{ connector: ConnectorRow; repo: string }, GitBranch[]> {
  constructor(private readonly deps: ConnectorDeps = defaultConnectorDeps()) {
    super();
  }

  run({ connector, repo }: { connector: ConnectorRow; repo: string }): Promise<GitBranch[]> {
    return new ConnectorGateway(connector, this.deps).listBranches(repo);
  }
}
