import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Task } from "@/ship/parents/Task";
import { isInsideRelative } from "../../Setting/Models/ConfigFields";
import { WorkspaceFolderNotWritableException } from "../Exceptions/WorkspaceFolderNotWritableException";

/** Tạo workspacePath/specsDir nếu chưa có; specsDir phải nằm trong workspacePath. Trả đường dẫn tuyệt đối. */
export class CreateSpecsDirTask extends Task<{ workspacePath: string; specsDir: string }, string> {
  async run({ workspacePath, specsDir }: { workspacePath: string; specsDir: string }): Promise<string> {
    const target = path.resolve(workspacePath, specsDir);
    const rel = path.relative(workspacePath, target);
    if (!isInsideRelative(specsDir) || rel.startsWith("..") || path.isAbsolute(rel)) throw new WorkspaceFolderNotWritableException({ path: target });
    try {
      await mkdir(target, { recursive: true });
    } catch (err) {
      throw new WorkspaceFolderNotWritableException({ path: target }, { cause: err });
    }
    return target;
  }
}
