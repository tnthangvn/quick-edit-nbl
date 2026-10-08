# Button

Nút bấm cho mọi hành động có nhãn chữ.

- `primary` (`color-primary`, blue): mỗi vùng chỉ một nút — Approve & Save, Send, Save trong Settings.
- `secondary`: Reject, Test Connection. `ghost`: Cancel. `outline`: hành động phụ trên nền card.
- `tonal` (chữ `color-primary` trên `color-primary-soft`): hành động blue thứ cấp, ví dụ Force Sync lên NotebookLM.
- `destructive`: Delete spec, luôn đi sau hộp xác nhận.
- `size="sm"` (`size-control-sm`) trong thanh Quick Setting, Diff bar, Composer.
- Truyền `loading` khi đang ghi file / sync: nút tự khoá, hiện spinner, đổi nhãn ("Đang lưu…"). Xong thì bật `success` khoảng 1.5 giây (icon ✓ hiện ra bằng scale-in, nhãn "Đã lưu") rồi trả về trạng thái thường. Đặt `minWidth` để nút không co giãn khi đổi nhãn.

**Chuyển động** (tự tắt khi hệ điều hành bật giảm chuyển động):
- Hover: nền, viền, chữ đổi màu trong `--duration-base` (150ms), `--ease-out`. Nút `primary` và `destructive` hover tối hơn ở light, sáng hơn ở dark.
- Nhấn: lún `scale(.97)` trong `--duration-fast` (100ms). IconButton lún `scale(.92)`.
- Icon diễn đúng động từ khi hover, `--duration-slow` (220ms): `send-horizontal` tiến 2px, `refresh-cw` quay 180°, `cloud-upload` nhấc 2px, `x` và `plus` xoay 90°, `check` phóng nhẹ, `trash-2` nghiêng, `settings` xoay 60°.
- Không dùng: ánh sáng quét ngang (shine), nảy lò xo, viền gradient phát sáng, ripple. Chúng làm chậm và gây rối trong công cụ dùng cả ngày.

Người dùng cung cấp: `children` (nhãn ngắn, động từ, Title Case tiếng Anh như wireframe), `icon` Lucide, `onClick`.
