import "server-only";

/**
 * Phần nghiệp vụ dùng chung giữa nhiều Action. Phải gọi ít nhất một Task.
 * Chỉ được gọi từ Action (hoặc event handler), không từ Controller hay Task, không gọi SubAction khác.
 */
export abstract class SubAction<Input = void, Output = void> {
  abstract run(input: Input): Promise<Output>;
}
