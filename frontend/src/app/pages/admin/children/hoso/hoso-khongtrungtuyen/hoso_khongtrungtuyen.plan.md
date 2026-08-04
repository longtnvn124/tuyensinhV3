# Kế hoạch: HosoKhongtrungtuyenComponent

## 1. Trạng thái

- **Chờ duyệt kế hoạch trước khi code.**
- Giai đoạn này chỉ tạo tài liệu thiết kế.
- Chưa sửa `hoso-khongtrungtuyen.component.ts`, `.html`, `.css` hoặc component dùng chung.

## 2. Mục tiêu

Xây dựng `HosoKhongtrungtuyenComponent` dựa trên cấu trúc và giao diện của `HosoXettuyenComponent`, chuyên hiển thị hồ sơ đã có kết quả **Không trúng tuyển**.

Yêu cầu chính:

- Chỉ tải hồ sơ có trạng thái kết quả không trúng tuyển.
- Giao diện bảng, bộ lọc, phân trang, drawer chi tiết đồng nhất với `hoso-xettuyen`.
- Đây là màn hình **chỉ đọc**: không thêm, cập nhật, xóa hoặc thay đổi kết quả hồ sơ.
- Cho phép xem chi tiết hồ sơ và xem lịch sử tư vấn.
- Lịch sử tư vấn trong màn này cũng chỉ đọc: không thêm, không xóa.
- Áp dụng quyền `hoso-tuyensinh`; người không có `canView` không được gọi API hoặc xem dữ liệu.

## 3. Quy trình nghiệp vụ đã đối chiếu

```text
Hồ sơ thí sinh
    │
    ├── Hội đồng xét tuyển nhận hồ sơ được phân công
    │       └── Đánh giá ket_qua = khong_trung_tuyen
    │
    ├── Trạng thái hồ sơ được đồng bộ thành KHONG_TRUNG_TUYEN
    │
    └── HosoKhongtrungtuyenComponent
            ├── Chỉ tải hồ sơ không trúng tuyển
            ├── Xem danh sách
            ├── Xem chi tiết hồ sơ
            └── Xem lịch sử tư vấn ở chế độ chỉ đọc
```

Nguồn kết quả hiện có:

- `hoidong_hoso_thisinh.ket_qua`: dùng giá trị `khong_trung_tuyen`.
- `HosoThisinh.status`: các màn hồ sơ đang dùng mã `KHONG_TRUNG_TUYEN` từ `TH_XETTUYEN`.

Component danh sách nên truy vấn theo `HosoThisinh.status = 'KHONG_TRUNG_TUYEN'`, vì `HosoThisinhService` là nguồn dữ liệu trực tiếp của các màn hồ sơ.

> Trước khi code cần xác nhận backend đã đồng bộ `hoidong_hoso_thisinh.ket_qua = 'khong_trung_tuyen'` sang `hoso-tuyensinh.status = 'KHONG_TRUNG_TUYEN'`. Nếu chưa đồng bộ, frontend không thể bảo đảm danh sách đầy đủ bằng endpoint hiện tại.

## 4. Phạm vi chức năng

### 4.1. Có triển khai

- Danh sách hồ sơ không trúng tuyển.
- Tìm kiếm theo họ tên hoặc số điện thoại.
- Lọc theo đợt xét tuyển.
- Lọc nâng cao theo CCCD, ngành, tỉnh/thành, nơi sinh, dân tộc.
- Phân trang.
- Loading, empty, error và tải lại.
- Xem chi tiết đầy đủ trong drawer.
- Xem quá trình tư vấn trong drawer chỉ đọc.
- Responsive và bảng cuộn ngang với các cột định danh cố định.

### 4.2. Không triển khai

- Thêm hồ sơ.
- Cập nhật hồ sơ.
- Xóa một hoặc nhiều hồ sơ.
- Checkbox chọn dòng.
- Thay đổi trạng thái hoặc kết quả xét tuyển.
- Gán hồ sơ vào hội đồng.
- Thêm hoặc xóa lịch sử tư vấn.
- Sửa route; route `hoso-khongtrungtuyen` đã tồn tại.

## 5. Phân quyền

Permission key dùng lại: `hoso-tuyensinh`.

```typescript
readonly permissionControl = signal(
    new IctuPermissionControl(this.authenticationService.getUserPermission('hoso-tuyensinh')),
);
```

### 5.1. Ma trận quyền của màn hình

| Quyền | Hành vi |
|---|---|
| `canView = false` | Không gọi API; hiển thị trạng thái không có quyền truy cập |
| `canView = true` | Xem bảng, bộ lọc, phân trang, chi tiết hồ sơ, lịch sử tư vấn |
| `canCreate = true/false` | Không hiển thị thêm mới; màn hình luôn chỉ đọc |
| `canUpdate = true/false` | Không hiển thị cập nhật; không cho đổi trạng thái/kết quả |
| `canDelete = true/false` | Không hiển thị checkbox hoặc xóa; không cho xóa lịch sử tư vấn |

