import "server-only";
import { Action } from "@/ship/parents/Action";
import { DetectCliTask, type DetectedCli } from "../Tasks/DetectCliTask";

export class DetectConnectorsAction extends Action<void, DetectedCli[]> {
  constructor(private readonly detectCli = new DetectCliTask()) {
    super();
  }

  run(): Promise<DetectedCli[]> {
    return this.detectCli.run();
  }
}
