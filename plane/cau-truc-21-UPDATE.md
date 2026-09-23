# Phân Tích Cấu Trúc Component `hoso-xettuyen` (Angular 19)

Tài liệu này phân tích chi tiết cấu trúc HTML và TypeScript của component `HosoXettuyenComponent` tại:
- **HTML**: `frontend/src/app/pages/admin/children/hoso/hoso-xettuyen/hoso-xettuyen.component.html`
- **TypeScript**: `frontend/src/app/pages/admin/children/hoso/hoso-xettuyen/hoso-xettuyen.component.ts`

---

## 1. Tổng Quan Về Component

- **Loại component**: Standalone Component (`standalone: true`).
- **Selector**: `app-hoso-xettuyen`
- **Imports trong Component**:
  - **Angular Common & Forms**: `FormsModule`, `ReactiveFormsModule`
  - **PrimeNG**: `Drawer`, `InputText`, `Select`, `Popover`
  - **Angular Material**: `MatButton`, `MatCheckbox`
  - **Component nội bộ / Theme**:
    - `IctuPaginatorComponent` (phân trang chuẩn ICTU)
    - `LoadingProgressComponent` (tiến trình tải)
    - `FormThongtinDangkyComponent` (form chi tiết/cập nhật hồ sơ)
    - `TuvanTuyensinhComponent` (quá trình tư vấn tuyển sinh)

---

## 2. Cấu Trúc HTML Template

Template sử dụng cú pháp **Modern Control Flow** của Angular 17+ kết hợp với các kỹ thuật binding chuẩn.

### 2.1. Cú pháp điều khiển (Control Flow Syntax)

| Cú pháp | Vị trí sử dụng tiêu biểu trong template | Mục đích |
| :--- | :--- | :--- |
| `@if (condition)` | `@if (state() === 'loading')` | Hiển thị màn loading khi đang tải danh sách |
| `@if (condition) ... @else` | `@if (state() !== 'error') { ... } @else { ... }` | Hiển thị nội dung bảng hoặc thông báo lỗi kèm nút tải lại |
| `@if (expr; as alias)` | `@if (editData(); as record)`<br>`@if (viewData(); as record)`<br>`@if (viewDetailData(); as hs)` | Kiểm tra dữ liệu tồn tại và gán alias để truyền vào form/view con |
| `@if` với quyền | `@if (isAdmin)`<br>`@if (isAdmin \|\| isduyethoso)`<br>`@if (canExport())`<br>`@if (canViewApplication())`<br>`@if (permissionControl().canUpdate)` | Ẩn/hiện các cột, nút hành động, menu chức năng theo phân quyền người dùng |
| `@for (... track ...)` | `@for (row of dataTable.data(); track row.id; let i = $index)` | Render từng dòng dữ liệu trong bảng với tracking theo `row.id` và lấy chỉ số `$index` |
| `@empty` | `@empty { <tr><td [colSpan]="...">Không có bản ghi nào.</td></tr> }` | Hiển thị khi mảng dữ liệu trống |
| `@switch ... @case` | `@switch (formControl.state()) {`<br>&nbsp;&nbsp;`@case ('READY') { ... }`<br>&nbsp;&nbsp;`@case ('PREPARATION_FAILED') { ... }`<br>`}` | Quản lý trạng thái nạp dữ liệu cho Drawer form thêm mới/sửa |

### 2.2. Các loại Data Binding trong HTML

#### a. Property Binding `[property]="expression"`
- `[checked]`: Gán trạng thái checkbox (`[checked]="onlyMyRecords()"`, `[checked]="row._ictuDataTableRowChecked"`).
- `[disabled]`: Khóa tương tác (`[disabled]="exportLoading()"`, `[disabled]="!permissionControl().canUpdate"`).
- `[options]`: Nạp danh sách dropdown cho PrimeNG Select (`[options]="dots()"`, `[options]="tinhList()"`).
- `[formGroup]`: Liên kết Reactive Form (`[formGroup]="formControl.formGroup"`).
- `[style]`: Cấu hình độ rộng cho drawer (`[style]="{'width':'1024px', 'max-width':'100%'}"`).
- `[attr.*]`: Accessibility attributes (`[attr.aria-busy]="exportLoading()"`).
- `[class.*]`: Gán class có điều kiện (`[class.ti-loader]="exportLoading()"`).

#### b. Event Binding `(event)="handler($event)"`
- `(click)`: Xử lý click (`(click)="onExportData()"`, `(click)="editItem(row)"`).
- `(change)`: Sự kiện thay đổi của checkbox (`(change)="onOnlyMyRecordsChange($event.checked)"`).
- `(onChange)`: Sự kiện chọn dropdown PrimeNG (`(onChange)="onSearch()"`).
- `(keyup.enter)`: Bấm Enter ở ô tìm kiếm (`(keyup.enter)="onSearch()"`).
- `(onHide)`: Bắt sự kiện đóng Drawer (`(onHide)="editData.set(null)"`).