Quy tắc chỉ đọc áp dụng cho mọi vai trò, kể cả `admin`, `direction`, `manager`.

### 5.2. Phạm vi dữ liệu lịch sử tư vấn

Giữ quy tắc hiện tại của `TuvanTuyensinhComponent`:

| Vai trò | Lịch sử được xem |
|---|---|
| `admin` | Toàn bộ lịch sử của hồ sơ |
| Vai trò khác | Chỉ lịch sử có `user_id` bằng ID tài khoản đăng nhập |

Chế độ `readOnly` chỉ khóa thao tác; không mở rộng phạm vi dữ liệu.

> Backend phải áp dụng cùng điều kiện quyền và phạm vi dữ liệu từ access token. Ẩn nút ở frontend không phải biện pháp bảo mật đầy đủ.

## 6. Cấu trúc giao diện

```text
HosoKhongtrungtuyenComponent
├── Header
│   ├── Tiêu đề: Danh sách hồ sơ không trúng tuyển
│   ├── Tìm kiếm
│   ├── Chọn đợt xét tuyển
│   └── Bộ lọc nâng cao
├── Bảng chỉ đọc
│   ├── #
│   ├── Họ tên + menu xem
│   ├── CCCD
│   ├── SĐT
│   ├── Trạng thái
│   ├── Email
│   ├── Ngành
│   ├── CTĐT
│   ├── Đợt đăng ký
│   ├── Tỉnh/TP
│   ├── Nơi sinh
│   └── Dân tộc
├── Phân trang
├── Drawer quá trình tư vấn — chỉ đọc
└── Drawer xem chi tiết hồ sơ — chỉ đọc
```

Menu mỗi dòng chỉ có:

1. **Quá trình tư vấn**.
2. **Xem hồ sơ**.

Không render các mục **Cập nhật** hoặc **Xóa**.

## 7. State và dữ liệu

```typescript
type ViewState = 'idle' | 'loading' | 'success' | 'error' | 'forbidden';

readonly state = signal<ViewState>('idle');
readonly consultationDrawerVisible = signal(false);
readonly selectedConsultationHoso = signal<HosoThisinh | null>(null);
readonly viewDetailVisible = signal(false);
readonly viewDetailData = signal<HosoThisinh | null>(null);
```

Sử dụng lại các pattern của `HosoXettuyenComponent`:

- `IctuDataTable<HosoThisinh>` cho dữ liệu và paginator.
- `forkJoin` tải danh mục đợt, ngành, CTĐT, tỉnh/thành.
- `takeUntil(onDestroy$)` cho vòng đời subscription.
- Signals lưu danh mục và drawer state.
- Sao chép bất biến khi chọn hồ sơ: `{ ...row }`.

Không mang sang:

- `IctuFormControl2`.
- `FormBuilder` và form add/edit.
- Event thêm/sửa/xóa.
- `FormThongtinDangkyComponent` ở chế độ sửa.
- Checkbox và bulk delete.

## 8. Query bắt buộc

Mỗi lần tải danh sách phải luôn có điều kiện cố định:

```typescript
{
    conditionName: 'status',
    value: 'KHONG_TRUNG_TUYEN',
    condition: IctuQueryCondition.equal,
}
```

Các bộ lọc người dùng chỉ được bổ sung điều kiện; không được ghi đè hoặc loại bỏ điều kiện trạng thái cố định.

Đề xuất tách API service để tránh truyền trạng thái qua object có thể bị reset:

```typescript
loadKhongTrungTuyen(
    info: HosoThisinhSearchInfo,
    queryParams?: Partial<IctuQueryParams>,
): Observable<DtoObject<HosoThisinh[]>>
```

Hàm này tạo conditions mới theo kiểu bất biến, luôn thêm `status = KHONG_TRUNG_TUYEN`, sau đó thêm search/filter.

Nếu không thêm method riêng, component phải khởi tạo `searchInfo.status = 'KHONG_TRUNG_TUYEN'` và `resetFilter()` bắt buộc giữ nguyên giá trị đó. Phương án method riêng an toàn hơn vì giữ invariant tại lớp service.

## 9. Bộ lọc

```typescript
searchInfo: HosoThisinhSearchInfo = {
    search: '',
    status: 'KHONG_TRUNG_TUYEN',
    dot_xet_tuyen_id: undefined,
    major_id: undefined,
};
```

Các trường bổ sung đang được `HosoXettuyenComponent` xử lý cục bộ cần giữ tương đương:

