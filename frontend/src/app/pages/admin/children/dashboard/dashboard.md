# Dashboard — Kế hoạch thiết kế lại

## 1. Mục tiêu

Thiết kế lại giao diện Dashboard với pattern tham khảo từ `dot-xettuyen.component.html`:
- 3 trạng thái rõ ràng: **loading** | **success** (view data) | **error**
- Header đơn giản: trái = "Dashboard", phải = dropdown chọn năm
- View data: chỉ giữ **4 ô KPI** (bỏ toàn bộ table, chart, tổng quan hệ thống, tư vấn)
- Dropdown đổi năm → onChange tự gọi `getDashboard(year)` để query lại

## 2. Danh sách năm

Lấy tự động phía client:
- Mặc định chọn **năm hiện tại**
- Danh sách năm: từ năm hiện tại trở về **1 năm trước** (2 giá trị: `currentYear`, `currentYear - 1`)

Ví dụ: hiện tại 2026 → options = `[2026, 2025]`.

## 3. 4 ô KPI hiển thị

| # | Label | Field mapping | Màu chủ đạo |
|---|-------|---------------|--------------|
| 1 | Tổng hồ sơ | `summary.totalRegistrations` | Xanh dương (blue) |
| 2 | Doanh thu (VNĐ) | `summary.totalRevenue` | Vàng (amber) |
| 3 | Trúng tuyển | `summary.totalAdmitted` | Xanh lá (green) |
| 4 | Hồ sơ chờ xử lý | `summary.pendingRegistrations` | Đỏ (red) |

Mỗi card có:
- Icon gradient tròn (top-left)
- Label nhỏ xám
- Số liệu lớn, đậm
- Sub-line: năm đang xem

## 4. State machine

```ts
state: WritableSignal<'loading' | 'success' | 'error'>
```

| State | UI |
|-------|----|
| `loading` | Overlay `<app-loading-progress>` phủ toàn section |
| `success` + `state() !== 'error'` | Hiển thị header + 4 KPI cards |
| `error` | Block `admin-table__alert-danger` + nút "tải lại" |

## 5. Service

Giữ nguyên `SummaryService.getDashboard(year)` — không sửa.
Bỏ call `getYear()` (không cần, sinh năm phía client).

## 6. Files thay đổi

| File | Thay đổi |
|------|----------|
| `dashboard.component.ts` | Thêm state signal, year signal, `years` computed, `loadDashboard(year)`, `onYearChange(year)`, `reload($event)`; map response → `summary`; bỏ `getYear()` call + các field table/period/source/council/revenue/consultation/systemOverview không dùng |
| `dashboard.component.html` | Đổi sang pattern `<section class="admin-section--table">`; header dùng `admin-wrap-table__head`; loading/error overlay như dot-xettuyen; body chỉ còn row 4 KPI cards |
| `dashboard.component.css` | Xóa rule header/select/btn cũ; giữ `.kpi-card`; thêm variant gradient icon, big-number style |
| `dashboard.md` | File này |

## 7. Imports cần thêm

- `signal`, `WritableSignal`, `computed` từ `@angular/core`
- `Select` từ `primeng/select`
- `LoadingProgressComponent` từ `@theme/components/loading-progress/loading-progress.component`
- `IctuDropdownOption` nếu cần

## 8. Không động đến

- `summary.service.ts` — patch tối thiểu, baseline chạy ổn
- `dashboard.component.html` hiện tại — sẽ rewrite toàn bộ
