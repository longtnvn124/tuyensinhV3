# Thiết kế cập nhật: FormThongtinDangkyComponent

> Trạng thái: **Bản đề xuất để duyệt trước khi sửa code**. Chưa triển khai thay đổi TypeScript, HTML hoặc CSS.

## 1. Mục tiêu

Cập nhật `FormThongtinDangkyComponent` theo ba nhóm yêu cầu:

1. Phân quyền luồng kiểm tra hồ sơ theo CCCD và số điện thoại.
2. Không dùng API ngoài cho Ngành học và Chương trình đào tạo; chuyển sang API của server hiện tại.
3. Đồng bộ tài liệu với nội dung form đã được chỉnh sửa trong component.

---

## 2. Phạm vi dự kiến

Sau khi tài liệu được duyệt, các thay đổi dự kiến nằm tại:

```text
frontend/src/app/pages/admin/children/hoso/form-thongtin-dangky/
├── form-thongtin-dangky.component.ts
├── form-thongtin-dangky.component.html
├── form-thongtin-dangky.component.css
└── design.md
```

Các service nội bộ được tái sử dụng:

```text
frontend/src/app/services/tuyensinh/
├── hoso-thisinh.service.ts
├── nganhhoc.service.ts
└── chuongtrinh-daotao.service.ts
```

Không thay đổi API backend trong phần frontend này. Contract kiểm tra hồ sơ sẽ được nối vào API do backend cung cấp sau.

---

## 3. Phân quyền kiểm tra hồ sơ

### 3.1. Nhóm đặc quyền

| Tên quyền nghiệp vụ | Role key hiện có trong frontend | Dữ liệu kiểm tra | Giao diện |
|---|---|---|---|
| Admin | `admin` | CCCD hoặc Số điện thoại hoặc cả hai | Hiện ô CCCD và ô Số điện thoại |
| Director | `direction` | CCCD hoặc Số điện thoại hoặc cả hai | Hiện ô CCCD và ô Số điện thoại |
| Manager | `manager` | CCCD hoặc Số điện thoại hoặc cả hai | Hiện ô CCCD và ô Số điện thoại |

> Code hiện tại dùng role key `direction`, không dùng `director`. Bản triển khai sẽ tiếp tục dùng `direction` trừ khi backend đổi role key.

Cờ quyền dự kiến:

```typescript
readonly canCheckByPhone = computed(() =>
    this.auth.userHasRole(['admin', 'direction', 'manager'])
);
```

### 3.2. Các quyền còn lại

Các role như `staff`, `doi-tac`, `doi-tac-cv`, `reviewer` và role khác:

- Chỉ kiểm tra theo CCCD.
- Không hiển thị ô Số điện thoại tại màn hình kiểm tra.
- Không gửi số điện thoại trong request kiểm tra.
- Trường Số điện thoại bên trong form đăng ký vẫn giữ nguyên vì đây là dữ liệu hồ sơ, không phải giao diện kiểm tra.

### 3.3. Ma trận hành vi

| Nhóm quyền | Ô CCCD | Ô SĐT tại màn kiểm tra | Request kiểm tra |
|---|---:|---:|---|
| `admin`, `direction`, `manager` | Hiện | Hiện | `{ cccd }`, `{ phone }` hoặc `{ cccd, phone }` |
| Quyền khác | Hiện | Ẩn hoàn toàn | `{ cccd }` |

---

## 4. Giao diện kiểm tra mới

### 4.1. Admin, Director, Manager

```text
┌──────────────────────────────────────────────────────┐
│ Kiểm tra hồ sơ                                      │
│                                                      │
│ [ Nhập số CCCD             ]                         │
│ [ Nhập số điện thoại       ] [ Kiểm tra ]           │
└──────────────────────────────────────────────────────┘
```

Yêu cầu validation:

