# Kế hoạch: HosoTrungtuyenComponent

## 1. Trạng thái

- **Chờ duyệt kế hoạch trước khi code.**
- Giai đoạn này chỉ tạo tài liệu thiết kế.
- Chưa sửa `hoso-trungtuyen.component.ts`, `.html`, `.css`.
- Không sửa service, model, route, module hoặc component dùng chung.

## 2. Mục tiêu

Xây dựng `HosoTrungtuyenComponent` từ skeleton hiện tại thành màn danh sách hồ sơ đã có kết quả **Trúng tuyển**.

Thiết kế kế thừa có chọn lọc từ:

- `HosoKhongtrungtuyenComponent`: danh sách chỉ đọc, bộ lọc, phân trang, state, drawer chi tiết và lịch sử tư vấn.
- `HosoXettuyenComponent`: tải danh mục đợt xét tuyển, ngành, CTĐT, tỉnh/thành và ánh xạ nhãn.
- `TuvanTuyensinhComponent`: dùng trực tiếp chế độ `[readOnly]="true"`; không sửa component con.

Yêu cầu bắt buộc:

- Chỉ tải hồ sơ có `status = 'TRUNG_TUYEN'`.
- Giao diện đồng nhất với các màn hồ sơ hiện có.
- Màn hình chỉ đọc tuyệt đối với mọi vai trò, kể cả admin: không thêm, cập nhật, xóa hoặc đổi kết quả hồ sơ.
- `canUpdate` và `canDelete` không làm thay đổi quy tắc khóa này.
- Không render nút/checkbox, không khai báo handler và không gọi API cập nhật hoặc xóa.
- Cho phép xem chi tiết hồ sơ và quá trình tư vấn.
- Không thêm method vào service.
- Khi triển khai, mọi thay đổi chỉ nằm trong ba file của `hoso-trungtuyen`.

## 3. Phạm vi

### 3.1. Có triển khai

- Danh sách hồ sơ trúng tuyển.
- Tìm kiếm theo họ tên hoặc số điện thoại.
- Lọc nhanh theo đợt xét tuyển.
- Lọc nâng cao theo CCCD, ngành, tỉnh/thành, nơi sinh, dân tộc.
- Phân trang.
- Loading, empty, error/retry, forbidden state.
- Bảng cuộn ngang; cột định danh cố định bên trái.
- Menu thao tác từng dòng.
- Drawer xem chi tiết hồ sơ.
- Drawer xem quá trình tư vấn chỉ đọc.
- Responsive desktop, tablet, mobile.

### 3.2. Không triển khai

- Thêm, cập nhật hoặc xóa hồ sơ.
- Checkbox chọn dòng và xóa hàng loạt.
- Thay đổi trạng thái hoặc kết quả xét tuyển.
- Nghiệp vụ nhập học.
- Gán hồ sơ vào hội đồng.
- Thêm, sửa hoặc xóa lịch sử tư vấn.
- Tạo hoặc sửa service/model dùng chung.
- Sửa route/module; route `hoso-trungtuyen` đã tồn tại.
- Sửa `TuvanTuyensinhComponent`; component này đã hỗ trợ `readOnly`.

## 4. Luồng nghiệp vụ

```text
Hồ sơ thí sinh
    │
    ├── Hội đồng xét tuyển đánh giá ket_qua = trung_tuyen
    │
    ├── Backend đồng bộ HosoThisinh.status = TRUNG_TUYEN
    │
    └── HosoTrungtuyenComponent
            ├── Truy vấn HosoThisinhService
            ├── Luôn lọc status = TRUNG_TUYEN
            ├── Hiển thị danh sách chỉ đọc
            ├── Xem chi tiết hồ sơ
            └── Xem lịch sử tư vấn chỉ đọc
```

Nguồn kết quả hiện có:

- `hoidong_hoso_thisinh.ket_qua`: giá trị nghiệp vụ `trung_tuyen`.
- `HosoThisinh.status`: mã `TRUNG_TUYEN` trong `TH_XETTUYEN`.
- Danh sách dùng `HosoThisinhService`, giống các màn hồ sơ hiện tại.

Điều kiện phụ thuộc:

> Backend cần đồng bộ kết quả hội đồng `trung_tuyen` sang `hoso-tuyensinh.status = 'TRUNG_TUYEN'`. Component không tự ghép dữ liệu hội đồng và không sửa service để bù việc chưa đồng bộ.

## 5. Giới hạn sử dụng service

Component chỉ inject API hiện có:

| Service | Mục đích |
|---|---|
| `HosoThisinhService` | Query danh sách; lấy chi tiết hồ sơ |
| `DotXettuyenService` | Tải danh mục đợt xét tuyển |
| `ApiOutsiteService` | Tải ngành và CTĐT |
| `LocationService` | Tải tỉnh/thành |
| `AuthenticationService` | Lấy quyền màn hình |

