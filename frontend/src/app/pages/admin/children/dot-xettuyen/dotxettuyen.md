# Plan: Quản lý đợt xét tuyển (dot-xettuyen)

> Trạng thái: **Đã hoàn thành** theo kế hoạch, đã đổi tên từ `dot-tuyensinh` → `dot-xettuyen`.

## 1. Mục tiêu
Xây dựng trang quản lý **đợt xét tuyển** trong admin, **kế thừa 100% pattern** từ `nganh-hoc` (master table + drawer form + service + permission control).

## 2. Schema nghiệp vụ (database.md §3.3, §7.3)

```ts
interface DotXettuyen {
    id: number;
    name: string;
    thoi_gian_bat_dau: string; // ISO datetime
    thoi_gian_ket_thuc: string; // ISO datetime
    mo_ta?: string;
    status: string; // "dang_mo" | "da_dong"
}
```

**Rule nghiệp vụ** (du-an.md §5.3): chỉ tối đa 1 đợt `dang_mo` tại 1 thời điểm — backend tự đóng các đợt khác khi activate 1 đợt mới.

## 3. Phân quyền
- `admin`, `manager` (thêm/sửa/xóa).
- `direction` (xem + thao tác).
- Permission key: `dot-xettuyen`.

## 4. API
- `tuyensinh/api/dot-xettuyen` — CRUD chuẩn theo FRONTEND_API_GUIDE.md §3.

## 5. Files (hiện trạng)

| File | Trạng thái |
|---|---|
| `models/tuyensinh/dot-xettuyen.ts` | ✅ Interface `DotXettuyen` |
| `services/tuyensinh/dot-xettuyen.service.ts` | ✅ Class `DotXettuyenService`, endpoint `dot-xettuyen` |
| `pages/admin/children/dot-xettuyen/dot-xettuyen.component.ts` | ✅ Class `DotXettuyenComponent`, selector `app-dot-xettuyen` |
| `pages/admin/children/dot-xettuyen/dot-xettuyen.component.html` | ✅ Drawer form 420px |
| `pages/admin/children/dot-xettuyen/dot-xettuyen.component.css` | ✅ Đã fix layout drawer |
| `pages/admin/admin-routing.module.ts` | ✅ Route `dot-xettuyen` |

## 6. Khác biệt so với nganh-hoc

| Mục | nganh-hoc | dot-xettuyen |
|---|---|---|
| Model | `Nganhhoc` | `DotXettuyen` |
| Service endpoint | `nganh-hoc` | `dot-xettuyen` |
| Fields | name, code, description, is_active | name, thoi_gian_bat_dau, thoi_gian_ket_thuc, mo_ta, status |
| Status type | `number` (0/1) | `string` (`dang_mo`/`da_dong`) |
| Date picker | không | 2x `<p-datepicker>` vi-VN |
| Validator | không | `dateRangeValidator`: bắt đầu < kết thúc |
| Permission key | `nganh-chuongtrinh` | `dot-xettuyen` |
| Toast messages | "ngành học" | "đợt xét tuyển" |
| Table column | Mã ngành / Tên ngành | Tên đợt / Thời gian (Từ → Đến) |

## 7. UX

- Table columns: `#` | `Tên đợt` | `Thời gian (Từ → Đến)` | `Trạng thái` | `Hành động`.
- Drawer form 420px:
  - Tên đợt (`*`)
  - Row 2 cột: `Thời gian bắt đầu` (`*`) | `Thời gian kết thúc` (`*`)
  - Mô tả (textarea)
  - Trạng thái (dropdown: Đang mở / Đã đóng)
  - Hint nhỏ: *"Chỉ 1 đợt có thể đang mở tại 1 thời điểm. Khi kích hoạt đợt mới, các đợt đang mở khác sẽ tự đóng."*
- Footer drawer: `Hủy` (secondary) + `Lưu lại` (primary).

## 8. CSS layout fix (đã sửa)

**Triệu chứng:** Footer buttons nằm ngang hàng với form, form input bị co hẹp ~40%, datepicker chỉ hiển thị icon.

**Nguyên nhân:**
- `.ictu-p-drawer__content` thiếu `flex-direction: column`, rule cũ `flex-direction: unset` reset về `row`.
- Selector `:is(p-datepicker, .p-datepicker, .p-inputtext)` không match `.p-datepicker-input` (class thật của input trong PrimeNG).

**Fix đã áp dụng:**
- `.ictu-p-drawer__content`: `display: flex; flex-direction: column; justify-content: space-between; height: 100%;`
- `.ictu-p-drawer__content__body`: `flex: 1 1 auto; overflow-y: auto;`
- `.ictu-p-drawer__content__footer`: `flex-shrink: 0` để không bị body đẩy lệch.
- Datepicker: tách thành selector trực tiếp `p-datepicker > .p-datepicker` + `.p-datepicker-input`.

**Lần 2 — fix row date bị co hẹp về 1 cột:**
- Triệu chứng: 2 cột `Thời gian bắt đầu` / `Thời gian kết thúc` xếp dọc thay vì ngang, datepicker chỉ hiển thị icon.
- Nguyên nhân:
  - Rule global `.ictu-form__row { display:flex; flex-direction:column }` trong `dashboard.css` (specificity 0,1,0) đè lên local `.ictu-form__row--date { display:grid }` (cùng 0,1,0, sau nên thua).
  - Selector descendant `p-datepicker .p-datepicker-input` không xuyên được view-encapsulation của component.
- Fix:
  - Selector nối chuỗi: `.ictu-form__row.ictu-form__row--date` → specificity 0,2,0 thắng global.
  - Thêm `flex-direction: initial` để reset hướng flex thừa hưởng từ global.
  - Dùng `::ng-deep` để pierce encapsulation, target được `.p-datepicker-input` của PrimeNG.
  - Thêm `min-width: 0` cho grid cell để tránh overflow khi nội dung dài.

## 9. Risks

| Mức | Rủi ro | Mitigation |
|---|---|---|
| MEDIUM | `p-datepicker` locale `vi-VN` chưa config | Set `[locale]="viVN"` |
| MEDIUM | Backend chưa enforce rule 1 active | UI cho phép toggle; backend trả error → toast |
| LOW | Timezone khi gửi date | Gửi ISO string |
| LOW | `status` string vs number convention cũ | Theo model interface — string |

## 10. Lưu ý khi tích hợp backend
- Permission key đã đổi từ `dot-tuyensinh` → `dot-xettuyen` — nhớ update seed permission tương ứng.
- Endpoint REST đổi từ `dot-tuyensinh` → `dot-xettuyen` — backend router phải match.
- DB column không đổi (`thoi_gian_bat_dau`, `thoi_gian_ket_thuc`, `mo_ta`, `status`) — chỉ đổi tên domain phía FE.

## 11. Complexity
**LOW** (~1.5–2 giờ). 90% logic kế thừa nguyên từ `nganh-hoc`, chỉ đổi schema + thêm date picker + fix CSS drawer.