- `cccd`.
- `tinh_id`.
- `noi_sinh`.
- `dan_toc`.

Quy tắc:

- Enter ở ô tìm kiếm: về trang 1 rồi tải lại.
- Đổi đợt: về trang 1 rồi tải lại.
- **Áp dụng**: đóng popover, về trang 1, tải lại.
- **Reset**: xóa bộ lọc người dùng nhưng giữ trạng thái `KHONG_TRUNG_TUYEN`.
- Chuyển trang: giữ toàn bộ bộ lọc hiện tại.

## 10. Bảng và trạng thái hiển thị

Bảng kế thừa layout `hoso-xettuyen`, nhưng loại bỏ cột checkbox.

Badge trạng thái cố định:

```typescript
'KHONG_TRUNG_TUYEN' => 'Không trúng tuyển' / 'ictu-badge--danger'
```

Vẫn dùng helper lookup:

- `majorLabel(nganh_id)`.
- `programLabel(ctdt_id)`.
- `dotLabel(dot_xet_tuyen_id)`.
- `tinhLabel(tinh_id | noi_sinh)`.

Các trạng thái UI:

| State | Hiển thị |
|---|---|
| `idle/loading` | Loading progress |
| `success` có dữ liệu | Bảng + paginator |
| `success` rỗng | “Không có hồ sơ không trúng tuyển.” |
| `error` | Thông báo lỗi + “Tải lại” |
| `forbidden` | “Bạn không có quyền xem danh sách này.” |

## 11. Drawer xem chi tiết

Tái sử dụng nội dung drawer xem hồ sơ của `HosoXettuyenComponent`:

1. Thông tin cá nhân.
2. Giấy tờ tùy thân.
3. Thông tin liên hệ.
4. Thông tin đăng ký.
5. Trạng thái.

Quy tắc:

- Chỉ render text/badge; không có input hoặc submit.
- Click **Xem hồ sơ** có thể tải lại bản ghi theo ID để tránh dữ liệu chi tiết thiếu do query list chọn ít trường.
- Trong khi tải: hiển thị loading.
- Lỗi: hiển thị thông báo và cho thử lại.
- Đóng drawer: xóa dữ liệu đang chọn.

## 12. Drawer lịch sử tư vấn chỉ đọc

`TuvanTuyensinhComponent` hiện luôn cho mở form thêm; một số vai trò còn có thể xóa. Vì vậy chỉ ẩn menu ở parent là chưa đủ.

Mở rộng contract:

```typescript
@Input() readOnly = false;
```

Trong `TuvanTuyensinhComponent`:

- Ẩn nút **Thêm lần tư vấn** khi `readOnly`.
- Ẩn nút xóa từng lịch sử khi `readOnly`.
- `showForm()`, `submit()` và `deleteHistory()` phải return sớm khi `readOnly`.
- Khi chuyển sang `readOnly`, ép `viewState = 'history'`, reset form và hủy submit/delete đang chạy nếu có.
- Giữ loading, empty, error/retry và timeline.
- Parent `hoso-xettuyen` không truyền input nên vẫn giữ hành vi hiện tại.

Tích hợp ở màn không trúng tuyển:

```html
<app-tuvan-tuyensinh
    [hoso]="selectedConsultationHoso()"
    [readOnly]="true" />
```

## 13. Tái sử dụng và giới hạn sao chép

Nên tái sử dụng trực tiếp:

- Model `HosoThisinh`.
- `HosoThisinhService`.
- Các service danh mục.
- `IctuDataTable` và paginator.
- `TuvanTuyensinhComponent` với chế độ `readOnly`.
- Helper/status từ `TH_XETTUYEN`.

Không tách component bảng dùng chung trong lần triển khai đầu tiên. Hai màn hiện có thể giống giao diện nhưng khác invariant và thao tác; trừu tượng hóa ngay sẽ tăng phạm vi sửa đổi. Sau khi `hoso-trungtuyen` được triển khai, mới đánh giá phần trùng lặp thực tế để tách shared list nếu cần.

## 14. File dự kiến tác động khi được duyệt code

| File | Hành động |
|---|---|
| `hoso-khongtrungtuyen/hoso-khongtrungtuyen.component.ts` | Thay skeleton bằng list chỉ đọc, filter, lookup, drawer state |
| `hoso-khongtrungtuyen/hoso-khongtrungtuyen.component.html` | Bảng, filter, paginator, hai drawer chỉ đọc |
| `hoso-khongtrungtuyen/hoso-khongtrungtuyen.component.css` | Layout theo `hoso-xettuyen`, bỏ style form/edit/delete |
| `tuvan-tuyensinh/tuvan-tuyensinh.component.ts` | Thêm contract và guard `readOnly` |
| `tuvan-tuyensinh/tuvan-tuyensinh.component.html` | Ẩn thao tác thêm/xóa khi `readOnly` |
| `hoso-thisinh.service.ts` | Thêm query chuyên biệt giữ invariant trạng thái, nếu chọn phương án service |
| `hoso_khongtrungtuyen.plan.md` | Cập nhật trạng thái sau khi duyệt/triển khai |

