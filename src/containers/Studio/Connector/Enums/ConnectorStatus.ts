import { z } from "zod";

/** Kết quả nút Kiểm tra của connector (spec 3.0.2): Đã kết nối / Cần đăng nhập lại / Không tìm thấy CLI / Lỗi. */
export const ConnectorStatus = z
  .enum(["CONNECTED", "NEEDS_LOGIN", "CLI_NOT_FOUND", "ERROR"])
  .meta({ id: "ConnectorStatus", description: "Trạng thái kết nối của connector" });
export type ConnectorStatus = z.infer<typeof ConnectorStatus>;
