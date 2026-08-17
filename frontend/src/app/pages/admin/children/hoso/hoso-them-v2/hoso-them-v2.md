# Thiết kế Component: HosoThemV2

## 1. Mục tiêu

Chỉ chỉnh sửa `HosoThemV2Component`.

Body của component hiện tại bỏ toàn bộ phần bên trái và phần bên phải. Nội dung body chỉ còn `FormThongtinDangkyComponent`, được render ngay khi mở trang, không phụ thuộc điều kiện chọn Ngành hoặc Chương trình đào tạo ở parent.

## 2. Phạm vi thay đổi

Chỉ được chỉnh sửa các file của component hiện tại:

```text
frontend/src/app/pages/admin/children/hoso/hoso-them-v2/
├── hoso-them-v2.component.ts
├── hoso-them-v2.component.html
├── hoso-them-v2.component.css
└── hoso-them-v2.md
```

## 3. Ngoài phạm vi

Không chỉnh sửa component con hoặc bất kỳ file nào của component con:

```text
frontend/src/app/pages/admin/children/hoso/form-thongtin-dangky/
├── form-thongtin-dangky.component.ts
├── form-thongtin-dangky.component.html
└── form-thongtin-dangky.component.css
```

Phải giữ nguyên toàn bộ hành vi hiện có của `FormThongtinDangkyComponent`, bao gồm:

- Inputs và outputs.
- Form fields.
- Validation.
- State nội bộ.
- Kiểm tra CCCD nội bộ.
- Hiển thị hồ sơ đã tồn tại.
- Load danh mục.
- Submit, reset, cancel.
- Giao diện và CSS của component con.

Yêu cầu “không bắt điều kiện gì để mở form” chỉ áp dụng cho điều kiện render component con tại `HosoThemV2Component`. Không được xóa hoặc thay đổi điều kiện, state và quy trình nằm bên trong component con.

## 4. Luồng hiển thị mới của parent

```text
Mở HosoThemV2Component
    │
    ▼
Render ngay <app-form-thongtin-dangky>
    │
    ▼
Component con tự xử lý giao diện và luồng nội bộ hiện có
```

Parent không yêu cầu người dùng chọn Ngành hoặc Chương trình đào tạo trước khi render component con.

## 5. Layout mới

```text
┌──────────────────────────────────────────────────────────────────┐
│ HEADER                                                           │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Thêm hồ sơ thí sinh                           [Reset]         │ │
│ └──────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│ BODY                                                             │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │                                                              │ │
│ │              <app-form-thongtin-dangky>                      │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Yêu cầu layout

- Body dùng toàn bộ chiều rộng khả dụng.
- Body chỉ chứa `app-form-thongtin-dangky`.
- Không còn cột trái.
- Không còn wrapper cột phải.
- Không còn khoảng trống dành cho hai cột cũ.
- Không còn info bar Ngành/Chương trình đào tạo của parent.
- Không còn màn hình chờ chọn Ngành/Chương trình đào tạo của parent.
- Body cho phép cuộn dọc theo nội dung component con.
- Không áp CSS từ parent làm thay đổi giao diện nội bộ của component con.

## 6. Template parent dự kiến

```html
<div class="hoso-them">
    <div class="hoso-them__header">
        <!-- Giữ header hiện tại -->
    </div>

    <div class="hoso-them__body">
        <app-form-thongtin-dangky
            class="w-100"
            (saved)="onSaved()"
            (cancel)="onCancel()"
        />
    </div>
</div>
```

Tên handler có thể bám theo code hiện tại. Việc triển khai không được yêu cầu thay đổi outputs của component con.

## 7. Logic phải loại bỏ khỏi parent

Loại bỏ khỏi `HosoThemV2Component` nếu không còn nơi sử dụng:

- `selectedMajorId`.
- `selectedProgramId`.
- `nganhOptions`.
- `chuongTrinhOptions`.
- `selectedMajorLabel`.
- `selectedProgramLabel`.
- `selectedProgramDuration`.
- `selectedProgramDegree`.
- `showForm`.
- `dots` nếu không còn dùng tại parent.
- `loadLookups()` của parent.
- `onMajorChange()`.
- `selectProgram()`.
- Các helper label chỉ phục vụ panel cũ.
- Các service/import chỉ phục vụ dữ liệu panel cũ.

Không áp dụng danh sách loại bỏ này cho `FormThongtinDangkyComponent`.

## 8. Logic render phải loại bỏ khỏi template parent

- Khối chọn Ngành.
- Danh sách Chương trình đào tạo.
- Info bar Ngành/Chương trình đào tạo.
- Điều kiện `@if (selectedMajorId())`.
- Điều kiện `@if (showForm())`.
- Màn hình `hoso-them__waiting`.
- Binding `[majorId]="selectedMajorId()"`.
- Binding `[programId]="selectedProgramId()"`.

Component con được render trực tiếp. Hai input `majorId` và `programId` của component con vẫn giữ nguyên trong source child; parent chỉ không truyền giá trị vì không còn bước chọn tương ứng.

## 9. CSS parent

CSS của `HosoThemV2Component` cần:

- Chuyển body sang layout một cột.
- Cho component con chiếm `width: 100%`.
- Giữ vùng cuộn phù hợp với chiều cao trang.
- Xóa selector chỉ phục vụ left panel, right panel, info bar và waiting state nếu không còn dùng.

Không chỉnh sửa `form-thongtin-dangky.component.css`.

## 10. Hành vi header

Giữ header hiện tại.

Nút Reset ở header phải gọi API public sẵn có của component con hoặc xử lý tại parent mà không sửa component con. Không thay đổi chữ ký method/output của child để phục vụ nút này.

Các event `(saved)` và `(cancel)` tiếp tục được parent tiếp nhận bằng handler phù hợp với luồng hiện tại.

## 11. Tiêu chí hoàn thành

- Truy cập route render ngay `app-form-thongtin-dangky`.
- Không cần chọn Ngành hoặc Chương trình đào tạo tại parent.
- Body chỉ còn component con.
- Không còn left panel, right panel, info bar hoặc waiting state của parent.
- Component con chiếm toàn bộ chiều rộng body.
- Component con không có bất kỳ thay đổi nào.
- State, validation, kiểm tra CCCD, submit và giao diện nội bộ của component con giữ nguyên.
- Build Angular thành công.
- Giao diện được kiểm tra trực tiếp trên trình duyệt.
