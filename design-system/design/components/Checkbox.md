# Checkbox

Ô chọn 16px để đính kèm spec vào context của Agent, chọn tất cả, hoặc bật tuỳ chọn có nhãn.

- Trạng thái: chưa chọn (viền `color-input` 1.5px trên `color-card`), đã chọn (nền `color-primary`, dấu ✓ `color-primary-foreground`), chọn một phần (`indeterminate`, gạch ngang; dùng cho ô "chọn tất cả" khi chỉ một số spec được chọn), khoá (`disabled`, mờ 45%).
- Hover: viền chuyển `color-primary` kèm quầng `color-primary-soft` 3px. Nhấn: lún `scale(.9)`. Focus bàn phím: viền 2px `color-ring` cách 2px.
- Dấu ✓ được vẽ bằng nét riêng cân trong ô 16px (không dùng icon thu nhỏ) và chạy nét trong `--duration-slow` khi tick; tắt khi giảm chuyển động.
- Trong `SpecListItem`, ô chưa chọn mờ đi cho danh sách đỡ rối, rõ lại khi rê chuột hoặc focus vào dòng; ô đã chọn luôn rõ.
- Truyền `children` để có nhãn bấm được ở bên phải; không có nhãn thì bắt buộc `label` (thành `aria-label`). Click checkbox không kích hoạt việc mở file.

Người dùng cung cấp: `checked`, `onChange(checked)`, `indeterminate?`, `disabled?`, `label` hoặc `children`. Trong app: shadcn `Checkbox` (Radix) với cùng token; dùng `data-[state=checked]` và `data-[state=indeterminate]`.