- Phải nhập ít nhất một trong hai trường CCCD hoặc Số điện thoại.
- Nếu nhập CCCD, giá trị phải đúng 12 chữ số.
- Nếu nhập Số điện thoại, giá trị phải đúng định dạng đang dùng trong form: `^(0[35789])(\d{8})$`.
- Nếu nhập cả hai, request dùng đồng thời CCCD và Số điện thoại để kiểm tra.
- Nút Kiểm tra bị disable khi request đang chạy hoặc cả hai trường đều trống.
- Enter tại một trong hai ô sẽ chạy kiểm tra nếu dữ liệu đã nhập hợp lệ.

### 4.2. Các quyền khác

```text
┌──────────────────────────────────────────────────────┐
│ Kiểm tra CCCD                                       │
│                                                      │
│ [ Nhập số CCCD             ] [ Kiểm tra ]           │
└──────────────────────────────────────────────────────┘
```

Không render ô Số điện thoại, label, placeholder, lỗi validation hoặc khoảng trống layout liên quan đến SĐT.

---

## 5. Contract kiểm tra hồ sơ

Backend API do người dùng bổ sung. Frontend không tự quyết định URL hoặc response cuối cùng trước khi có contract chính thức.

Contract frontend cần hỗ trợ về mặt logic:

```typescript
interface HosoCheckRequest {
    cccd?: string;
    phone?: string;
}

type HosoCheckResult =
    | { found: false }
    | { found: true; record: HosoThisinh };
```

Quy tắc tạo request:

```text
canCheckByPhone = true
    → gửi field đã nhập: CCCD, SĐT hoặc cả hai

canCheckByPhone = false
    → bắt buộc và chỉ gửi CCCD
```

Khi backend API hoàn thành, cần xác nhận:

- Tên endpoint.
- HTTP method.
- Tên field request: `cccd`, `phone` hoặc tên khác.
- Response khi không tìm thấy.
- Response khi CCCD và SĐT thuộc hai hồ sơ khác nhau.
- Quy tắc xử lý hồ sơ có trạng thái `bo_hoc`.
- Mã lỗi và message cần hiển thị.

Không coi lỗi mạng/API là “không tìm thấy hồ sơ”. Lỗi phải giữ màn kiểm tra và hiển thị thông báo thất bại.

---

## 6. Luồng kiểm tra dự kiến

```text
Mở component
    │
    ├── Có data edit
    │      └── Load danh mục → mở form edit
    │
    └── Tạo mới
           └── Load danh mục → mở màn kiểm tra
                                  │
                                  ├── Nhóm đặc quyền
                                  │      └── nhập CCCD hoặc SĐT hoặc cả hai
                                  │
                                  └── Nhóm khác
                                         └── nhập CCCD
                                                │
                                                ▼
                                         Gọi API kiểm tra
                                                │
                   ┌────────────────────────────┼───────────────────────────┐
                   │                            │                           │
             Không tìm thấy             Hồ sơ `bo_hoc`              Hồ sơ đang tồn tại
                   │                            │                           │
                   └──────────────► Mở form tạo mới          Hiện thông tin hồ sơ cũ
                                      │                           │
                                      ├── patch CCCD             └── Quay lại kiểm tra
                                      └── patch SĐT nếu có
```

Khi mở form tạo mới:

- Luôn patch CCCD đã kiểm tra vào `formData.cccd`.
- Nhóm đặc quyền: patch SĐT đã kiểm tra vào `formData.phone`.
- Nhóm khác: trường `formData.phone` để người dùng nhập trong form.
- Không patch `majorId`/`programId` từ parent vì `HosoThemV2Component` hiện không còn bước chọn ngành/CTĐT.

---

## 7. Chuyển nguồn Ngành học và Chương trình đào tạo

### 7.1. Hiện trạng

`FormThongtinDangkyComponent` hiện đang:

