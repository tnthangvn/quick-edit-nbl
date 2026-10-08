# Toast

Thông báo nổi ngắn ở góc dưới phải, ba loại: `info`, `warning`, `error`.

- **info** (`color-info` = blue, trên `color-info-soft`, viền `color-info-border`): kết quả bình thường hoặc tiến trình: "Đã lưu sidebar.md", "Đang đồng bộ lên NotebookLM…" (`loading` đổi icon thành spinner). Tự ẩn sau 4 giây.
- **warning** (`color-warning` = amber, trên `color-warning-soft`, viền `color-warning-border`): cần để ý nhưng chưa hỏng: thay đổi chưa lưu, cookie sắp hết hạn, file lớn. Tự ẩn sau 6 giây; có `action` thì giữ tới khi người dùng xử lý.
- **error** (`color-error` = alias `color-destructive`, trên `color-error-soft`, viền `color-error-border`): thao tác thất bại: sync lỗi, không ghi được file, API key sai. Không tự ẩn; luôn có `action` (Thử lại / Mở Settings) khi có cách xử lý.
- Tiêu đề và icon mang màu của loại; mô tả dùng `color-muted-foreground`. Mỗi loại có icon riêng (`info`, `triangle-alert`, `circle-alert`), không chỉ khác màu.
- Tiêu đề ngắn, tiếng Việt, không chấm cuối; mô tả một câu nói rõ nguyên nhân và cách xử lý. Tên file, mã lỗi trong `<code>`.
- Tối đa 3 toast cùng lúc, xếp chồng với khe `space-2`; rộng 360px, `radius-lg`, `shadow-popover`.
- Màu `warning` chỉ dùng trong toast, banner và inline alert, không dùng cho nút hay trạng thái spec.

Người dùng cung cấp: `variant`, `title`, `description?`, `action?: { label, onClick }`, `loading?`, `onClose` (truyền `false` để ẩn nút đóng). Trong app: `sonner` (shadcn `Toaster`) với `toast.info / toast.warning / toast.error`, gán `classNames` theo các token trên.