#### c. Two-way Data Binding `[(ngModel)]="property"` / `[(visible)]="signal"`
- `[(ngModel)]`: Liên kết dữ liệu bộ lọc tìm kiếm (`[(ngModel)]="searchInfo.search"`, `[(ngModel)]="searchInfo.dotxettuyen_id"`).
- `[(visible)]`: Đóng mở Drawer của PrimeNG (`[(visible)]="editDrawerVisible"`, `[(visible)]="formControl.visible"`).

#### d. Template Reference Variables & ng-template
- `#op`: Tham chiếu tới `p-popover` bộ lọc nâng cao.
- `#btnevent`: Tham chiếu tới `p-popover` menu hành động trên từng dòng dữ liệu.
- `#formEdit`, `#formView`, `#masterDrawer`: Tham chiếu tới các Drawer.
- `<ng-template #header let-headerClass="class">`: Tùy biến header của Drawer PrimeNG.

#### e. Interpolation `{{ expression }}`
- Hiển thị trực tiếp: `{{ row.ho_va_ten }}`, `{{ row.dien_thoai }}`, `{{ row['ma_hoso'] }}`.
- Gọi hàm mapping nhãn: `{{ statusLabel(row.status) }}`, `{{ dotLabel(row.dotxettuyen_id) }}`, `{{ tinhLabel(row.dia_chi_tinh) }}`, `{{ userLabel(row.created_by) }}`.
- Tính toán STT: `{{ dataTable.paginator.startIndex() + i }}`.

---

## 3. Cấu Trúc TypeScript (`.ts`)

File component được tổ chức theo kiến trúc hiện đại của **Angular 19**: sử dụng `inject()`, Signals, RxJS Observables, và tách biệt rõ ràng các khối chức năng.

### 3.1. Khối Dependency Injection (`inject()`)

Component không dùng constructor parameter injection cũ mà dùng hàm `inject()`:

```typescript
// Core & Forms
private auth = inject(AuthenticationService);
private notification = inject(NotificationService);
private fb = inject(FormBuilder);

// Data Services (Tuyển sinh & Danh mục)
private registrationsService = inject(RegistrationsService);
private dotService = inject(DotXettuyenService);
private nganhHocService = inject(NganhhocService);
private locationService = inject(LocationService);
private userService = inject(UserService);
private roleService = inject(RoleService);
private exportService = inject(ExpHosoTuyensinhService);
private tuyensinhStatusService = inject(RegistrationsStatusService);
```

### 3.2. Quản lý trạng thái bằng Angular Signals & Computeds

| Tên Signal | Kiểu | Ý nghĩa & Vai trò |
| :--- | :--- | :--- |
| `state` | `WritableSignal<'loading' \| 'success' \| 'error'>` | Trạng thái hiển thị giao diện bảng |
| `permissionControl` | `Signal<IctuPermissionControl>` | Quyền thao tác (View, Create, Update, Delete) |
| `canExport` | `computed(boolean)` | Quyền xuất Excel (dựa trên vai trò và không phải reviewer) |
| `canViewApplication`| `computed(boolean)` | Quyền xem hồ sơ của vai trò reviewer |
| `exportLoading` | `WritableSignal<boolean>` | Cờ hiển thị trạng thái đang xuất file Excel |
| `onlyMyRecords` | `WritableSignal<boolean>` | Lọc: Chỉ lấy hồ sơ tôi đang phụ trách xét duyệt |
| `onlyByUser` | `WritableSignal<boolean>` | Lọc: Chỉ lấy hồ sơ do chính tôi tạo/sở hữu |
| `showAdvancedFilter`| `WritableSignal<boolean>` | Ẩn/hiện bộ lọc mở rộng |
| `dots` | `WritableSignal<IctuDropdownOption<number>[]>` | Danh mục Đợt xét tuyển |
| `majors` | `WritableSignal<IctuDropdownOption<number>[]>` | Danh mục Ngành học |
| `majorFilterOptions`| `WritableSignal<IctuDropdownOption<string>[]>`| Tùy chọn tên ngành cho bộ lọc tìm kiếm |
| `tinhList` | `WritableSignal<IctuDropdownOption<number>[]>` | Danh mục Tỉnh/Thành phố |
| `users` | `WritableSignal<User[]>` | Danh sách người dùng hệ thống để map nhãn |
| `editData` | `WritableSignal<Registrations \| null>` | Bản ghi hồ sơ truyền vào drawer Cập nhật |
| `viewData` | `WritableSignal<Registrations \| null>` | Bản ghi hồ sơ truyền vào drawer Xem |
| `viewDetailData` | `WritableSignal<Registrations \| null>` | Bản ghi chi tiết nạp qua API get(id) |
| `selectedReviewerRecords` | `computed<Registrations[]>` | Danh sách hồ sơ đang được chọn để gán cán bộ duyệt |

