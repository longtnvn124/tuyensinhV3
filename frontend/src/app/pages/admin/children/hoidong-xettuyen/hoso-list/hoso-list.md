# HosoList — Chi tiết component quản lý hồ sơ được gán

## 1. Vị trí & vai trò

`HosoListComponent` là **detail view** của module `hoidong-xettuyen`, mở trong một drawer 100vw từ master (nút `ti-users` "Quản lý hồ sơ"). Duy nhất mục tiêu: quản lý danh sách hồ sơ thí sinh được **phân công vào một hội đồng** — xem, gán thêm và bỏ gán.

Khác với master (CRUD hội đồng), component này **không đứng độc lập** — nhận `@Input hoidong` từ parent và reload theo `ngOnChanges`.

```
hoidong-xettuyen.component (master)  ──drawer 100vw──▶  HosoListComponent
                                                            │ @Input hoidong, permission
                                                            ▼
                                          HoidongHosoThisinhService  (bảng trung gian)
                                          HosoThisinhService         (tra cứu thí sinh)
                                          ApiOutsiteService          (ngành học — API ngoài)
                                          LocationService            (nơi sinh)
```

## 2. Inputs & State

### `@Input` (setter + getter)
| Input | Kiểu | Ý nghĩa |
|---|---|---|
| `hoidong` | `HoidongXettuyen \| null` | Hội đồng đang quản lý. Setter lưu vào `_hoidong` private. Đổi giá trị → `ngOnChanges` reload. |
| `permission` | `IctuPermissionControl` | Các cờ quyền để ẩn/hiện nút Gán và nút xóa. |

### State signals
| Signal | Kiểu | Mô tả |
|---|---|---|
| `state` | `'loading' \| 'success' \| 'error'` | Trạng thái tải chính. Điều khiển spinner / bảng / màn hình lỗi. |
| `dataTable` | `IctuDataTable<HoidongHosoThisinh>` | Bảng + paginator (rows=50). |
| `majorOptions` | `IctuDropdownOption<number>[]` | Ngành học (từ API ngoài) — dùng trong dialog gán. |
| `provinceOptions` | `IctuDropdownOption<number>[]` | Nơi sinh (regions) — dùng trong dialog gán. |

### Non-signal, phục vụ gán và bỏ gán
| Field | Kiểu | Mô tả |
|---|---|---|
| `assignDialogVisible` | `boolean` | Đóng/mở `p-dialog`. |
| `assignLoading` | `boolean` | Khóa thao tác trong lúc tải candidate hoặc chạy batch gán. |
| `assignCandidates` | `HosoThisinh[]` | Danh sách thí sinh chưa được gán (đã loại trừ trùng). |
| `selectedAssignIds` | `Set<number>` | ID hồ sơ được chọn trong dialog gán. |
| `selectedAssignedIds` | `ReadonlySet<number>` | ID bản ghi phân công được chọn trên trang hiện tại để xóa hàng loạt. |
| `removeLoading` | `boolean` | Khóa checkbox và nút xóa trong lúc batch xóa chạy. |
| `progress` | `Subject<number>` | Phát phần trăm `0–100` cho `progressBarWithPercent`. |

## 3. Dòng dữ liệu / Load

### Lifecycle
- `ngOnInit()` → `loadLookups()` (ngành học + nơi sinh, 1 lần).
- `ngOnChanges()` — khi `hoidong` đổi:
  - Có `id` → `loadData(1, true)`.
  - `null`/mất id → clear `dataTable`.

### `loadData(paged, resetPaginator)` — core
Dùng `switchMap` **2 bước tuần tự**, không còn `forkJoin` như bản cũ:

1. `assignmentService.loadByHoidong(hoidongId, {limit, paged})` →
   lấy rows `HoidongHosoThisinh` theo `hoidong_id` (service query condition `hoidong_id = hoidongId`, order `created_at DESC`, default limit 50).
2. Nếu có rows → build condition `id IN (hoso_id1,hoso_id2,...)` → `hosoService.query(conditions, {limit: rows.length, paged:1})` → `map` thành `hosoMap` → gắn `_hoso` (HosoThisinh) vào từng row.
3. `subscribe` → `dataTable.fillData(rows)` + `state=success`. Error → `state=error`.

