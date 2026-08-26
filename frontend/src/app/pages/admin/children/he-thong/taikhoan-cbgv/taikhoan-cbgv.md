# Quản lý tài khoản cán bộ - giảng viên theo đơn vị

## Mục tiêu

Bổ sung quản lý `donvi_id` khi lọc, hiển thị, tạo và cập nhật tài khoản trong component `taikhoan-cbgv`.

## Phân quyền

### Admin / Direction

- Hiển thị dropdown đơn vị tại đầu bảng.
- Dropdown dùng `listDonvi`, gồm các đơn vị con trực tiếp có `parent_id` bằng `donvi_id` của người đăng nhập và `status != -1`.
- Giá trị lọc mặc định là `donvi_id` của người đăng nhập. Đơn vị hiện tại không được bổ sung vào `listDonvi`, nên dropdown có thể không hiển thị nhãn cho giá trị mặc định.
- Khi chọn hoặc xóa đơn vị, tải lại trang đầu. Nếu bộ lọc có giá trị, query user thêm điều kiện `donvi_id`.
- Hiển thị cột Đơn vị. Tên đơn vị được map từ `listDonvi` theo `row.donvi_id`; không tìm thấy hiển thị `—`.
- Form hiển thị dropdown đơn vị bắt buộc:
  - Thêm mới: chưa chọn đơn vị.
  - Cập nhật: chỉ giữ `donvi_id` cũ khi ID tồn tại trong `listDonvi`; nếu không, để trống và yêu cầu chọn đơn vị con.
- Payload tạo/cập nhật dùng `donvi_id` đã chọn trong form.

### Đối tác

Áp dụng cho vai trò `doi-tac` và `doi-tac-cv`.

- Không hiển thị dropdown đơn vị tại đầu bảng.
- Không hiển thị dropdown đơn vị trong form.
- Không hiển thị cột Đơn vị.
- Giữ điều kiện danh sách hiện tại: `created_by` bằng ID người đăng nhập.
- Payload tạo và cập nhật luôn dùng `donvi_id` của đối tác đang đăng nhập, không dùng giá trị từ form.

## Tiêu chí nghiệm thu

- Admin lọc được user theo đơn vị đã chọn.
- Admin thấy tên đơn vị tương ứng trong bảng hoặc `—` khi không map được.
- Admin không thể lưu form khi chưa chọn đơn vị con.
- Đối tác không thấy các control hoặc cột đơn vị.
- Đối tác tạo/cập nhật user luôn gửi đúng `donvi_id` hiện tại.
- Tìm kiếm, phân trang, vai trò, sửa và xóa tài khoản tiếp tục hoạt động như trước.