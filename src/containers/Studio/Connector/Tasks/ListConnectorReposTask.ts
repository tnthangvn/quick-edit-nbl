import "server-only";
import type { GitRepo } from "@/ship/adapters/git-providers";
import { Task } from "@/ship/parents/Task";
import { ConnectorGateway } from "../Gateways/ConnectorGateway";
import { defaultConnectorDeps, type ConnectorDeps } from "../Gateways/deps";
import type { ConnectorRow } from "../Models/Connector";

export class ListConnectorReposTask extends Task<{ connector: ConnectorRow; q?: string }, GitRepo[]> {
  constructor(private readonly deps: ConnectorDeps = defaultConnectorDeps()) {
    super();
  }

  run({ connector, q }: { connector: ConnectorRow; q?: string }): Promise<GitRepo[]> {
    return new ConnectorGateway(connector, this.deps).listRepos(q);
  }
}
