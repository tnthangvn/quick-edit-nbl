/** Bản sao tạm của specsDir để CLI agent sửa. */
export type Sandbox = {
  /** Thư mục tạm gốc (xoá cả cây khi xong). */
  root: string;
  /** Bản sao của specsDir, là cwd của CLI. */
  dir: string;
  /** Hash các file .md ngay sau khi chép: file nào đổi hash là do CLI sửa. */
  baseline: Map<string, string>;
};

/** Một file .md CLI đã sửa / tạo trong sandbox. */
export type SandboxChange = { file: string; original: string; proposed: string; isNewFile: boolean };