Quy tắc:

- Không thêm method vào bất kỳ service nào.
- Không đổi endpoint hoặc model dùng chung.
- Component tự tạo `IctuConditionParam[]` mới cho mỗi request.
- Điều kiện `TRUNG_TUYEN` cố định trong `buildConditions()`; không đưa vào object filter có thể reset.
- Bộ lọc người dùng chỉ bổ sung điều kiện.

## 6. Phân quyền

Permission key đề xuất: `hoso-trungtuyen`, đồng nhất route và pattern màn chuyên biệt `hoso-khongtrungtuyen`.

```typescript
readonly permissionControl = signal(
    new IctuPermissionControl(
        this.authenticationService.getUserPermission('hoso-trungtuyen'),
    ),
);
```

| Quyền | Hành vi |
|---|---|
| `canView = false` | Không gọi API danh sách/danh mục; hiển thị không có quyền |
| `canView = true` | Xem bảng, lọc, phân trang, chi tiết, lịch sử tư vấn |
| `canCreate` | Không có hiệu lực; không được thêm hồ sơ |
| `canUpdate` | Không có hiệu lực với mọi vai trò, kể cả admin; không được cập nhật hồ sơ |
| `canDelete` | Không có hiệu lực với mọi vai trò, kể cả admin; không được xóa đơn lẻ hoặc hàng loạt |

Component không khai báo form cập nhật, checkbox chọn dòng, handler cập nhật/xóa hoặc lời gọi API mutation.

`TuvanTuyensinhComponent` nhận `[readOnly]="true"`; phạm vi dữ liệu bên trong giữ logic hiện có.

> Backend vẫn phải kiểm tra quyền từ access token. `readOnly` frontend không thay thế phân quyền API.

## 7. Cấu trúc giao diện

```text
HosoTrungtuyenComponent
├── Header
│   ├── Biểu tượng thư mục
│   ├── Tiêu đề: Danh sách hồ sơ trúng tuyển
│   └── Công cụ
│       ├── Tìm theo họ tên/SĐT
│       ├── Chọn đợt xét tuyển
│       └── Mở bộ lọc nâng cao
├── Bộ lọc nâng cao dạng popover
│   ├── CCCD
│   ├── Ngành
│   ├── Tỉnh/TP
│   ├── Nơi sinh
│   ├── Dân tộc
│   ├── Áp dụng
│   └── Reset
├── Bảng chỉ đọc
│   ├── #
│   ├── Họ tên + menu
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
└── Drawer xem chi tiết — chỉ đọc
```

### 7.1. Header và bộ lọc

- Tiêu đề: **Danh sách hồ sơ trúng tuyển**.
- Search dùng `type="search"`, placeholder `Họ tên hoặc số điện thoại`.
- Enter tìm kiếm và về trang 1.
- Chọn đợt xét tuyển tự tìm kiếm; hỗ trợ clear.
- Bộ lọc nâng cao nằm trong `p-popover` để giữ chiều cao bảng.
- **Áp dụng** đóng popover, tải trang 1.
- **Reset** chỉ xóa filter người dùng; query vẫn giữ `TRUNG_TUYEN`.

### 7.2. Bảng

- Không checkbox, không thao tác bulk.
- Sticky header.
- Sticky bốn cột: `#`, `Họ tên`, `CCCD`, `SĐT`.
- Cột còn lại cuộn ngang.
- Họ tên ellipsis khi dài.
- Giá trị trống hiển thị `—`.
- `TRUNG_TUYEN` dùng badge success.
- Empty state: `Không có hồ sơ trúng tuyển.`

### 7.3. Menu từng dòng

Chỉ gồm:

1. **Quá trình tư vấn**.
2. **Xem hồ sơ**.

Không có **Cập nhật**, **Xóa**, **Đổi trạng thái**.

### 7.4. Drawer quá trình tư vấn

```html
<app-tuvan-tuyensinh
    [hoso]="selectedConsultationHoso()"
    [readOnly]="true" />
```

- Rộng `600px`, tối đa `100%`.
- Header dùng họ tên hồ sơ.
- Khi đóng: reset visibility và hồ sơ chọn.
- Truyền bản sao `{ ...row }`; không mutate row.
- Không sửa component con.

### 7.5. Drawer chi tiết

Các section:

1. **Thông tin cá nhân**: họ tên, ngày sinh, nơi sinh, dân tộc, địa chỉ.
2. **Giấy tờ tùy thân**: CCCD, ngày cấp, nơi cấp.
3. **Thông tin liên hệ**: SĐT, email.
4. **Thông tin đăng ký**: đợt, ngành, CTĐT, hình thức xét tuyển, điểm xét tuyển.
5. **Trạng thái**: badge trúng tuyển, nguồn đăng ký.

