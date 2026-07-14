# Hồ sơ Tuyển sinh — Thiết kế & Preview

> File preview trước khi code. Review nội dung, sau đó phản hồi để triển khai.

## 1. Tổng quan

Module quản lý hồ sơ thí sinh (`hoso_thisinh`). Kế thừa pattern từ `NganhhocComponent`:
- Master list với table + search + filter + phân trang.
- Drawer form nhiều section (accordion).
- Quyền: `view / create / update / delete` theo `IctuPermissionControl`.

## 2. Routing

```
/admin/hoso-tuyensinh   →   HosoTuyensinhComponent
```

> Lưu ý: route hiện tại có typo dấu cách ở cuối (`'hoso-tuyensinh '`) — sẽ fix khi code.

## 3. Permission key

Mặc định dùng key `hoso-tuyensinh`. Nếu backend chưa có, fallback `nganh-chuongtrinh` rồi đổi sau.

## 4. Master list — Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ 📁 Danh sách hồ sơ tuyển sinh            [🔍 Search...] [🗑] [+] │
├──────────────────────────────────────────────────────────────────┤
│ ☐ # │ Họ tên │ SĐT       │ Ngành     │ Đợt   │ Trạng thái │ … │
│ ☐ 1 │ Nguyễn │ 09xx      │ CNTT      │ 2026A │ Chờ duyệt  │ … │
│ ☐ 2 │ Trần   │ 03xx      │ QTKD      │ 2026A │ Đã duyệt   │ … │
│ ☐ 3 │ Lê     │ 07xx      │ Điện      │ 2026B │ Nhập học   │ … │
└──────────────────────────────────────────────────────────────────┘
              [< 1 2 3 ... 10 >]
