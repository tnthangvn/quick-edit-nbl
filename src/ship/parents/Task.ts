import "server-only";

/**
 * Một việc duy nhất, một hàm public `run()`.
 * - Chỉ được gọi từ Action / SubAction.
 * - Không gọi Task hay Action khác.
 */
export abstract class Task<Input = void, Output = void> {
  abstract run(input: Input): Promise<Output>;
}
