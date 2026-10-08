import "server-only";
import { v7 as uuidv7 } from "uuid";
import { Action } from "@/ship/parents/Action";
import { CreateConnectorTask } from "../../Connector/Tasks/CreateConnectorTask";
import { ListConnectorsTask } from "../../Connector/Tasks/ListConnectorsTask";
import type { ExportedSettings } from "../Models/ExportedSettings";
import { GetAgentSettingsTask } from "../Tasks/GetAgentSettingsTask";
import { SaveAgentSettingsTask } from "../Tasks/SaveAgentSettingsTask";

export type ImportSettingsResult = { importedConnectors: number; skippedConnectors: string[] };

/**
 * Settings › Export/Import: ghi đè Direct API + CLI Agent Runner (giữ nguyên apiKeyRef hiện có — file import không
 * có secret), thêm connector mới theo tên, bỏ qua nếu trùng tên (không xoá connector cũ).
 */
export class ImportSettingsAction extends Action<ExportedSettings, ImportSettingsResult> {
  constructor(
    private readonly getAgentSettings = new GetAgentSettingsTask(),
    private readonly saveAgentSettings = new SaveAgentSettingsTask(),
    private readonly listConnectors = new ListConnectorsTask(),
    private readonly createConnector = new CreateConnectorTask(),
  ) {
    super();
  }

  async run(data: ExportedSettings): Promise<ImportSettingsResult> {
    const current = await this.getAgentSettings.run();
    await this.saveAgentSettings.run({
      activeMode: data.agent.activeMode,
      api: { ...data.agent.api, apiKeyRef: current.api.apiKeyRef },
      cli: data.agent.cli,
    });

    const existingNames = new Set((await this.listConnectors.run()).map((c) => c.name.trim().toLowerCase()));
    const skippedConnectors: string[] = [];
    let importedConnectors = 0;
    for (const connector of data.connectors) {
      if (existingNames.has(connector.name.trim().toLowerCase())) {
        skippedConnectors.push(connector.name);
        continue;
      }
      await this.createConnector.run({
        id: uuidv7(),
        ...connector,
        has_token: false,
        status: null,
        account: null,
        scopes: [],
        checked_at: null,
      });
      importedConnectors++;
    }
    return { importedConnectors, skippedConnectors };
  }
}
