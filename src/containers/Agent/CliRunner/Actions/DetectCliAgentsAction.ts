import "server-only";
import { Action } from "@/ship/parents/Action";
import { DETECTABLE_CLI_KINDS, DetectCliAgentTask, type CliAgentDetection } from "../Tasks/DetectCliAgentTask";

/** Thẻ Active CLI ở Settings Tab 2: dò song song mọi CLI agent đã biết. */
export class DetectCliAgentsAction extends Action<void, CliAgentDetection[]> {
  constructor(private readonly detect = new DetectCliAgentTask()) {
    super();
  }

  run(): Promise<CliAgentDetection[]> {
    return Promise.all(DETECTABLE_CLI_KINDS.map((kind) => this.detect.run({ kind })));
  }
}