- Inject `ApiOutsiteService`.
- Gọi `apiOutsite.getNganhList()`.
- Lọc bản ghi có `type === 'nganh'`.
- Chỉ hiển thị select Ngành học.
- Có form control `ctdt_id`, nhưng chưa có select Chương trình đào tạo trong HTML.

### 7.2. Nguồn mới từ server

| Dữ liệu | Service nội bộ | Resource hiện tại |
|---|---|---|
| Ngành học | `NganhhocService` | `nganh-hoc` |
| Chương trình đào tạo | `ChuongtrinhDaotaoService` | `chuongtrinh-daotao` |

Thay đổi dự kiến:

- Bỏ `ApiOutsiteService` khỏi component.
- Load ngành bằng `NganhhocService.load({ search: '' }, { limit: -1 })`.
- Load chương trình bằng `ChuongtrinhDaotaoService.query(...)` hoặc `load(...)`.
- Chỉ lấy bản ghi đang hoạt động nếu server/API hỗ trợ `is_active`.
- Map dữ liệu server sang dropdown option; không phụ thuộc cấu trúc `title/type` của API ngoài.

Mapping:

```typescript
Nganhhoc
    → { value: major.id, label: major.name }

ChuongtrinhDaotao
    → { value: program.id, label: `${program.code} — ${program.name}` }
```

### 7.3. Quan hệ Ngành học — Chương trình đào tạo

- Thêm signal danh sách chương trình đào tạo.
- Hiển thị select Chương trình đào tạo với `formControlName="ctdt_id"`.
- Khi chọn Ngành học, reset `ctdt_id` rồi lấy chương trình theo `major_id`.
- Khi chưa chọn ngành, select CTĐT bị disable hoặc có danh sách rỗng.
- Edit mode: load ngành, sau đó load CTĐT theo `nganh_id`, cuối cùng patch `ctdt_id`.
- Lỗi load CTĐT không được làm mất dữ liệu các danh mục đã tải thành công; hiển thị thông báo phù hợp.

Luồng:

```text
Load Ngành học từ server
    │
    ▼
Chọn nganh_id
    │
    ├── reset ctdt_id
    └── gọi ChuongtrinhDaotaoService.load(..., nganh_id)
              │
              ▼
       Hiển thị danh sách CTĐT thuộc ngành
```

---

## 8. Nội dung form hiện tại cần giữ và chuẩn hóa

Tài liệu này phản ánh các field hiện đang có trong component sau các chỉnh sửa gần nhất.

### I. Thông tin cá nhân

| Field | Nội dung | Validation hiện tại |
|---|---|---|
| `anh_the` | Ảnh thẻ | Hiển thị bắt buộc |
| `full_name` | Họ và tên | required, minLength(2) |
| `birthday` | Ngày sinh | required |
| `gioi_tinh` | Giới tính | required |
| `dan_toc` | Dân tộc | required |
| `phone` | Số điện thoại hồ sơ | required, đúng số di động 10 chữ số |
| `email` | Email | email |
| `noi_sinh` | Nơi sinh | UI đang hiển thị bắt buộc |
| `tinh_id` | Tỉnh/Thành phố thường trú | UI đang hiển thị bắt buộc |
| `xa_id` | Xã/Phường thường trú | UI đang hiển thị bắt buộc |
| `address` | Địa chỉ chi tiết | UI đang hiển thị bắt buộc |

### II. CCCD

| Field | Nội dung | Ghi chú |
|---|---|---|
| `cccd` | Số CCCD | required, 12 chữ số; readonly với quyền ngoài nhóm đặc quyền |
| `cccd_ngaycap` | Ngày cấp | input mask dd/mm/yyyy |
| `cccd_noicap` | Nơi cấp | danh mục nơi cấp |
| `cccd_mattruoc` | CCCD mặt trước | ảnh |
| `cccd_matsau` | CCCD mặt sau | ảnh |

### III. Bằng tốt nghiệp THPT / TH nghề / GCN hoàn thành kiến thức văn hóa THPT