```

### Columns
| # | Field | Ghi chú |
|---|---|---|
| 1 | Checkbox | Xóa nhiều (cần quyền delete) |
| 2 | Index | STT theo paginator |
| 3 | Họ tên | `full_name` |
| 4 | SĐT | `phone` |
| 5 | Ngành | join `major_id` → tên ngành |
| 6 | Chương trình | join `chuongtrinh_daotao_id` |
| 7 | Đợt | join `dot_dangky_id` |
| 8 | Trạng thái | badge màu theo `status` |
| 9 | Nguồn | `nguon_dang_ky` |
| 10 | Người tư vấn | join `nguoi_tuvan_id` → tên user |
| 11 | Hành động | Xem / Sửa / Xóa |

### Filter nâng cao (toolbar)
- Tìm kiếm theo họ tên + SĐT (OR).
- Dropdown trạng thái.
- Dropdown đợt xét tuyển.
- Dropdown ngành.
- Dropdown người tư vấn.

### Action hàng loạt
- Xóa nhiều (confirm dialog).

## 5. Drawer form — Layout

Drawer width **800px**, header `Thêm mới / Cập nhật hồ sơ tuyển sinh`. Body chia 8 sections (accordion):

### 5.0. Luồng kiểm tra CCCD khi Thêm mới (MỚI)

Khi user click `[+]` / `Thêm mới` → **KHÔNG mở drawer ngay**. Mở **Dialog kiểm tra CCCD** trước:

```
┌──────────────────────────────────────────┐
│  🔍 Kiểm tra hồ sơ theo CCCD       [×]  │
├──────────────────────────────────────────┤
│                                          │
│  Số CCCD:  [____________________]        │
│                                          │
│            [ Hủy ]   [ Kiểm tra ]        │
└──────────────────────────────────────────┘
```

Sau khi bấm `Kiểm tra` → gọi `HosoThisinhService.checkCccd(cccd)`:

| Case | API response | Xử lý |
|---|---|---|
| 1 | **404 / không có bản ghi** | Đóng dialog → mở **drawer form trống** (status mặc định `cho_duyet`). CCCD pre-fill vào field §5.2. |
| 2 | **Có bản ghi** + `status = 'bo_hoc'` | Đóng dialog → mở **drawer form trống** để nhập hồ sơ mới (KHÔNG pre-fill data cũ). CCCD pre-fill vào field §5.2. |
| 3 | **Có bản ghi** + `status ≠ 'bo_hoc'` | **KHÔNG mở form**. Trong dialog hiển thị block thông tin read-only của hồ sơ hiện tại: Họ tên, SĐT, Ngành, Chương trình, Đợt, Trạng thái, Người tư vấn, Ngày tạo. Nút `[Đóng]`. Không cho thao tác tạo/sửa. |

**Lưu ý:**
- Case 1 + 2 đều mở form **trống** (không phải clone data cũ). CCCD được fill sẵn để không nhập lại.
- Case 3 chỉ xem thông tin, không cho thao tác — phù hợp với yêu cầu "không cho phép thao tác và hiển thị thông tin".
- Nếu API check fail (500/timeout) → toast lỗi, giữ dialog mở để retry.
- Service cần bổ sung: `checkCccd(cccd: string): Observable<HosoThisinh | null>`.

### 5.1. Thông tin cá nhân
| Field | Loại | Bắt buộc | Validation |
|---|---|---|---|
| Họ và tên | text | ✓ | 2–255 ký tự |
| Số điện thoại | text | ✓ | pattern VN, 10–11 số |
| Email | email | – | RFC email |
| Ngày sinh | date | – | – |
| Dân tộc | text | – | – |
| Nơi sinh | text | – | – |
| Tỉnh/TP | select | – | load `location.service` |
| Quận/Huyện | select | – | cascade theo Tỉnh |
| Xã/Phường | select | – | cascade theo Huyện |
| Địa chỉ chi tiết | textarea | – | số nhà, ngõ, đường |

### 5.2. CCCD
| Field | Loại | Bắt buộc |
|---|---|---|
| Số CCCD | text | – |
| Ngày cấp | date | – |
| Nơi cấp | text | – |
| Ảnh CCCD mặt trước | **upload-placeholder** | – |
| Ảnh CCCD mặt sau | **upload-placeholder** | – |

### 5.3. Xét tuyển
| Field | Loại | Bắt buộc |
|---|---|---|
| Ngành | select | – | cascade CTĐT |
| Chương trình đào tạo | select | – | theo ngành |
| Đợt xét tuyển | select | – | chỉ đợt `dang_mo` |
| Hình thức xét tuyển | select | – | `hoc_ba` / `thpt_quoc_gia` / `xet_tuyen_som` |
| Nguồn đăng ký | select | – | `website` / `doi_tac` / `truc_tiep` |

### 5.4. Văn bằng TN THPT
| Field | Loại | Bắt buộc |
|---|---|---|
| Loại văn bằng | text | – |
| Năm tốt nghiệp | text | – |
| Số hiệu | text | – |
| Điểm xét tuyển | number | – | decimal(5,2) |
| Ảnh văn bằng | **upload-placeholder** | – |

### 5.5. Văn bằng chuyên môn (trung cấp / CĐ / ĐH khác)
| Field | Loại | Bắt buộc |
|---|---|---|
| Văn bằng | text | – |
| Ngành học | text | – |
| Nơi cấp | text | – |

### 5.6. Hình ảnh khác
| Field | Loại | Bắt buộc |
|---|---|---|
| Ảnh thẻ | **upload-placeholder** | – |
| Ảnh phiếu đăng ký | **upload-placeholder** | – |
| Ảnh học bạ | **upload-placeholder FormArray** | – | tối đa N ảnh (đề xuất 10) |

### 5.7. Phân công & nguồn
| Field | Loại | Bắt buộc |
|---|---|---|
| Người sở hữu | number | auto = current user | hidden, set server-side |
| Người tư vấn | select user | – | lọc role `tuvan` |

### 5.8. Trạng thái
| Field | Loại | Bắt buộc |
|---|---|---|
| Trạng thái | select | ✓ | enum (xem §7) |

### Footer drawer
- `[Hủy]` — đóng drawer.
- `[Lưu lại]` — disabled khi form invalid, gọi `IctuFormControl2.submit()`.

## 6. Upload Placeholder

Component con `app-upload-placeholder` (standalone). Input:
- `label: string` — tiêu đề hiển thị.
- `maxCount?: number` — số ảnh tối đa (1 cho single, ≥2 cho multi).
- `accept?: string` — mặc định `image/*`.

Render:
```
┌──────────────────────────────────┐
│  📷  [LABEL]                     │
│  Khu vực upload ảnh              │
│  — chờ thiết kế —                │
│  [ Upload ảnh ]   (disabled)     │
└──────────────────────────────────┘
```

Visual:
- Border dashed 2px `--color-border` (fallback `#d4d4d8`).
- Background `--color-bg-muted` (fallback `#fafafa`).
- Icon cloud-upload (PrimeIcons `pi pi-cloud-upload`).
- Cursor `not-allowed` trên button.

Output:
- `(filesChanged) = EventEmitter<File[]>` — emit `[]` ngay khi khởi tạo, không có handler thật.

Sau này user design xong → thay component này bằng component upload thật (vd. `ngx-image-cropper` + `ictu-file.service`) mà không phải sửa form.

## 7. Status enum (đề xuất — chờ backend confirm)

```ts
type HosoStatus =
  | 'cho_duyet'    // Chờ duyệt
  | 'da_duyet'     // Đã duyệt
  | 'da_nhap_hoc'  // Đã nhập học
  | 'bo_hoc'       // Bỏ học — đặc biệt: cho phép tạo hồ sơ mới cùng CCCD
  | 'huy';         // Hủy
```

| Status | Badge color |
|---|---|
| `cho_duyet` | secondary (xám) |
| `da_duyet` | success (xanh lá) |
| `da_nhap_hoc` | primary (xanh dương) |
| `bo_hoc` | warning (vàng/cam) |
| `huy` | danger (đỏ) |

> **Quy tắc nghiệp vụ:** Hồ sơ có status `bo_hoc` không bị xóa khỏi DB — được giữ làm lịch sử. Khi thí sinh quay lại đăng ký, tạo bản ghi mới với cùng CCCD. Các status còn lại (`cho_duyet / da_duyet / da_nhap_hoc / huy`) đều chặn tạo mới trùng CCCD.

## 8. API endpoints (giả định)

> **Cần user xác nhận base path** trước khi code.

```
GET    /api/hoso-thisinh?limit=&paged=&search=&status=&dot_dangky_id=&major_id=&nguoi_tuvan_id=
GET    /api/hoso-thisinh/:id
POST   /api/hoso-thisinh
PUT    /api/hoso-thisinh/:id
DELETE /api/hoso-thisinh/:id
```

Reuse:
- `IctuBaseServiceClass<T>` cho CRUD.
- `ictu-file.service.ts` cho upload ảnh (sau khi thay placeholder).
- `location.service.ts` cho cascade Tỉnh/Huyện/Xã.
- Service `nganhhoc.service.ts` + `chuongtrinh-daotao.service.ts` + `dot-xettuyen.service.ts` cho dropdown lookup.

## 9. Files dự kiến tạo / sửa

| Action | Path |
|---|---|
| **Sửa** | `frontend/src/app/pages/admin/children/hoso-tuyensinh/hoso-tuyensinh.component.ts` |
| **Sửa** | `frontend/src/app/pages/admin/children/hoso-tuyensinh/hoso-tuyensinh.component.html` |
| **Sửa** | `frontend/src/app/pages/admin/children/hoso-tuyensinh/hoso-tuyensinh.component.css` |
| **Tạo** | `frontend/src/app/pages/admin/children/hoso-tuyensinh/upload-placeholder/upload-placeholder.component.ts` |
| **Tạo** | `frontend/src/app/pages/admin/children/hoso-tuyensinh/upload-placeholder/upload-placeholder.component.html` |
| **Tạo** | `frontend/src/app/pages/admin/children/hoso-tuyensinh/upload-placeholder/upload-placeholder.component.css` |
| **Sửa** | `frontend/src/app/pages/admin/admin-routing.module.ts` (fix typo path) |

Không cần tạo model/service mới — đã có sẵn `HosoThisinh` + `HosoThisinhService`.

## 10. Câu hỏi chờ user

1. **API base path** — `hoso-thisinh` hay `hoso-tuyensinh`?
2. **Permission key** — đã có `hoso-tuyensinh` trong `UserPermission` chưa?
3. **Status enum** — bộ đề xuất ở §7 khớp backend không?
4. **anh_hoc_ba[] giới hạn** — max bao nhiêu ảnh?
5. **Đồng ý layout** — accordion 8 sections hay stepper / tab ngang?

---

**WAITING FOR CONFIRMATION** — Sau khi user review file này + trả lời 5 câu hỏi, tiến hành code.