### 3.3. View Query (`viewChild`)

- `readonly drawer = viewChild<Drawer>('masterDrawer');`: Lấy tham chiếu drawer template theo cú pháp Signal Query mới của Angular.

### 3.4. Khối Dữ Liệu & Bộ Lọc Thường (Non-Signal State)

- `searchInfo`: Đối tượng lưu trữ các giá trị lọc:
  - `search`, `status`, `dotxettuyen_id`, `nganh_dangky`, `cccd`, `dia_chi_tinh`, `noi_sinh`, v.v.
- `dataTable: IctuDataTable<Registrations>`: Quản lý data table, danh sách bản ghi đã chọn, phân trang.
- `formControl: IctuFormControl2<Registrations>`: Quản lý Form Reactive và Drawer.
- Flags phân quyền tính sẵn theo người dùng đăng nhập:
  - `isAdmin`, `isduyethoso`, `isreview`, `isnv`, `isDoitac`.
- Bảng ánh xạ tĩnh:
  - `danTocOptions`: Lấy từ `DanToc` trong `syscats.ts`.
  - `statusOptions`: Lấy từ `TH_XETTUYEN` trong `syscats.ts`.
  - `statusBadgeMap`: Bảng map status code ra class badge CSS tương ứng.

### 3.5. Vòng đời Component (Lifecycle Hooks)

- `ngOnInit()`:
  - Gọi `this.loadLookups()` để tải song song các danh mục cần thiết.
- `ngOnDestroy()`:
  - Phát tín hiệu `this.onDestroy$.next()` và `this.onDestroy$.complete()` để hủy toàn bộ subscription qua toán tử `takeUntil(this.onDestroy$)`.

### 3.6. Xử Lý Luồng Bất Đồng Bộ (RxJS Patterns)

1. **Tải danh mục song song (`forkJoin`)**:
   - Trong `loadLookups()`, kết hợp các API `dotService.load()`, `nganhHocService.load()`, `locationService.queryLocation()`, `userService.query()` chạy đồng thời. Khi hoàn tất mới gọi `this.loadData(1, true)`.
2. **Chuyển đổi dữ liệu và giải quyết tuần tự (`concatMap`, `toArray`)**:
   - Trong `saveReviewerAssignments()`: dùng `from(records).pipe(concatMap(...), toArray())` để cập nhật cán bộ duyệt cho từng hồ sơ được chọn một cách an toàn và tuần tự.
3. **Phân giải trạng thái theo chuỗi đệ quy (`loopGetSatus`)**:
   - Kiểm tra và gọi `tuyensinhStatusService.query` nạp trạng thái hồ sơ từng bước.
4. **Xử lý tiến trình xuất Excel đa bước (`switchMap`, `tap`, `finalize`)**:
   - Bắt đầu với `notification.startProgressAnimation`, tải dữ liệu qua `registrationsService.query`, chuyển tiếp sang `loadExportPayload()`, sau đó gọi `exportService.exportExcel()` dạng Promise qua `from(...)`.

### 3.7. Phân Loại Các Nhóm Hàm Nghiệp Vụ (Methods)

