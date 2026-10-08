# DiffView

Mô phỏng Monaco `<DiffEditor />` hai cột Original | Proposed, kèm `DiffReviewBar`.

Dòng thêm: nền `color-diff-added` + dấu `+`; dòng xoá: `color-diff-removed` + dấu `−`; đoạn chữ thay đổi trong dòng: `color-diff-added-text` / `color-diff-removed-text`. Thêm = blue, xoá = đỏ (cặp blue/đỏ phân biệt được cả với người mù màu đỏ–lục), và luôn có dấu +/−. Trong app dùng `DiffEditor` thật với theme Monaco ở README chính.