State riêng:

- `loading`: đang tải chi tiết.
- `success`: hiển thị dữ liệu.
- `error`: thông báo và nút tải lại.
- Đóng drawer: xóa record, ID chọn, state chi tiết.
- Chỉ nhận response khớp `selectedDetailId`, tránh request cũ ghi đè hồ sơ mới.

## 8. State component

```typescript
type ViewState = 'idle' | 'loading' | 'success' | 'error' | 'forbidden';
type DetailState = 'idle' | 'loading' | 'success' | 'error';

readonly state = signal<ViewState>('idle');
readonly detailState = signal<DetailState>('idle');
readonly dataTable = new IctuDataTable<HosoThisinh>();
readonly dots = signal<IctuDropdownOption<number>[]>([]);
readonly majors = signal<IctuDropdownOption<number>[]>([]);
readonly programs = signal<IctuDropdownOption<number>[]>([]);
readonly tinhList = signal<IctuDropdownOption<number>[]>([]);
readonly consultationDrawerVisible = signal(false);
readonly selectedConsultationHoso = signal<HosoThisinh | null>(null);
readonly viewDetailVisible = signal(false);
readonly viewDetailData = signal<HosoThisinh | null>(null);
readonly selectedDetailId = signal<number | null>(null);
```

Vòng đời:

- Triển khai `OnInit`, `OnDestroy`, `IctuBasePermission`.
- Dùng `Subject<void>` và `takeUntil(onDestroy$)`.
- Không mutate response hoặc row.
- Lưu `lastRequest` để retry đúng trang.

## 9. Search model nội bộ

Khai báo trong `hoso-trungtuyen.component.ts`; không sửa model/service:

```typescript
interface HosoTrungTuyenSearchInfo {
    search: string;
    dot_xet_tuyen_id?: number;
    nganh_id?: number;
    cccd?: string;
    tinh_id?: number;
    noi_sinh?: number;
    dan_toc?: string;
}
```

Reset:

```typescript
{
    search: '',
    dot_xet_tuyen_id: undefined,
    nganh_id: undefined,
    cccd: undefined,
    tinh_id: undefined,
    noi_sinh: undefined,
    dan_toc: undefined,
}
```

Không lưu `status` trong object filter.

## 10. Query bắt buộc

Mỗi lần tải bắt đầu bằng:

```typescript
{
    conditionName: 'status',
    value: 'TRUNG_TUYEN',
    condition: IctuQueryCondition.equal,
}
```

Sau đó thêm:

- Search trim: `full_name LIKE` hoặc `phone LIKE`.
- Đợt: `dot_xet_tuyen_id =`.
- Ngành: `nganh_id =`, đồng nhất model `HosoThisinh`.
- CCCD: `cccd LIKE`.
- Tỉnh/TP: `tinh_id =`.
- Nơi sinh: model là ID tỉnh, dùng select và `noi_sinh =`; không dùng text `LIKE`.
- Dân tộc: `dan_toc =`.

Query params:

```typescript
{
    limit: dataTable.paginator.rows(),
    paged,
    order: 'DESC',
    orderby: 'created_at',
}
```

## 11. Tải danh mục

Dùng `forkJoin` trong component:

- `DotXettuyenService.load(...)` → `{ value: id, label: name }`.
- `ApiOutsiteService.getNganhList()` → item `type === 'nganh'`.
- `ApiOutsiteService.getCtdtList()` → nhãn `mã — tên`.
- `LocationService.queryLocation(..., 'regions')` → tỉnh/thành.

Xử lý lỗi:

- Không `canView`: không tải lookup/danh sách.
- Lỗi danh sách: `state = 'error'`, xóa bảng.
- Lỗi chi tiết: chỉ `detailState = 'error'`.
- Lookup thiếu: hiển thị `#ID` hoặc `—`.

## 12. Helper hiển thị

```typescript
statusLabel(status?: string): string
statusBadgeClass(status?: string): string
majorLabel(id?: number): string
programLabel(id?: number): string
dotLabel(id?: number): string
tinhLabel(id?: number): string
```

Mapping chính:

```text
TRUNG_TUYEN → Trúng tuyển / ictu-badge--success
```

## 13. Responsive và accessibility

### Desktop

- Chiều cao `100vh`.
- Header, body, paginator theo flex column.
- Bảng chiếm phần còn lại; scroll trong wrapper.
- Sticky columns giữ thông tin định danh.

### Mobile/tablet

