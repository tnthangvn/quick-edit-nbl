import "server-only";
import { Action } from "@/ship/parents/Action";
import { ListConnectorsTask } from "../../Connector/Tasks/ListConnectorsTask";
import type { ExportedSettings } from "../Models/ExportedSettings";
import { FilterExportableCliProfilesTask } from "../Tasks/FilterExportableCliProfilesTask";
import { GetAgentSettingsTask } from "../Tasks/GetAgentSettingsTask";

/** Settings › Export/Import: xuất cấu hình cơ bản (Direct API, CLI Agent Runner, Connectors), không kèm secret. */
export class ExportSettingsAction extends Action<void, ExportedSettings> {
  constructor(
    private readonly getAgentSettings = new GetAgentSettingsTask(),
    private readonly filterCliProfiles = new FilterExportableCliProfilesTask(),
    private readonly listConnectors = new ListConnectorsTask(),
  ) {
    super();
  }

  async run(): Promise<ExportedSettings> {
    const [settings, connectors] = await Promise.all([this.getAgentSettings.run(), this.listConnectors.run()]);
    const { apiKeyRef: _apiKeyRef, ...api } = settings.api;
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      agent: {
        activeMode: settings.activeMode,
        api,
        cli: { ...settings.cli, profiles: await this.filterCliProfiles.run(settings.cli.profiles) },
      },
      connectors: connectors.map((c) => ({
        name: c.name,
        type: c.type,
        provider: c.provider,
        host: c.host,
        command: c.command,
        args: c.args,
        env: c.env,
        transport: c.transport,
        url: c.url,
        headers: c.headers,
        secret_keys: c.secret_keys,
        agent_tools: c.agent_tools,
      })),
    };
  }
}
