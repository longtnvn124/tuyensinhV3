# Hội đồng xét tuyển — Tài liệu kỹ thuật

## 1. Mục tiêu

Module `hoidong-xettuyen` quản lý **hội đồng xét tuyển** thuộc một **đợt xét tuyển** (`dot_dangky_id`) trong hệ thống tuyển sinh. Mỗi hội đồng có thể được gán nhiều **hồ sơ thí sinh** (`hoso-thisinh`) thông qua bảng trung gian `hoidong-hoso-thisinh`. Hội đồng chịu trách nhiệm đánh giá và đưa ra kết quả **trúng tuyển / không trúng tuyển** cho từng hồ sơ được phân công.

Layout tổng thể:
- **Master view**: danh sách hội đồng (table với search + paginate + bulk-delete).
- **Master form drawer** (600px): thêm/sửa thông tin hội đồng.
- **Detail drawer** (100vw): quản lý hồ sơ được gán cho hội đồng (assign + đánh giá `ket_qua`).

## 2. Cấu trúc dữ liệu

### `HoidongXettuyen` (`models/tuyensinh/hoidong-xettuyen.ts`)
```ts
interface HoidongXettuyen extends IctuBaseModel {
    id: number;
    name: string;
    dot_dangky_id: number;
    thoi_gian_xet_tuyen: string;   // ISO datetime
    status: 'dang_mo' | 'da_dong';
}
```

### `HoidongHosoThisinh` (`models/tuyensinh/hoidong-hoso-thisinh.ts`)
```ts
interface HoidongHosoThisinh extends IctuBaseModel {
    id: number;
    hoidong_id: number;
    registration_id: number;
    ket_qua: 'trung_tuyen' | 'khong_trung_tuyen' | '';
    ghi_chu?: string;
}
```

### `HosoThisinh` (`models/tuyensinh/hoso-thisinh.ts`)
- 44 trường mô tả hồ sơ cá nhân — xem file để biết chi tiết.

### `DotXettuyen` (tham chiếu)
- `{ id, name, thoi_gian_bat_dau, thoi_gian_ket_thuc, mo_ta?, status }` — chỉ dùng `name` làm dropdown label.

## 3. Phân quyền

- Permission key: **`hoidong-xettuyen`**.
- Áp dụng cho cả master CRUD và detail (gán/xóa/đánh giá hồ sơ).
- `IctuPermissionControl` cung cấp 4 cờ: `canView`, `canCreate`, `canUpdate`, `canDelete`.

| Hành động | canView | canCreate | canUpdate | canDelete |
|---|---|---|---|---|
| Xem bảng | ✓ | | | |
| Gán hồ sơ | | | ✓ | |
| Đổi kết quả / ghi chú | | | ✓ | |
| Xóa hồ sơ khỏi hội đồng | | | | ✓ |
| Thêm/sửa hội đồng | | ✓ | ✓ | |
| Xóa hội đồng | | | | ✓ |

## 4. REST API

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `tuyensinh/api/hoidong-xettuyen?search&paged&limit&order&orderby` | List + paginate |
| `POST` | `tuyensinh/api/hoidong-xettuyen` | Create |
| `PUT` | `tuyensinh/api/hoidong-xettuyen/:id` | Update |
| `DELETE` | `tuyensinh/api/hoidong-xettuyen/:id` | Delete (soft) |
| `GET` | `tuyensinh/api/hoidong-xettuyen/hoso-thisinh?hoidong_id&paged&limit` | Danh sách hồ sơ được gán |
| `POST` | `tuyensinh/api/hoidong-xettuyen` (`{hoidong_id, registration_id}`) | Gán hồ sơ |
| `DELETE` | `tuyensinh/api/hoidong-xettuyen/:id` (id của row gán) | Bỏ gán hồ sơ |
| `PUT` | `tuyensinh/api/hoidong-xettuyen/:id` (`{ket_qua?, ghi_chu?}`) | Cập nhật kết quả |
| `GET` | `tuyensinh/api/hoso-thisinh?search&paged&limit` | Tra cứu thí sinh cho dialog gán |
| `GET` | `tuyensinh/api/dot-xettuyen?limit=100` | Dropdown đợt xét tuyển |

## 5. Cấu trúc files

```
src/app/
├── models/tuyensinh/
│   ├── hoidong-xettuyen.ts          ← interface HoidongXettuyen
│   ├── hoidong-hoso-thisinh.ts      ← interface HoidongHosoThisinh
│   └── hoso-thisinh.ts              ← interface HosoThisinh
├── services/tuyensinh/
│   ├── hoidong-xettuyen.service.ts  ← master CRUD + sub-resource ops
│   └── hoso-thisinh.service.ts      ← search candidates
└── pages/admin/children/hoidong-xettuyen/
    ├── hoidong-xettuyen.component.ts        ← master CRUD
    ├── hoidong-xettuyen.component.html
    ├── hoidong-xettuyen.component.css
    ├── hoso-list/
    │   ├── hoso-list.component.ts           ← detail: assign + đánh giá
    │   ├── hoso-list.component.html
    │   └── hoso-list.component.css
    └── hoidongxettuyen.md                   ← file này
```

## 6. Khác biệt so với template tham chiếu

