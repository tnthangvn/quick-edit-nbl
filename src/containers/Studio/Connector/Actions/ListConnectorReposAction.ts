import "server-only";
import type { GitRepo } from "@/ship/adapters/git-providers";
import { Action } from "@/ship/parents/Action";
import { GetConnectorTask } from "../Tasks/GetConnectorTask";
import { ListConnectorReposTask } from "../Tasks/ListConnectorReposTask";

export class ListConnectorReposAction extends Action<{ connectorId: string; q?: string }, GitRepo[]> {
  constructor(
    private readonly getConnector = new GetConnectorTask(),
    private readonly listRepos = new ListConnectorReposTask(),
  ) {
    super();
  }

  async run({ connectorId, q }: { connectorId: string; q?: string }): Promise<GitRepo[]> {
    return this.listRepos.run({ connector: await this.getConnector.run({ connectorId }), q });
  }
}
