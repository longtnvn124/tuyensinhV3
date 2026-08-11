# Hội đồng xét duyệt hồ sơ

<!-- AUTO-GENERATED: START - Đồng bộ từ component TS/HTML/CSS/spec -->

## 1. Tổng quan

`HoidongHosoXetduyetComponent` hiển thị toàn bộ hồ sơ thuộc hội đồng đang chọn, hỗ trợ chọn nhiều hồ sơ, duyệt hoặc hủy duyệt hàng loạt và phát yêu cầu xuất dữ liệu.

Component là standalone, nhận hội đồng từ component cha:

```html
<app-hoidong-hoso-xetduyet [hoidong]="selected"></app-hoidong-hoso-xetduyet>
```

Không có paginator. Danh sách được tải toàn bộ với `limit = -1` và cuộn trong vùng bảng.

## 2. Giao tiếp component

### Input

```ts
readonly hoidong = input<HoidongXettuyen | null>(null);
```

- `null`: xóa dữ liệu, danh mục và selection; không gọi API.
- Có hội đồng: chuyển sang `loading`, tải dữ liệu theo `hoidong.id`.
- Mỗi lần input thay đổi đều tạo yêu cầu tải mới.
- `switchMap` hủy luồng tải cũ khi hội đồng thay đổi nhanh.

### Output

```ts
readonly exportRequested = output<number>();
```

Nút `Xuất dữ liệu` phát `hoidong.id` qua `exportRequested`. Component hiện không tự tạo file xuất trong luồng giao diện đang sử dụng.

## 3. Trạng thái

```ts
type ReviewDataState = 'loading' | 'data' | 'error';
```

| State | Giao diện |
|---|---|
| `loading` | `LoadingProgressComponent` với nội dung `Đang tải hồ sơ của hội đồng...` |
| `data` có dữ liệu | Thanh selection, menu thao tác, nút xuất và bảng hồ sơ |
| `data` rỗng | Empty state `Hội đồng chưa có hồ sơ để xét duyệt.` |
| `error` | Thông báo lỗi và nút `Tải lại dữ liệu` |

State và dữ liệu chính:

```ts
readonly state = signal<ReviewDataState>('data');
readonly actionLoading = signal(false);
readonly errorMessage = signal('');
readonly records = signal<readonly HoidongHosoThisinh[]>([]);
readonly selectedIds = signal<ReadonlySet<number>>(new Set<number>());
```

Các computed selection:

- `selectedCount`: số quan hệ hội đồng–hồ sơ đang chọn.
- `hasSelection`: có ít nhất một hồ sơ được chọn.
- `areAllSelected`: toàn bộ bản ghi đã được chọn.
- `isSelectionIndeterminate`: đã chọn một phần danh sách.

## 4. Luồng tải dữ liệu

```text
Nhận hoidong
  → reset selection, records, lookup và lỗi
  → state = loading
  → tải song song ngành, chương trình đào tạo, tỉnh
  → tải song song quan hệ hội đồng–hồ sơ và toàn bộ hồ sơ thí sinh
  → ghép quan hệ.hoso_id với hoso.id
  → cập nhật lookup + records
  → state = data
```

### Danh mục

`loadLookups()` dùng `forkJoin`:

| Dữ liệu | Service/API | Xử lý |
|---|---|---|
| Ngành học | `ApiOutsiteService.getNganhList()` | Chỉ giữ item có `type === 'nganh'`; map `id/title` thành `value/label` |
| Chương trình đào tạo | `ApiOutsiteService.getCtdtList()` | Map `id/ten` thành `value/label` |
| Tỉnh | `LocationService.queryLocation(..., 'regions')` | Tải `limit = -1`; map `id/name` thành `value/label` |

### Hồ sơ hội đồng

`loadRecords(hoidongId)` tải song song:

1. `HoidongHosoThisinhService.query()` với điều kiện `hoidong_id = hoidongId`, `limit = -1`, sắp xếp `created_at DESC`.
2. `HosoThisinhService.query()` với `limit = -1`.

