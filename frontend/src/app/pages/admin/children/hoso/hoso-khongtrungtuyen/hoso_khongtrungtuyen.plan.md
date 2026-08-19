# HosoKhongtrungtuyenComponent

## 1. Trạng thái

- **Đã triển khai màn danh sách chỉ đọc.**
- Đã đối chiếu các cập nhật gần đây của `HosoTrungtuyenComponent`.
- Trạng thái hồ sơ dùng model số: `HosoStatus = -1`.
- Danh mục ngành và CTĐT dùng service nội bộ.
- Không sửa component dùng chung, route hoặc service.

## 2. Mục tiêu

`HosoKhongtrungtuyenComponent` hiển thị riêng hồ sơ có kết quả **Không trúng tuyển**.

Yêu cầu:

- Mỗi request danh sách luôn có điều kiện `status = '-1'`.
- Giao diện bảng, bộ lọc, phân trang và drawer đồng nhất với `HosoTrungtuyenComponent`.
- Màn hình chỉ đọc: không thêm, cập nhật, xóa hoặc đổi kết quả hồ sơ.
- Cho phép xem chi tiết hồ sơ và quá trình tư vấn.
- Quá trình tư vấn dùng `[readOnly]="true"`.
- Người không có `canView` không gọi API danh sách hoặc danh mục.

## 3. Quy ước trạng thái

Model hiện tại:

```typescript
export type HosoStatus = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6;
```

Trạng thái cố định của màn:

```typescript
const NON_ADMITTED_STATUS: HosoStatus = -1;
```

`TH_XETTUYEN` ánh xạ:

```text
value: -1
kyhieu: KHONG_TRUNG_TUYEN
label: Không trúng tuyển
```

`KHONG_TRUNG_TUYEN` là ký hiệu hiển thị/tương thích dữ liệu cũ. Query hiện tại phải dùng mã số được chuyển thành chuỗi theo cấu trúc `IctuConditionParam`:

```typescript
{
    conditionName: 'status',
    value: `${NON_ADMITTED_STATUS}`,
    condition: IctuQueryCondition.equal,
}
```

Bộ lọc người dùng chỉ bổ sung điều kiện; `resetFilter()` không loại bỏ điều kiện trạng thái cố định.

## 4. Phân quyền

Permission key thực tế:

```typescript
readonly permissionControl = signal(
    new IctuPermissionControl(
        this.authenticationService.getUserPermission('hoso-khongtrungtuyen'),
    ),
);
```

| Quyền | Hành vi |
|---|---|
| `canView = false` | Hiển thị forbidden; không gọi API danh sách/danh mục |
| `canView = true` | Xem bảng, bộ lọc, phân trang, chi tiết, lịch sử tư vấn |
| `canCreate` | Không có hiệu lực |
| `canUpdate` | Không có hiệu lực |
| `canDelete` | Không có hiệu lực |

Quy tắc chỉ đọc áp dụng cho mọi vai trò. Backend vẫn phải kiểm tra quyền từ access token.

## 5. Dịch vụ và nguồn dữ liệu

| Service | Mục đích |
|---|---|
| `HosoThisinhService` | Query danh sách; lấy chi tiết hồ sơ |
| `DotXettuyenService` | Tải danh mục đợt xét tuyển |
| `NganhhocService` | Tải danh mục ngành nội bộ |
| `ChuongtrinhDaotaoService` | Tải danh mục CTĐT nội bộ |
| `LocationService` | Tải tỉnh/thành |
| `AuthenticationService` | Lấy quyền màn hình |

Không dùng `ApiOutsiteService` cho ngành và CTĐT.

Ánh xạ lookup:

```text
DotXettuyen: id / name
Nganhhoc: id / name
ChuongtrinhDaotao: id / "code — name"
Locations: id / name
```

Tất cả lookup tải song song bằng `forkJoin`, giới hạn `-1`, hủy subscription bằng `takeUntil(onDestroy$)`.

## 6. Chức năng đã triển khai

