# Select

Dropdown tự dựng (không dùng `<select>` gốc): nút kích hoạt + popover danh sách; tự có ô tìm kiếm khi danh sách dài.

- **Ít item (< 8)**: chỉ danh sách, ví dụ Provider, CLI profile.
- **Nhiều item (≥ `searchThreshold`, mặc định 8)**: ô tìm kiếm ở đầu popover, lọc theo `label`, `value`, `hint`, có đếm `kết quả/tổng`. Ép bật/tắt bằng `searchable`.
- **`allowCustom`**: luôn có ô tìm; khi chữ gõ vào không khớp item nào, dòng cuối là "Dùng “…”" để chọn giá trị tự nhập. Dùng cho Model ID (spec: "chọn model hoặc tự nhập custom model name").
- **`multiple`**: chọn nhiều. `value` là mảng. Mục đã chọn hiện thành tag `color-primary` trên `color-primary-soft` trên nút (tối đa `maxTags`, mặc định 2, phần dư gộp thành `+n`, rê chuột để xem đủ); bấm × trên tag để bỏ. Trong danh sách mỗi dòng có `Checkbox`; tick không đóng dropdown. Chân dropdown: số đã chọn, **Bỏ chọn**, **Chọn tất cả** (khi đang tìm thì thành **Chọn kết quả**, chỉ áp dụng cho các dòng đang hiện). `Backspace` khi ô tìm trống bỏ tag cuối. Ví dụ: chọn tools cho Agent, chọn nhiều spec để Force Sync.
- **Nhóm**: item có `group` sẽ hiện tiêu đề nhóm (ví dụ theo provider); `hint` hiện ở bên phải bằng chữ phụ.
- Bàn phím: `↓`/`Enter`/`Space` mở, `↑`/`↓` di chuyển, `Enter` chọn, `Esc` đóng; click ra ngoài cũng đóng.
- Item đang chọn có dấu ✓ màu `color-primary`; item đang trỏ có nền `color-accent`. Popover dùng `color-popover`, `radius-lg`, `shadow-popover`, cao tối đa 280px rồi cuộn.
- `mono` cho model ID / CLI profile; `size="sm"` (`size-control-sm`) trong Quick Setting Toolbar; `width` để cố định độ rộng; `align="end"` khi đặt sát mép phải; `side="top"` mở lên trên (dùng trong Quick Setting Toolbar vì nằm sát Chatbox).

Người dùng cung cấp: `options` (chuỗi hoặc `{ value, label, group?, hint? }`), `value` hoặc `defaultValue` (mảng khi `multiple`), `onChange(value)`. Trong app: shadcn `Popover` + `Command` (cmdk) cho bản có tìm kiếm và bản chọn nhiều, `Select` của Radix cho bản ngắn, giữ đúng các token trên.