> `_hoso` được khai báo optional trong `HoidongHosoThisinh` và được gắn khi tải để bảng hiển thị thông tin thí sinh qua `getCandidate(row)`.

Lưu ý: `temp` lưu `{paged, resetPaginator}` của lần load **cuối** — dùng cho nút reload lỗi; `onChangePage` truyền `resetPaginator=false`, search truyền `=true`.

## 4. Luồng gán hồ sơ (dialog 1024px)

1. `openAssignDialog()` → reset `selectedAssignIds` → `loadCandidates()` → mở dialog.
2. `loadCandidates()` → `hosoService.load({search:'', dot_xet_tuyen_id: this._hoidong?.dot_xettuyen_id}, {limit:500, paged:1})` → **lọc bỏ** thí sinh đã có trong `dataTable.data()` bằng Set `hoso_id` → `assignCandidates`. Dialog không có ô tìm kiếm; danh sách tự lọc theo đợt xét tuyển của hội đồng.
3. Checkbox header gọi `toggleSelectAllCandidates()`; checkbox từng dòng gọi `toggleCandidate(id)`.
4. `confirmAssign()` chặn khi đang xử lý, không có lựa chọn hoặc hội đồng không hợp lệ.
5. Mở một `progressBarWithPercent(progress.asObservable(), heading)` rồi phát `0` trước khi chạy batch.
6. `from(ids)` + `mergeMap(..., 5)` gọi `assignmentService.create({hoidong_id, hoso_id})`, tối đa 5 request đồng thời:
   - Thành công được map thành `true`.
   - `catchError(() => of(false))` giữ batch tiếp tục khi một request lỗi.
   - `scan` tích lũy `{success, failed}`.
   - `tap` phát phần trăm `(success + failed) / total * 100`.
   - `last()` chỉ chuyển kết quả tổng cuối cho `afterAssign()`.
7. `afterAssign()` hiển thị toast theo số thành công/thất bại, đóng dialog và `loadData(1, true)`.
8. `finalize()` luôn trả `assignLoading=false`; `takeUntil(onDestroy$)` hủy an toàn khi component bị hủy.
9. `cancelAssign()` đóng dialog và reset selection.

> Mỗi batch chỉ mở một progress dialog. Lỗi riêng lẻ không làm dừng các request còn lại.

## 5. Bỏ gán một hoặc nhiều hồ sơ

### Selection trên bảng

- Checkbox từng dòng gọi `toggleAssigned(row.id)`; cập nhật Set theo hướng immutable.
- Checkbox header gọi `toggleSelectAllAssigned()` để chọn/bỏ toàn bộ **trang hiện tại**.
- `allAssignedChecked()` và `isAssignedSelectionIndeterminate()` điều khiển trạng thái checkbox header.
- `loadData()` luôn reset `selectedAssignedIds`, tránh giữ selection khi đổi trang, reload hoặc đổi hội đồng.

### `removeAssigned(row?)`

1. Có `row` → xóa riêng `[row.id]`; không có `row` → lấy các ID đã chọn theo thứ tự dòng đang hiển thị.
2. Chặn khi `removeLoading=true` hoặc không có ID.
3. Mở confirm tùy chỉnh bằng `notification.confirm(...)`; chỉ tiếp tục khi `ButtonBase.name === BUTTON_CONFIRMED.name`.
4. Sau xác nhận, mở một `progressBarWithPercent` và phát `0`.
5. `from(ids)` + `mergeMap(..., 5)` gọi `assignmentService.delete(id)`; `catchError` giữ batch tiếp tục, `scan` đếm kết quả, `tap` phát tiến độ, `last()` trả tổng cuối.
6. `afterRemoveAssigned()` reset selection, toast số thành công/thất bại và reload trang hiện tại nếu có ít nhất một request thành công.
7. `finalize()` luôn trả `removeLoading=false`; checkbox và nút xóa bị disable trong lúc chạy.

ID được xóa là `row.id` của bảng trung gian `hoidong_hoso_thisinh`, **không phải** `hoso_id`. Nút thùng rác từng dòng vẫn dùng chung luồng với nút xóa hàng loạt.

## 6. Format helper

