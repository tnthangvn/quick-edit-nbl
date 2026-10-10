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

/** Ảnh người dùng dán vào composer, ghi vào `<sandbox>/.attachments/` để CLI đọc bằng tool đọc file. */
export type CliImage = { name: string; mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string };

export const ATTACHMENTS_DIR = ".attachments";
const IMAGE_EXT: Record<CliImage["mediaType"], string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

/** Đường dẫn tương đối (với cwd = sandbox.dir) của từng ảnh trong một run; tên do app đặt, không lấy từ người dùng. */
export const attachmentPaths = (runId: string, images: readonly CliImage[]): string[] =>
  images.map((img, i) => `${ATTACHMENTS_DIR}/${runId}-${i + 1}.${IMAGE_EXT[img.mediaType]}`);