- Tìm theo họ tên hoặc số điện thoại.
- Lọc nhanh theo đợt xét tuyển.
- Lọc nâng cao theo CCCD, ngành, tỉnh/thành, nơi sinh, dân tộc.
- Reset bộ lọc và quay về trang đầu.
- Phân trang server-side.
- Loading, error/retry, forbidden và empty state.
- Bảng cuộn ngang; các cột định danh sticky.
- Menu từng dòng gồm **Quá trình tư vấn** và **Xem hồ sơ**.
- Drawer quá trình tư vấn chỉ đọc.
- Drawer chi tiết có loading, error/retry và chống response cũ ghi đè record mới.
- Giá trị trống hiển thị `—`; lookup thiếu hiển thị `#ID`.
- Badge `Không trúng tuyển` dùng `ictu-badge--danger`.

Không triển khai:

- Thêm, cập nhật, xóa hồ sơ.
- Checkbox hoặc thao tác hàng loạt.
- Đổi trạng thái/kết quả xét tuyển.
- Gán hồ sơ vào hội đồng.
- Thêm hoặc xóa lịch sử tư vấn.

## 7. State chính

```typescript
type ViewState = 'idle' | 'loading' | 'success' | 'error' | 'forbidden';
type DetailState = 'idle' | 'loading' | 'success' | 'error';

readonly state = signal<ViewState>('idle');
readonly detailState = signal<DetailState>('idle');
readonly dataTable = new IctuDataTable<HosoThisinh>();
readonly consultationDrawerVisible = signal(false);
readonly selectedConsultationHoso = signal<HosoThisinh | null>(null);
readonly viewDetailVisible = signal(false);
readonly viewDetailData = signal<HosoThisinh | null>(null);
readonly selectedDetailId = signal<number | null>(null);
```

Row được sao chép bất biến khi mở lịch sử: `{ ...row }`.

## 8. Cấu trúc giao diện

```text
HosoKhongtrungtuyenComponent
├── Header
│   ├── Tiêu đề
│   ├── Tìm kiếm
│   ├── Chọn đợt xét tuyển
│   └── Bộ lọc nâng cao
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
└── Drawer chi tiết — chỉ đọc
```

## 9. File liên quan

| File | Vai trò |
|---|---|
| `hoso-khongtrungtuyen.component.ts` | Logic, query, lookup, state, drawer |
| `hoso-khongtrungtuyen.component.html` | Bảng, filter, menu, drawer |
| `hoso-khongtrungtuyen.component.css` | Layout, sticky columns, responsive |
| `hoso_khongtrungtuyen.plan.md` | Tài liệu thực trạng và tiêu chí nghiệm thu |

Không thay đổi:

- `HosoThisinhService`.
- Model `HosoThisinh`.
- `TuvanTuyensinhComponent`.
- Route/module.
- `FormThongtinDangkyComponent`.

## 10. Tiêu chí nghiệm thu

- Tiêu đề đúng: **Danh sách hồ sơ không trúng tuyển**.
- Query luôn chứa `status = '-1'`.
- Reset không làm mất điều kiện trạng thái.
- Nhãn trạng thái hiển thị **Không trúng tuyển** cho mã `-1`; ký hiệu cũ `KHONG_TRUNG_TUYEN` vẫn hiển thị đúng.
- Badge trạng thái dùng danger.
- Ngành và CTĐT lấy từ service nội bộ, cùng nguồn với màn trúng tuyển.
- Search, filter, reset và phân trang hoạt động.
- Không có thao tác mutation.
- Hai drawer đúng hồ sơ; lịch sử tư vấn chỉ đọc.
- Không gọi API khi `canView = false`.
- Build frontend thành công.
- Kiểm tra route thực tế không có lỗi console hoặc request thất bại do component.

## 11. Kết quả xác minh

- Angular production build: **thành công**.
- Development bundle: **biên dịch thành công**.
- Lazy chunk `hoso-khongtrungtuyen-component`: **được tạo thành công**.
- TypeScript/template check thông qua quá trình build: **không có lỗi**.
- Diff TypeScript đã review: **không phát hiện lỗi mức cao**.
- Unit spec: **bỏ qua theo yêu cầu hiện tại**.
- Kiểm thử UI trực quan: **chưa thực hiện** do Playwright MCP Bridge chưa khả dụng.

## 12. Kiểm tra thủ công còn lại

1. Mở route `hoso-khongtrungtuyen` bằng tài khoản có quyền.
2. Kiểm tra dữ liệu ngành/CTĐT, badge, search, filter, reset và paginator.
3. Kiểm tra drawer quá trình tư vấn và drawer chi tiết.
4. Kiểm tra forbidden, empty, API error và detail error.
5. Kiểm tra responsive và browser console.