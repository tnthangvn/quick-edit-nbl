import "server-only";

/**
 * Một use case. Chỉ có một hàm public `run()`.
 * - Gọi Task (kể cả Task của container khác trong cùng Section) hoặc SubAction.
 * - Không gọi Action khác, không được gọi từ Task.
 * - Không trả Response; Controller lo việc đó.
 */
export abstract class Action<Input = void, Output = void> {
  abstract run(input: Input): Promise<Output>;
}