| Nhóm chức năng | Tên hàm | Trách nhiệm chính |
| :--- | :--- | :--- |
| **Data Query** | `loadLookups()` | Tải toàn bộ danh mục đợt, ngành, tỉnh, người dùng |
| | `buildConditions()` | Lắp ráp mảng điều kiện truy vấn `IctuConditionParam[]` dựa trên vai trò người dùng và form lọc |
| | `loadData(paged, reset)` | Gọi `registrationsService.query`, cập nhật trạng thái bảng và phân trang |
| | `loopGetSatus(arr, data)`| Truy vấn trạng thái bổ sung cho các bản ghi |
| **Filter & Search** | `onSearch()` | Kích hoạt tìm kiếm tại trang 1 |
| | `applyFilter()` | Áp dụng các điều kiện trong popover lọc |
| | `resetFilter()` | Xóa trắng form lọc và tải lại dữ liệu |
| | `onChangePage(paged)` | Chuyển trang bảng dữ liệu |
| | `onOnlyMyRecordsChange()` | Bật/tắt chế độ xem hồ sơ được giao duyệt |
| | `onOnlyByUserChange()` | Bật/tắt chế độ xem hồ sơ do user tạo |
| **CRUD & Actions** | `addItem()` | Kiểm tra quyền `canCreate`, mở form thêm |
| | `editItem(data)` | Kiểm tra quyền `canUpdate`, mở drawer sửa `editData` |
| | `viewApplication(data)` | Mở drawer xem hồ sơ cho reviewer |
| | `deleteItem(data)` | Mở dialog xác nhận và xóa 1 hồ sơ |
| | `deleteSelected()` | Xóa các hồ sơ đang được tích chọn trên bảng |
| | `requestDeletingData(ids)`| Thực thi xóa có animation tiến trình qua `IctuDeletingAnimationControl` |
| | `reload(event)` | Tải lại bảng dữ liệu khi có lỗi |
| **Consultation & Detail** | `openLichSu(row)` | Mở drawer quá trình tư vấn tuyển sinh (`app-tuvan-tuyensinh`) |
| | `viewDetail(row)` | Gọi API lấy chi tiết và mở drawer xem đầy đủ |
| **Gán Cán Bộ Duyệt** | `openFormDuyet()` | Kiểm tra danh sách hồ sơ được chọn, mở drawer gán cán bộ |
| | `loadReviewerOptions()` | Tải danh sách user có role `duyet_hoso` |
| | `saveReviewerAssignments()` | Lưu cán bộ duyệt cho hàng loạt hồ sơ đã chọn |
| | `closeReviewerAssignment()` | Đóng drawer gán cán bộ |
| **Export Excel** | `onExportData()` | Kiểm tra quyền, mở thanh tiến trình và xuất Excel |
| | `loadExportPayload(records)`| Chuẩn bị danh mục ngành, đợt, khu vực để xuất file |
| **Formatting / Helpers** | `statusLabel(status)` | Chuyển mã trạng thái thành tên hiển thị |
| | `statusBadgeClass(status)`| Trả về class màu badge cho từng trạng thái |
| | `majorLabel(majorId)` | Lấy tên ngành theo ID |
| | `programLabel(programId)` | Lấy tên chương trình đào tạo theo ID |
| | `dotLabel(dotId)` | Lấy tên đợt xét tuyển theo ID |
| | `tinhLabel(tinhId)` | Lấy tên tỉnh thành theo ID |
| | `userLabel(userId, email)`| Format tên hiển thị kèm username và email |
| | `getTime(timeString)` | Format ngày `dd/MM/yyyy` |

---

## 4. Bảng Ánh Xạ Giữa HTML Template Và TypeScript

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ HTML Template Element                                 TypeScript Binding        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ @if (state() === 'loading')                  <───>    state (Signal)            │
│ [(ngModel)]="searchInfo.search"              <───>    searchInfo.search         │
│ [options]="dots()"                           <───>    dots (Signal)             │
│ [checked]="onlyMyRecords()"                  <───>    onlyMyRecords (Signal)    │
│ (change)="onOnlyMyRecordsChange($event)"     <───>    onOnlyMyRecordsChange()   │
│ (click)="onExportData()"                     <───>    onExportData()            │
│ [disabled]="exportLoading()"                 <───>    exportLoading (Signal)    │
│ @for (row of dataTable.data())               <───>    dataTable.data (Signal)   │
│ {{ statusLabel(row.status) }}                <───>    statusLabel() (Method)    │
│ {{ tinhLabel(row.dia_chi_tinh) }}            <───>    tinhLabel() (Method)      │
│ (click)="editItem(row)"                      <───>    editItem() -> editData.set│
│ <p-drawer [(visible)]="editDrawerVisible">   <───>    editDrawerVisible (Signal)│
│ <app-form-thongtin-dangky [data]="record">   <───>    @if (editData(); as rec)  │
│ <ictu-paginator (onChangePage)="...")>       <───>    onChangePage()            │
│ (click)="openFormDuyet()"                    <───>    openFormDuyet()           │
│ <p-drawer [visible]="addDuyetVisible()">     <───>    addDuyetVisible (Signal)  │
│ [options]="reviewerOptions()"                <───>    reviewerOptions (Signal)  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Tóm Tắt Đặc Trưng Của Component

1. **Angular 19 Signals**: Quản lý toàn bộ state phản ứng (reactive state) bằng `signal()`, `WritableSignal` và `computed()`, loại bỏ việc sử dụng getters nặng nề.
2. **Modern Control Flow**: Toàn bộ template chuyển đổi sạch sẽ sang `@if`, `@for`, `@switch`, `@empty`, không còn lạm dụng `*ngIf`, `*ngFor`, `*ngSwitch` từ `CommonModule`.
3. **Phân quyền đa cấp**: Quyền kiểm soát chặt chẽ theo role (`isAdmin`, `isduyethoso`, `isreview`, `isnv`, `isDoitac`) từ giao diện nút bấm cho tới các điều kiện truy vấn SQL/API (`buildConditions()`).
4. **Hệ sinh thái UI kết hợp**: PrimeNG (Drawer, Select, Popover) kết hợp hài hòa với Angular Material (Button, Checkbox) và thư viện component riêng của ICTU (`IctuDataTable`, `IctuPaginator`, `LoadingProgress`).
