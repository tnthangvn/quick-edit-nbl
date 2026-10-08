/** Lệnh đã dựng sẵn để chạy một CLI agent (không qua shell). */
export type CliInvocation = {
  /** Đường dẫn tuyệt đối của binary. */
  command: string;
  args: string[];
  env: Record<string, string>;
  /** Giá trị secret đã resolve, để che (***) nếu CLI in ra log. */
  secretValues: string[];
};
