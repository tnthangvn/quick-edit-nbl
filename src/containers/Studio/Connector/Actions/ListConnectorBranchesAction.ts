import "server-only";
import type { GitBranch } from "@/ship/adapters/git-providers";
import { Action } from "@/ship/parents/Action";
import { GetConnectorTask } from "../Tasks/GetConnectorTask";
import { ListConnectorBranchesTask } from "../Tasks/ListConnectorBranchesTask";

export class ListConnectorBranchesAction extends Action<{ connectorId: string; repo: string }, GitBranch[]> {
  constructor(
    private readonly getConnector = new GetConnectorTask(),
    private readonly listBranches = new ListConnectorBranchesTask(),
  ) {
    super();
  }

  async run({ connectorId, repo }: { connectorId: string; repo: string }): Promise<GitBranch[]> {
    return this.listBranches.run({ connector: await this.getConnector.run({ connectorId }), repo });
  }
}