| Field | Nội dung |
|---|---|
| `tn_vanbang` | Loại văn bằng |
| `tn_nam` | Năm tốt nghiệp |
| `tn_noicap` | Nơi cấp bằng |

### IV. Văn bằng chuyên môn đã tốt nghiệp

| Field | Nội dung |
|---|---|
| `vb_chuyenmon_sohieu` | Số hiệu văn bằng |
| `vb_chuyenmon_nganh` | Ngành tốt nghiệp |
| `vb_chuyenmon_noicap` | Nơi cấp |
| `vb_chuyenmon_nam` | Năm tốt nghiệp |
| `vb_chuyenmon` | Dữ liệu văn bằng chuyên môn hiện có trong model/form |

### V. Thông tin bổ sung

| Field | Nội dung | Hành vi dự kiến |
|---|---|---|
| `nganh_id` | Ngành đăng ký | Lấy từ server nội bộ |
| `ctdt_id` | Chương trình đào tạo | Thêm select, lọc theo `nganh_id` |
| `dot_xet_tuyen_id` | Đợt xét tuyển | Lấy đợt đang mở, select disabled theo hiện trạng |
| `type_diem` | Loại điểm | THPT hoặc Trung cấp/Cao đẳng/Đại học |
| `diemtb` | Điểm trung bình | Chỉ hiện khi loại điểm là THPT |
| `content` | Nội dung/Ghi chú | textarea |
| `nguoi_tuvan_id` | Người tư vấn | Hiện theo quyền hiện tại |

### VI. Hình ảnh hồ sơ

| Field | Nội dung |
|---|---|
| `anh_phieu_dang_ky` | Ảnh phiếu đăng ký |
| `anh_thpt` | Ảnh bằng tốt nghiệp THPT/BTVH |
| `anh_hoc_ba` | Nhiều ảnh bằng, bảng điểm TC/CĐ/ĐH và học bạ THPT/BTVH |

### System fields

| Field | Giá trị/hành vi |
|---|---|
| `status` | mặc định `cho_duyet` |
| `owner_by` | mặc định user hiện tại |

---

## 9. ViewState sau cập nhật

```typescript
type ViewState = 'loading' | 'error' | 'cccd_check' | 'existing' | 'form';
```

| State | Nội dung |
|---|---|
| `loading` | Đang tải danh mục ban đầu |
| `error` | Không tải được dữ liệu bắt buộc, có nút Tải lại |
| `cccd_check` | Màn kiểm tra theo ma trận quyền |
| `existing` | Hiện hồ sơ đã tồn tại |
| `form` | Form tạo mới hoặc cập nhật |

Không thêm state riêng cho kiểm tra CCCD + SĐT. Giao diện trong `cccd_check` thay đổi bằng `canCheckByPhone()`.

---

## 10. Input/Output và parent

Giữ API component hiện tại trong giai đoạn này:

```typescript
readonly data      = input<HosoThisinh | null>(null);
readonly majorId   = input<number | null>(null);
readonly programId = input<number | null>(null);
readonly saved     = output<void>();
readonly cancel    = output<void>();
```

`HosoThemV2Component` hiện render component trực tiếp, không truyền `majorId` và `programId`. Vì vậy:

- Ngành và CTĐT phải được chọn ngay trong form.
- Không phụ thuộc parent để load hoặc patch Ngành/CTĐT.
- Nút Reset của parent tiếp tục gọi `resetForm()` của child.

Có thể loại bỏ `majorId`/`programId` ở một đợt refactor riêng nếu xác nhận không còn parent nào sử dụng; không nằm trong thay đổi bắt buộc lần này.

---

## 11. Các điểm cần sửa khi triển khai

Các vấn đề quan sát được trong source hiện tại:

