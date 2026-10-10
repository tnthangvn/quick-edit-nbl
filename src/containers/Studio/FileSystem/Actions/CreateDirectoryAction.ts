import "server-only";
import { Action } from "@/ship/parents/Action";
import { CreateDirectoryTask } from "../Tasks/CreateDirectoryTask";

/** Nút "Thư mục mới" trong dialog chọn thư mục: tạo thư mục con rồi trả đường dẫn để dialog mở vào. */
export class CreateDirectoryAction extends Action<{ parent: string; name: string }, { path: string }> {
  constructor(private readonly createDirectory = new CreateDirectoryTask()) {
    super();
  }

  run(input: { parent: string; name: string }): Promise<{ path: string }> {
    return this.createDirectory.run(input);
  }
}
