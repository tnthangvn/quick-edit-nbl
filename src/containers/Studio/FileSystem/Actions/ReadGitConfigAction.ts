import "server-only";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Action } from "@/ship/parents/Action";
import { DirectoryNotFoundException } from "../Exceptions/DirectoryNotFoundException";
import { ReadGitConfigTask, type GitConfigInfo } from "../Tasks/ReadGitConfigTask";

/** Remote Git sẵn có của thư mục làm việc (đọc .git/config) để Wizard điền nhanh; nhánh do người dùng nhập. */
export class ReadGitConfigAction extends Action<{ path: string }, GitConfigInfo> {
  constructor(private readonly readGitConfig = new ReadGitConfigTask()) {
    super();
  }

  async run({ path: input }: { path: string }): Promise<GitConfigInfo> {
    const dir = path.resolve(input);
    const info = await stat(dir).catch(() => undefined);
    if (!info?.isDirectory()) throw new DirectoryNotFoundException({ path: dir });
    return this.readGitConfig.run({ dir });
  }
}
