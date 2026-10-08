import os from "node:os";
import path from "node:path";

/** Tiền tố thư mục sandbox; RemoveSandboxTask chỉ xoá thư mục có tiền tố này trong os.tmpdir(). */
export const SANDBOX_PREFIX = "spec-studio-run-";

/** Sandbox cố định của một agent session: cùng cwd mỗi lượt (claude lưu phiên theo cwd nên mới resume được). */
export const sessionSandboxRoot = (sessionId: string) => path.join(os.tmpdir(), `${SANDBOX_PREFIX}${sessionId}`);

/** Bản sao tạm của specsDir để CLI agent sửa. */
export type Sandbox = {
  /** Thư mục tạm gốc (xoá cả cây khi xong). */
  root: string;
  /** true = sandbox của session, giữ lại sau run (xoá khi xoá session). */
  persistent: boolean;
  /** Bản sao của specsDir, là cwd của CLI. */
  dir: string;
  /** Hash các file .md ngay sau khi chép: file nào đổi hash là do CLI sửa. */
  baseline: Map<string, string>;
};

/** Một file .md CLI đã sửa / tạo trong sandbox. */
export type SandboxChange = { file: string; original: string; proposed: string; isNewFile: boolean };