`hydrateRecords()` tạo `Map` hồ sơ theo `id`, sau đó trả về bản sao mỗi quan hệ với `_hoso` tương ứng. Không mutate dữ liệu response.

### Reload và lỗi

- `reload()` tải lại toàn bộ lookup và hồ sơ của hội đồng hiện tại.
- Lỗi tải chuyển state sang `error`.
- Thứ tự lấy thông báo: `error.error.message`, `Error.message`, `error.message`, sau đó dùng thông báo mặc định `Đã xảy ra lỗi khi tải hồ sơ. Vui lòng thử lại.`.

## 5. Bảng hồ sơ

Bảng có các cột:

| Cột | Nguồn dữ liệu / giá trị mặc định |
|---|---|
| Chọn | Checkbox theo `row.id` |
| STT | Vị trí trong `records()` + 1 |
| Họ và tên | `_hoso.full_name`; mặc định `Hồ sơ #hoso_id` |
| Mã hồ sơ | `row.hoso_id` |
| Ngành học | Lookup từ `_hoso.nganh_id`; mặc định `---` |
| Chương trình đào tạo | Lookup từ `_hoso.ctdt_id`; mặc định `---` |
| Tỉnh | Chuỗi tỉnh hoặc lookup từ `_hoso.tinh_id`; mặc định `---` |
| Ngày sinh | `_hoso.birthday`, định dạng `dd/MM/yyyy`; mặc định `---` |
| Số điện thoại | `_hoso.phone`; mặc định `---` |
| Số CCCD | `_hoso.cccd`; mặc định `---` |
| Trạng thái hồ sơ | Nhãn từ `TH_XETTUYEN`; mặc định `Chưa xét` |
| Ghi chú | `row.ghi_chu`; mặc định `---` |

Badge trạng thái:

| Giá trị | Nhãn | CSS |
|---|---|---|
| `TRUNG_TUYEN` | `Trúng tuyển` | `review-result--approved` |
| `KHONG_TRUNG_TUYEN` | `Không trúng tuyển` | `review-result--rejected` |
| Khác/rỗng | Nhãn danh mục hoặc `Chưa xét` | `review-result--pending` |

## 6. Selection

- Checkbox đầu bảng gọi `toggleAll()` để chọn hoặc bỏ chọn toàn bộ `records()`.
- Checkbox từng dòng gọi `toggleRow(row.id)`.
- Dòng đã chọn có class `review-table__row--selected`.
- Mỗi cập nhật tạo `Set` mới; không mutate `Set` hiện tại.
- Selection bị reset khi đổi hội đồng, reload hoặc có ít nhất một cập nhật thành công.
- Checkbox và thao tác selection bị khóa khi `actionLoading()` là `true`.

Thanh selection hiển thị:

```text
Đã chọn X / Y hồ sơ                       [⋮] [Xuất dữ liệu]
```

## 7. Duyệt và hủy duyệt hàng loạt

Menu `⋮` gồm:

- `Duyệt hồ sơ` gọi `onApproveSelected()`.
- `Hủy duyệt hồ sơ` gọi `onCancelApprovalSelected()`.

Hai thao tác bị disable khi selection rỗng hoặc đang xử lý.

### Mapping trạng thái

| Thao tác | Giá trị cập nhật vào `HosoThisinh.status` |
|---|---|
| Duyệt | `TRUNG_TUYEN` |
| Hủy duyệt | `KHONG_TRUNG_TUYEN` |

### Cách xử lý

1. Lọc `records()` theo `selectedIds`.
2. Bật `actionLoading` và mở progress bar.
3. Gọi `HosoThisinhService.update(record.hoso_id, { status })` cho từng hồ sơ.
4. `mergeMap(..., 5)` giới hạn tối đa 5 request đồng thời.
5. Mỗi request tự bắt lỗi để các hồ sơ còn lại tiếp tục xử lý.
6. `scan()` tổng hợp số thành công, thất bại và lỗi đầu tiên.
7. Cập nhật phần trăm theo `(success + failed) / total`.
8. Tắt `actionLoading` trong `finalize()`.