Không sửa `hoso-routing.module.ts` vì route đã có.

## 15. Trình tự triển khai sau khi duyệt

### Phase 1 — Xác nhận dữ liệu

1. Xác nhận mã trạng thái backend của hồ sơ là `KHONG_TRUNG_TUYEN`.
2. Xác nhận luồng hội đồng đồng bộ kết quả sang `HosoThisinh.status`.
3. Xác nhận endpoint query hỗ trợ kết hợp status với các filter hiện tại.

### Phase 2 — Test trước

1. Test không có `canView`: không gọi service.
2. Test query luôn chứa trạng thái không trúng tuyển.
3. Test reset filter không làm mất trạng thái cố định.
4. Test menu chỉ có xem lịch sử và xem hồ sơ.
5. Test `readOnly` chặn form thêm, submit và delete lịch sử.
6. Test loading, empty, error/retry và paginator.

### Phase 3 — Component danh sách

1. Triển khai state, permissions, lookup và loadData.
2. Triển khai search/filter/reset/pagination.
3. Triển khai bảng chỉ đọc.
4. Triển khai drawer chi tiết.

### Phase 4 — Lịch sử tư vấn chỉ đọc

1. Thêm `readOnly` input.
2. Guard method gây thay đổi dữ liệu.
3. Ẩn toàn bộ control thêm/xóa.
4. Tích hợp drawer vào màn không trúng tuyển.

### Phase 5 — CSS và xác minh

1. Đồng bộ visual với `hoso-xettuyen`.
2. Kiểm tra desktop, tablet, mobile và bảng cuộn ngang.
3. Chạy unit tests, type-check, build.
4. Chạy component trong browser; kiểm tra golden path và trạng thái biên.
5. Rà soát code và phân quyền trước khi kết thúc.

## 16. Rủi ro

| Mức | Rủi ro | Cách xử lý |
|---|---|---|
| Cao | Kết quả hội đồng không đồng bộ sang `HosoThisinh.status` | Xác nhận backend trước khi code; không suy diễn dữ liệu ở frontend |
| Cao | Chỉ ẩn nút nhưng method/API vẫn cho mutation | Thêm `readOnly` guard trong component con; backend vẫn phải kiểm tra quyền |
| Trung bình | `resetFilter()` làm mất status cố định | Giữ invariant trong method service chuyên biệt |
| Trung bình | List query thiếu trường cho drawer chi tiết | Tải bản ghi theo ID khi mở drawer |
| Trung bình | Mã `KHONG_TRUNG_TUYEN` và `khong_trung_tuyen` không đồng nhất | Chuẩn hóa theo từng model/API; không so sánh chéo trực tiếp |
| Thấp | CSS sao chép lệch khỏi màn gốc | Dùng cùng cấu trúc class, chỉ bỏ phần thao tác/form |

## 17. Tiêu chí nghiệm thu

- Người không có `canView` không gọi API và không thấy dữ liệu.
- Mọi bản ghi hiển thị đều có trạng thái không trúng tuyển.
- Search, filter, reset và phân trang không bao giờ làm mất điều kiện trạng thái cố định.
- Không có checkbox, thêm, cập nhật, xóa hoặc đổi kết quả.
- Menu dòng chỉ có **Quá trình tư vấn** và **Xem hồ sơ**.
- Drawer chi tiết chỉ đọc, hiển thị đủ các nhóm thông tin.
- Drawer tư vấn chỉ đọc; không thể mở form, submit hoặc xóa bằng gọi method từ UI.
- Phạm vi lịch sử tư vấn giữ đúng quy tắc admin/toàn bộ, non-admin/của mình.
- Loading, empty, error, retry hoạt động đúng.
- UI tương đồng `hoso-xettuyen`, responsive, không vỡ sticky columns.
- Unit tests, type-check và build thành công.
- Luồng thực tế được kiểm tra trong browser trước khi báo hoàn tất.

## 18. Độ phức tạp

**Trung bình**.

- Component danh sách: khoảng 1 ngày.
- Chế độ lịch sử tư vấn chỉ đọc + tests: khoảng 0.5 ngày.
- Kiểm thử, sửa lỗi UI/build: khoảng 0.5 ngày.

Tổng ước tính: **1.5–2 ngày làm việc**, chưa gồm thay đổi backend nếu thiếu đồng bộ kết quả.