| Method | Mục đích |
|---|---|
| `getCandidate(row)` | Trả về hồ sơ `_hoso` đã gắn trong `loadData`. |
| `getMajorLabel(majorId)` | label ngành từ `majorOptions`. |
| `formatBirthday(birthday)` | `YYYY-MM-DD` → `DD/MM/YYYY`. |
| `getDoiTuongLabel(code)` | label từ const `DOI_TUONG`. |
| `getNoiSinhLabel(noiSinh)` | string giữ nguyên; số → lookup `provinceOptions`. |

## 7. Lookup (1 lần, `loadLookups`)

`forkJoin` song song 2 nguồn, `takeUntil(onDestroy$)`:

1. **Ngành học**: `apiOutsiteService.getNganhList()` (API ngoài) → filter `type==='nganh'` → `{value:id, label:title}`.
2. **Nơi sinh**: `locationService.queryLocation([], {limit:-1}, 'regions')` → `{value:id, label:name}`.

Error → toast "Tải dữ liệu ngành học và nơi sinh thất bại". Load 1 lần ở `ngOnInit`; nếu admin thêm ngành/region mới phải refresh trang.

## 8. Templates & CSS

- **HTML**: bảng `hsl-table` + toolbar + paginator. Khi có quyền xóa, bảng có thêm checkbox header/từng dòng và nút `Xóa` xuất hiện khi selection > 0. Nút thùng rác từng dòng được giữ lại. `canDelete` điều khiển checkbox/nút xóa; `canUpdate` điều khiển nút `Gán hồ sơ`.
- **Dialog gán**: table 8 cột với `mat-checkbox`, không có ô tìm kiếm. Footer chỉ hiện nút Lưu khi `selectedAssignIds.size > 0`.
- **CSS bảng**: prefix `.hsl-*`, sticky header, cuộn hai chiều, cột có `min-width`, dòng được chọn có nền nhấn nhẹ.
- **CSS nút toolbar**: nút `Xóa` và `Gán hồ sơ` dùng chung `.hsl-toolbar-button`, cùng kích thước `112×36px`, padding `0 14px`, bo góc `6px`, icon `16px`, gap `6px`.
- **CSS nút xóa dòng**: `.hsl-delete-row` là nút icon vuông `32×32px`, có `aria-label`, giảm opacity khi disabled.
- Toolbar cho phép wrap trên vùng hiển thị hẹp; dialog rộng `1024px`, tối đa `100%`.

## 9. Rủi ro & lưu ý

1. **`switchMap` tải hồ sơ theo trang**: query `id IN (...)` đúng các row phân công, tránh tải toàn bộ hồ sơ.
2. **Batch concurrency**: gán/xóa giới hạn 5 request đồng thời. Unique `(hoidong_id, hoso_id)` hoặc lỗi API có thể tạo kết quả thất bại một phần; batch vẫn chạy hết và toast thống kê riêng.
3. **Progress lifecycle**: mỗi thao tác phải phát tới `100`; `progress.complete()` trong `ngOnDestroy()` đóng dialog nếu component bị hủy giữa chừng.
4. **`getMajorLabel` dùng `majorId = nganh_id`** — API ngoài mapping `type === 'nganh'`.
5. **Dialog stale**: mỗi lần mở phải reload candidate để loại trừ thí sinh vừa gán.
6. **Thiếu hồ sơ liên kết**: nếu `hosoService.query` không trả row khớp `hoso_id`, `_hoso=null` và bảng hiện `Hồ sơ #{id}`.
7. **Filter đợt ở dialog gán**: nếu hội đồng thiếu `dot_xettuyen_id`, query candidate không lọc đợt nhưng vẫn loại trừ hồ sơ đã gán trên trang.
8. **Selection theo trang**: chọn tất cả chỉ áp dụng dữ liệu trang hiện tại; mọi lần `loadData()` đều reset selection.
9. **Hủy request cũ**: `dataLoad$` ngăn response trang/hội đồng cũ ghi đè lần tải mới.

## 10. Kiểm tra

- Production build: `npm --prefix frontend run build` — đạt.
- `git diff --check` — đạt; môi trường Windows có cảnh báo chuyển LF sang CRLF.
- UI tự động chưa chạy được vì Playwright MCP Bridge chưa được cài trong môi trường hiện tại.

## 11. Quy mô hiện tại

| Phần | LOC |
|---|---:|
| Component TS | `407` |
| Template | `185` |
| Style | `267` |
| **Tổng component** | **859** |