Kết quả:

- Có bản ghi thành công: hiện toast thành công, xóa selection, reload dữ liệu.
- Có bản ghi thất bại: hiện toast số lượng thất bại kèm lỗi đầu tiên nếu có.
- Tất cả thất bại: giữ selection, không reload để người dùng có thể thử lại.
- Khi một batch đang chạy: không cho khởi chạy batch khác hoặc xuất dữ liệu.

## 8. Xuất dữ liệu

`onExportData()` chỉ hoạt động khi không có batch đang chạy và input có `hoidong.id` hợp lệ:

```ts
this.exportRequested.emit(hoidongId);
```

Component cha cần bind `(exportRequested)` để thực hiện nghiệp vụ xuất. Template cha hiện chỉ truyền `[hoidong]`, chưa bind output này.

## 9. Giao diện và khả năng truy cập

- Shell dùng flex column, `height: 100%`, `min-height: 0`.
- Vùng bảng dùng `overflow: auto`; bảng có `min-width: 1120px`.
- Header bảng sticky khi cuộn.
- Dòng hover và dòng selected có nền riêng; dòng selected thêm viền xanh bên trái.
- Menu batch dùng PrimeNG `Popover`.
- Nút dùng Angular Material button; selection dùng `MatCheckbox`.
- Bảng có caption ẩn cho screen reader.
- Menu và checkbox có `aria-label`.
- Error state dùng `role="alert"`; loading dùng `aria-live="polite"`.
- `:focus-visible` có outline rõ.
- Dưới 600 px, thanh selection tự wrap; nhóm hành động căn phải.

## 10. Test hiện có

`hoidong-hoso-xetduyet.component.spec.ts` kiểm tra:

- Duyệt hồ sơ cập nhật `TRUNG_TUYEN`, hiện progress/toast, xóa selection và reload.
- Hủy duyệt cập nhật `KHONG_TRUNG_TUYEN`.
- Không gọi cập nhật khi chưa chọn hồ sơ.
- Mapping nhãn và CSS cho ba nhóm trạng thái.
- Một hồ sơ lỗi không làm dừng các hồ sơ còn lại.
- Hiển thị lỗi server cho cập nhật thất bại.
- Tất cả cập nhật thất bại giữ selection và không reload.
- Không cho bắt đầu batch mới khi batch hiện tại đang chạy.

## 11. Phạm vi hiện tại

Đã triển khai:

- Nhận và theo dõi hội đồng qua signal input.
- Tải lookup và toàn bộ hồ sơ.
- Ghép dữ liệu hồ sơ vào quan hệ hội đồng–hồ sơ.
- Loading, data, empty và error state.
- Chọn từng dòng, chọn tất cả.
- Duyệt/hủy duyệt hàng loạt với giới hạn đồng thời, progress và xử lý lỗi từng phần.
- Phát yêu cầu xuất dữ liệu.
- Giao diện responsive cơ bản và thuộc tính accessibility.

Chưa nằm trong luồng giao diện hiện tại:

- Dialog xác nhận trước khi duyệt/hủy duyệt.
- Chỉnh sửa ghi chú trực tiếp.
- Phân trang hoặc virtual scroll.
- Component tự tạo file Excel/CSV/PDF từ nút `Xuất dữ liệu`.
- Binding `(exportRequested)` tại component cha.

## 12. File nguồn đồng bộ

```text
hoidong-hoso-xetduyet/
├── hoidong-hoso-xetduyet.component.ts
├── hoidong-hoso-xetduyet.component.html
├── hoidong-hoso-xetduyet.component.css
├── hoidong-hoso-xetduyet.component.spec.ts
└── hoidong-hoso-xetduyet.md
```

<!-- AUTO-GENERATED: END -->