- Header actions xuống dòng.
- Search/select toàn chiều rộng.
- Filter một cột.
- Nút Áp dụng/Reset chia đều chiều rộng.
- Drawer tối đa `100%` viewport.
- Field chi tiết chuyển sang label/value xếp dọc.

### Accessibility

- Button có `type="button"`.
- Nút icon có `aria-label`.
- Icon trang trí có `aria-hidden="true"`.
- Error/forbidden dùng `role="alert"`.
- Focus state rõ ràng.
- Table header dùng nhãn văn bản rõ nghĩa.

## 14. Kế hoạch triển khai sau khi duyệt

### Phase 1 — Logic

File: `hoso-trungtuyen.component.ts`

1. Chuyển skeleton thành standalone component đầy đủ.
2. Import UI modules và component con cần thiết.
3. Inject service hiện có.
4. Khởi tạo quyền, state, table, paginator, lookup.
5. Tạo search model nội bộ.
6. Tạo `buildConditions()` với invariant `TRUNG_TUYEN`.
7. Triển khai load/search/filter/reset/pagination/retry.
8. Triển khai hai drawer.
9. Triển khai helper nhãn/badge.
10. Hủy subscription khi destroy.

### Phase 2 — Template

File: `hoso-trungtuyen.component.html`

1. Loading/forbidden/error states.
2. Header và bộ lọc.
3. Bảng chỉ đọc.
4. Empty state và paginator.
5. Menu hai thao tác.
6. Drawer lịch sử `readOnly`.
7. Drawer chi tiết có loading/error/retry.

### Phase 3 — Style

File: `hoso-trungtuyen.component.css`

1. Kế thừa bố cục bảng từ `hoso-khongtrungtuyen`.
2. Sticky header/columns.
3. Style filter, menu, empty/error states.
4. Style drawer chi tiết.
5. Responsive breakpoint `768px`.

### Phase 4 — Kiểm thử

1. Type-check/build frontend.
2. Chạy unit tests liên quan.
3. Mở route `hoso-trungtuyen` trên trình duyệt.
4. Kiểm tra tải, tìm, lọc, phân trang, hai drawer.
5. Kiểm tra empty, API lỗi, detail lỗi, không quyền, đổi hồ sơ nhanh.
6. Kiểm tra responsive và browser console.
7. Review code sau triển khai.

## 15. File tác động khi triển khai

| File | Hành động |
|---|---|
| `hoso-trungtuyen.component.ts` | Logic component |
| `hoso-trungtuyen.component.html` | Giao diện |
| `hoso-trungtuyen.component.css` | Style responsive |

Không thay đổi:

- `HosoThisinhService`.
- Model `HosoThisinh`.
- `tuvan-tuyensinh`.
- `hoso-routing.module.ts`.
- `hoso.module.ts`.
- Component hồ sơ khác.

## 16. Rủi ro

| Mức độ | Rủi ro | Xử lý |
|---|---|---|
| Trung bình | Backend chưa đồng bộ kết quả hội đồng sang `HosoThisinh.status` | Xác nhận API; frontend vẫn query đúng `TRUNG_TUYEN` |
| Trung bình | Permission key `hoso-trungtuyen` chưa cấu hình | Xác nhận cấu hình quyền; không đổi key âm thầm |
| Trung bình | Tên field ngành giữa code cũ và model không đồng nhất | Dùng `nganh_id`; xác minh request khi test |
| Thấp | Lookup lỗi | Hiển thị `#ID` hoặc `—` |
| Thấp | Request chi tiết cũ trả muộn | So khớp `selectedDetailId` |
| Thấp | Bảng rộng trên mobile | Scroll ngang và sticky columns |

## 17. Tiêu chí nghiệm thu

- Hiện tiêu đề **Danh sách hồ sơ trúng tuyển**.
- Chỉ hồ sơ `TRUNG_TUYEN` xuất hiện.
- Reset không làm mất điều kiện trạng thái.
- Search, filter, phân trang hoạt động.
- Không checkbox, thêm, cập nhật, xóa hoặc đổi trạng thái với mọi quyền, kể cả admin.
- Không có handler hoặc request API cập nhật/xóa.
- Badge trúng tuyển màu success.
- Menu chỉ có quá trình tư vấn và xem hồ sơ.
- Lịch sử đúng hồ sơ, chỉ đọc.
- Drawer chi tiết đúng record; có loading/error/retry.
- Không lẫn dữ liệu khi đổi hồ sơ nhanh.
- Không request khi `canView = false`.
- UI responsive.
- Build/type-check và test liên quan thành công.
- Không sửa file ngoài ba file component.

## 18. Độ phức tạp

**Trung bình**.

Phần lớn cấu trúc kế thừa từ `HosoKhongtrungtuyenComponent`; khác biệt chính: điều kiện `TRUNG_TUYEN`, badge success, permission key màn hình.