### So với `nganh-hoc` (master + detail cùng cấp)
- `nganh-hoc` có 2 drawers nặng như nhau; `hoidong-xettuyen` master chỉ có 1 drawer form nhỏ (600px), detail drawer 100vw.
- Child component được truyền vào drawer qua property `[hoidong]` (signal getter), không phải `@Input()` đơn thuần — cho phép reset state khi drawer đóng.

### So với `dot-xettuyen` (single-drawer CRUD)
- Thêm 1 drawer detail + 1 sub-component `hoso-list`.
- Dropdown `dot_dangky_id` lazy-load qua `DotXettuyenService` chỉ khi mở form (cache trong signal).

### So với `nganh-hoc/chuongtrinh-daotao` (sub-component nhận `@Input`)
- ChuongtrinhDaotao dùng `@Input set nganh(item)` + `ngOnChanges` để reload.
- HosoList cũng dùng cùng pattern: `ngOnChanges` → `loadData(1, true)` khi `hoidong?.id` thay đổi.

## 7. UX Flow

### Master CRUD
1. Mở trang → `ngOnInit` → `loadData(1, true)` → table fill.
2. Search → Enter → `loadData(1, true)`.
3. Click "Thêm" → `OPEN_FORM_ADD` → reset form → load `dotOptions` (lazy, cache) → mở master drawer 600px.
4. Click icon `ti-edit` → `OPEN_FORM_UPDATE` → reset form với data → load `dotOptions` → mở drawer.
5. Submit → `SUBMIT_FORM` → `formControl.canSubmit` (form valid + state READY) → `service.create/update` → reload.
6. Click `ti-users` (icon "Quản lý hồ sơ") → mở **detail drawer 100vw** với `HosoListComponent`.

### Detail (assign hồ sơ)
1. `HosoListComponent.ngOnChanges` detect `hoidong` thay đổi → `forkJoin` 2 calls song song:
   - `getAssignedHoso(hoidongId)` → rows.
   - `hosoService.load({search:''}, {limit:500})` → cache `Map<registrationId, HosoThisinh>` để lookup tên/SĐT.
2. Click "Gán hồ sơ" → mở `p-dialog` 720px.
   - Search → Enter → `loadCandidates()` filter ra thí sinh chưa được gán.
   - Checkbox multi-select → `confirmAssign()` → loop `service.assignHoso()` song song, đếm success/failed → toast + reload.
3. Inline edit `ket_qua` (p-select) → `changeKetQua()` → `service.updateKetQua()` → update local row.
4. Inline edit `ghi_chu` (input blur) → `updateGhiChu()` → `service.updateKetQua()`.
5. Click `ti-trash` trên 1 row → `removeAssigned()` → `confirmDelete` → `service.removeAssignedHoso(row.id)`.

## 8. CSS

- Master component CSS kế thừa verbatim từ `nganh-hoc.component.css`:
  - `.admin-wrap-table`, `.wrap-tb > table > thead { sticky }`, `.ictu-p-drawer__content { flex column; justify-content space-between }`.
  - `.ictu-form__row--date { grid 1fr 1fr }`, p-datepicker full-width fix.
  - `.ictu-form__hint`, `.ictu-form__error`.
- `hoso-list.component.css` dùng prefix `.hsl-*` (scope local) để tránh đụng master.
- Layout tổng thể dựa trên `.ctd-page` của `chuongtrinh-daotao` (flex column, sticky scroll, toolbar).

## 9. Rủi ro & lưu ý

1. **Race condition khi gán nhiều hồ sơ**: `confirmAssign()` chạy song song N request, dùng counter `success+failed===total` để biết khi nào xong. Có thể fail một phần nếu 1 trong các candidate đã được gán vào hội đồng khác.
2. **`p-dialog` lazy state**: mỗi lần mở dialog phải `loadCandidates()` lại để loại trừ thí sinh vừa được gán — tránh stale data.
3. **`updateKetQua` partial payload**: dùng cùng endpoint PUT với payload `{ket_qua?}` hoặc `{ghi_chu?}` — backend phải hỗ trợ PATCH-like update từng phần.
4. **Dropdown `dotOptions` cache**: chỉ load 1 lần đầu tiên khi mở form. Nếu admin thêm đợt mới phải refresh trang.
5. **Inline edit không undo**: thay đổi `ket_qua`/`ghi_chu` tự động lưu khi blur/change — không có step "Hủy".

## 10. Ghi chú cho backend

- Bảng `hoidong_hoso_thisinh` cần unique constraint `(hoidong_id, registration_id)` để chặn trùng.
- Endpoint `PUT /hoidong-xettuyen/:id` phải PATCH-like (chỉ update field có trong payload), vì frontend dùng cùng endpoint cho cả `ket_qua` và `ghi_chu`.
- `delete` hội đồng cần cascade hoặc check `hoidong_hoso_thisinh` còn rows không — hiện tại frontend không cảnh báo trước.

## 11. Độ phức tạp

| Phần | Files | LOC ước tính |
|---|---|---|
| Model | 2 | ~30 |
| Service | 2 | ~120 |
| Master component | 3 | ~400 |
| Detail component | 3 | ~500 |
| Routing + doc | 2 | ~80 |
| **Tổng** | **12** | **~1130** |

Trung bình — phù hợp 1 ngày làm việc cho dev Angular quen codebase.