1. Tài liệu cũ dùng `nganh_dangky`/`program_id`, nhưng form hiện tại dùng `nganh_id`/`ctdt_id`.
2. HTML chưa có select cho `ctdt_id`.
3. Ô “Số hiệu văn bằng” tại Section IV đang bind nhầm `vb_chuyenmon_nganh`; cần bind `vb_chuyenmon_sohieu`.
4. `getFormData()` đang map `tn_vanbang` từ `van_bang_tn`; cần đối chiếu đúng field model/backend trước khi sửa.
5. `getFormData()` đang map `vb_chuyenmon_sohieu` từ `vb_tn_sohieu`; cần đối chiếu đúng field backend.
6. Một số label có dấu bắt buộc nhưng FormControl chưa có `Validators.required`; cần xác nhận nghiệp vụ, không tự thêm validator ngoài yêu cầu.
7. `checkCccd()` hiện dùng `catchError(...found: false)`, có thể biến lỗi API thành cho phép tạo hồ sơ mới; cần bỏ hành vi này khi nối API kiểm tra mới.
8. `userList.forEach(...)` đang mutate object user; khi sửa nên map sang object mới.
9. `TuyensinhStatusService` đang inject nhưng luồng submit hiện tại không sử dụng.
10. Role nghiệp vụ gọi “director”, source hiện dùng `direction`; cần giữ thống nhất với backend.

Các điểm 3–9 chỉ triển khai sau khi được xác nhận cùng phạm vi; tài liệu ghi nhận để tránh bỏ sót hoặc tự sửa ngoài yêu cầu.

---

## 12. Tiêu chí nghiệm thu sau khi code được duyệt

### Phân quyền

- `admin`, `direction`, `manager` thấy ô CCCD và SĐT tại màn kiểm tra.
- Nhóm đặc quyền có thể kiểm tra bằng CCCD, SĐT hoặc cả hai; không thể kiểm tra khi cả hai đều trống.
- Trường nào được nhập phải đúng định dạng của trường đó.
- Quyền khác chỉ thấy ô CCCD; DOM không chứa giao diện SĐT của màn kiểm tra.
- Quyền khác không gửi field SĐT trong request kiểm tra.

### Luồng hồ sơ

- Không tìm thấy hoặc hồ sơ `bo_hoc`: mở form tạo mới đúng dữ liệu đã kiểm tra.
- Hồ sơ đang tồn tại: hiển thị card thông tin, không mở form tạo mới.
- Lỗi API: giữ màn kiểm tra, không coi là hồ sơ chưa tồn tại.

### Danh mục

- Không còn gọi `ApiOutsiteService` trong component.
- Ngành học lấy từ `NganhhocService`.
- CTĐT lấy từ `ChuongtrinhDaotaoService`.
- Chọn ngành chỉ hiển thị CTĐT thuộc ngành đó.
- Edit mode khôi phục đúng `nganh_id` và `ctdt_id`.

### Form/UI

- Nội dung sáu section khớp bảng field trong tài liệu.
- Responsive không tạo khoảng trống khi ô SĐT kiểm tra bị ẩn.
- Submit, reset, existing record và edit mode không hồi quy.
- Unit test cho ma trận role, request payload, validation và cascade Ngành–CTĐT.
- Build Angular thành công.
- Kiểm tra trực tiếp trên trình duyệt với ít nhất một tài khoản đặc quyền và một tài khoản thường.

---

## 13. Thứ tự triển khai sau khi duyệt

1. Bổ sung test cho phân quyền và payload kiểm tra.
2. Chốt contract API kiểm tra do backend cung cấp.
3. Cập nhật state và giao diện CCCD/SĐT theo quyền.
4. Thay `ApiOutsiteService` bằng hai service nội bộ.
5. Thêm cascade Ngành học → Chương trình đào tạo.
6. Đồng bộ binding field đã xác nhận.
7. Chạy unit test, build và kiểm tra UI trên trình duyệt.
8. Code review trước khi hoàn thành.
