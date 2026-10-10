import "server-only";
import { Action } from "@/ship/parents/Action";
import { ReadNotebookConnectionTask } from "../Tasks/ReadNotebookConnectionTask";

/** Settings › Integrations › NotebookLM: đã dán cookie chưa (bản che). */
export class GetNotebookConnectionAction extends Action<void, { isSet: boolean; masked: string | null }> {
  constructor(private readonly read = new ReadNotebookConnectionTask()) {
    super();
  }

  run(): Promise<{ isSet: boolean; masked: string | null }> {
    return this.read.run();
  }
}
