# Hội đồng xét tuyển — Thiết kế giao diện master-detail

## 1. Mục tiêu

Thiết kế lại màn hình `hoidong-xettuyen` theo dạng **master-detail**:

- Phần đầu chỉ hiển thị tiêu đề **Danh sách hội đồng xét tuyển**.
- Cột trái quản lý danh sách hội đồng: tìm kiếm, thêm, chọn, sửa, xóa, gán hồ sơ, phân trang.
- Cột phải hiển thị trạng thái chờ khi chưa chọn hội đồng.
- Khi chọn hội đồng, cột phải hiển thị `HoidongHosoXetduyetComponent` và truyền hội đồng qua `Input()`.
- Luồng gán/bỏ gán hồ sơ vẫn dùng `HosoListComponent` trong drawer 100vw như hiện tại.

Thiết kế tham khảo bố cục tại dự án Angular v14:

```text
D:\data\project\angular\v14\tuyensinhdttx_V2\src\app\modules\admin\features\tuyen-sinh\hoso-daduyet
```

Phạm vi tài liệu này chỉ chốt **bố cục màn hình cha và khung tích hợp component bên phải**. Giao diện, dữ liệu, nghiệp vụ xét duyệt bên trong `hoidong-hoso-xetduyet` sẽ được thiết kế riêng.

## 2. Bố cục tổng thể

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Danh sách hội đồng xét tuyển                                              │
├────────────────────────────┬───────────────────────────────────────────────┤
│ [ Tìm kiếm... ]        [+] │                                               │
│ Toolbar cố định 60px       │  Chưa chọn hội đồng:                          │
├────────────────────────────┤  giao diện chờ                                │
│                            │                                               │
│ Hội đồng xét tuyển A  [⋮]  │  ------------------------------------------   │
│ Đợt xét tuyển              │                                               │
│ Ngày xét tuyển  [Đang mở]  │  Đã chọn hội đồng:                            │
│                            │                                               │
│ Hội đồng xét tuyển B  [⋮]  │  <app-hoidong-hoso-xetduyet                   │
│ Đợt xét tuyển              │      [hoidong]="selectedHoidong()" />         │
│ Ngày xét tuyển  [Đã đóng]  │                                               │
│                            │                                               │
│ Danh sách cuộn dọc         │                                               │
├────────────────────────────┤                                               │
│       Paginator 60px       │                                               │
└────────────────────────────┴───────────────────────────────────────────────┘
        400px trên desktop               chiếm phần chiều rộng còn lại
```

Cấu trúc cấp cao:

```text
hoidong-page
├── page-header                         Phần 1
│   └── title
└── master-detail                       Phần 2
    ├── council-panel                   Cột trái
    │   ├── council-toolbar             Phần 2.1 — 60px
    │   ├── council-list                Phần 2.2 — flex + scroll-y
    │   └── council-paginator           Phần 2.3 — 60px
    └── council-detail                  Cột phải
        ├── waiting-state               Chưa chọn hội đồng
        └── app-hoidong-hoso-xetduyet   Đã chọn hội đồng
```

## 3. Phần 1 — tiêu đề

Chỉ hiển thị:

```text
Danh sách hội đồng xét tuyển
```

Yêu cầu:

- Giữ icon tiêu đề hiện có nếu phù hợp với design system.
- Không đặt search, nút thêm hoặc nút xóa hàng loạt trong phần này.
- Chiều cao cố định theo header chung của trang.
- Không cuộn cùng danh sách hội đồng.

## 4. Phần 2 — khu vực master-detail

### 4.1. Cột trái

Desktop:

```css
width: 400px;
min-width: 400px;
display: flex;
flex-direction: column;
overflow: hidden;
```

Cột trái gồm ba vùng độc lập:

1. Toolbar cố định 60px.
2. Danh sách thẻ chiếm phần chiều cao còn lại và cuộn dọc.
3. Paginator cố định 60px ở đáy.

Cột trái có `border-right` để phân tách với nội dung xét duyệt.

### 4.2. Cột phải

```css
flex: 1;
min-width: 0;
overflow: hidden;
```

Cột phải không tự cuộn toàn trang. Component con chịu trách nhiệm bố trí vùng toolbar, nội dung và paginator của chính nó ở giai đoạn thiết kế tiếp theo.

### 4.3. Chiều cao

Khu vực master-detail chiếm toàn bộ chiều cao còn lại sau header:

```css
flex: 1;
min-height: 0;
overflow: hidden;
```

`min-height: 0` là bắt buộc để danh sách thẻ cuộn đúng trong flex container và không đẩy paginator khỏi màn hình.

## 5. Phần 2.1 — toolbar danh sách hội đồng

Toolbar cao cố định `60px`, không cuộn:

```text
┌────────────────────────────┐
│ [ Tìm kiếm...        ] [+] │
└────────────────────────────┘
```

### 5.1. Search

- Chiếm toàn bộ chiều rộng còn lại.
- Placeholder: `Tìm kiếm hội đồng...`.
- Enter gọi `onSearch()` hiện có.
- Search tải lại trang 1 và reset paginator.
- Có nhãn hỗ trợ screen reader.

### 5.2. Nút thêm

- Chỉ hiển thị icon `ti ti-plus`.
- Không hiển thị chữ “Thêm hội đồng”.
- Giữ phân quyền `permissionControl().canCreate`.
- Click gọi `addItem()` và mở drawer form hiện tại.
- Có `tooltip="Thêm hội đồng"`.
- Có `aria-label="Thêm hội đồng"`.

### 5.3. Xóa hàng loạt

Không giữ chức năng xóa hàng loạt tại toolbar vì danh sách thẻ mới không sử dụng checkbox chọn nhiều. Xóa từng hội đồng được đặt trong menu của thẻ.

## 6. Phần 2.2 — danh sách thẻ hội đồng

Danh sách:

```css
flex: 1;
min-height: 0;
overflow-y: auto;
overflow-x: hidden;
```

### 6.1. Nội dung thẻ

Mỗi thẻ hiển thị:

```text
┌──────────────────────────────────┐
│ Tên hội đồng                 [⋮] │
│ Đợt xét tuyển                     │
│ [icon lịch] DD/MM/YYYY  [Trạng thái] │
└──────────────────────────────────┘
```

Thông tin:

| Dòng | Nội dung | Nguồn |
|---|---|---|
| 1 | Tên hội đồng | `row.name` |
| 2 | Tên đợt xét tuyển | `getDotName(row.dot_xettuyen_id)` |
| 3 trái | Ngày xét tuyển | `formatDate(row.thoigian_xettuyen)` |
| 3 phải | Badge trạng thái | `row.status` |

Trạng thái:

- `dang_mo` → badge **Đang mở**.
- Các trạng thái còn lại → badge **Đã đóng**.

Tên dài tối đa hai dòng, sau đó ellipsis. Thông tin phụ dùng màu chữ nhẹ hơn tên hội đồng.

### 6.2. Chọn hội đồng

- Click vùng thẻ chọn hội đồng.
- Chỉ chọn một hội đồng tại một thời điểm.
- Lưu bản sao bất biến:

```ts
selectedHoidong.set({ ...item });
```

- Không tự chọn hội đồng đầu tiên sau khi tải trang.
- Thẻ đang chọn có nền, viền trái hoặc outline nổi bật.
- Khi đổi trang/search, chỉ giữ selection nếu hội đồng đang chọn vẫn còn trong danh sách hiện tại.
- Nếu hội đồng đang chọn bị xóa hoặc không còn trong dữ liệu, reset `selectedHoidong` về `null`.

### 6.3. Keyboard và accessibility

Thẻ phải:

- Có thể focus bằng bàn phím.
- Enter hoặc Space chọn hội đồng.
- Có trạng thái `aria-selected`.
- Có focus ring rõ ràng.
- Không chỉ dùng màu sắc để biểu diễn selected state.

### 6.4. Menu chức năng

Menu `⋮` nằm góc phải thẻ. Chỉ hiển thị các mục được cấp quyền:

| Chức năng | Điều kiện | Hành động hiện có |
|---|---|---|
| Cập nhật | `canUpdate` | `editItem(row)` |
| Xóa | `canDelete` | `deleteItem(row)` |
| Gán hồ sơ | `canView` | `openHosoList(row)` |

Luồng **Gán hồ sơ** giữ nguyên:

```text
Menu thẻ
  → openHosoList(row)
  → drawer 100vw
  → <app-hoso-list [hoidong]="detailDrawerHoidong()" ... />
```

Menu hoặc từng menu item phải chặn event bubbling để click chức năng không vô tình chọn thẻ:

```ts
$event.stopPropagation();
```

### 6.5. Các trạng thái danh sách

#### Loading

- Dùng `LoadingProgressComponent` hiện có.
- Không làm mất kích thước cột trái.

#### Empty

Hiển thị giữa vùng danh sách:

```text
Chưa có hội đồng xét tuyển
```

Nếu đang search:

```text
Không tìm thấy hội đồng phù hợp
```

#### Error

Giữ thông báo và luồng `reload()` hiện có:

```text
Tải dữ liệu thất bại. Vui lòng tải lại.
```

## 7. Phần 2.3 — paginator hội đồng

Paginator:

```css
height: 60px;
flex-shrink: 0;
border-top: 1px solid var(--accent-200);
```

Yêu cầu:

- Tái dùng `IctuPaginatorComponent`.
- Tái dùng `dataTable.paginator`.
- Tái dùng `onChangePage()`.
- Search, thêm, sửa, xóa thành công tải lại từ trang 1.
- Đổi trang chỉ làm mới danh sách bên trái; vùng phải trở về trạng thái chờ nếu selection không còn hợp lệ.

## 8. Cột phải — trạng thái chờ

Khi `selectedHoidong()` là `null`, hiển thị empty state căn giữa:

```text
             [icon clipboard/users]

       Chưa chọn hội đồng xét tuyển
 Chọn một hội đồng bên trái để xem hồ sơ xét duyệt
```

Yêu cầu:

- Không dùng loading spinner vì hệ thống không chờ request.
- Không hiển thị dữ liệu của hội đồng đã chọn trước đó.
- Có nút mở danh sách hội đồng trên màn hình hẹp nếu cột trái đang thu gọn.

## 9. Cột phải — đã chọn hội đồng

Khi có hội đồng được chọn:

```html
<app-hoidong-hoso-xetduyet
    [hoidong]="selectedHoidong()">
</app-hoidong-hoso-xetduyet>
```

Component cha cần import `HoidongHosoXetduyetComponent`.

Component con cần khai báo input có kiểu rõ ràng:

```ts
readonly hoidong = input<HoidongXettuyen | null>(null);
```

Hoặc dùng `@Input()` nếu codebase yêu cầu đồng bộ với component cũ. Ưu tiên signal input vì dự án đang dùng Angular 19 và parent sử dụng signals.

Lưu ý hiện trạng:

- `hoidong-hoso-xetduyet.component.ts` đang là stub.
- `ngOnInit()` đang `throw new Error('Method not implemented.')`.
- Phải bỏ lỗi này trước khi nhúng component.
- Giai đoạn tích hợp ban đầu chỉ cần shell nhận và hiển thị hội đồng đã chọn.
- Nghiệp vụ xét duyệt, bảng hồ sơ, kết quả và ghi chú sẽ được thiết kế riêng.

## 10. Responsive

### 10.1. Desktop

- Cột trái cố định `400px`.
- Cột phải chiếm phần còn lại.
- Không xuất hiện horizontal scroll toàn trang.

### 10.2. Màn hình hẹp

Cột trái cho phép thu gọn/mở lại:

- Khi thu gọn, cột phải chiếm toàn bộ chiều rộng.
- Nút toggle hiển thị ở ranh giới hoặc toolbar phù hợp với design system.
- Toggle có `aria-expanded` và `aria-controls`.
- Trạng thái focus phải rõ.

Khi mở cột trái trên màn hình hẹp, ưu tiên một trong hai cách:

1. Panel phủ lên vùng phải.
2. Stack cột trái phía trên vùng phải.

Không ép hai cột cùng hiển thị nếu làm cột trái nhỏ hơn mức đọc được. Breakpoint cụ thể sẽ dùng breakpoint đang có của layout ứng dụng khi triển khai.

## 11. Drawer giữ nguyên

### 11.1. Drawer thêm/sửa hội đồng

Giữ nguyên:

- `masterDrawer`.
- `formControl`.
- Các trường tên hội đồng, đợt xét tuyển, ngày xét tuyển, trạng thái.
- Luồng `addItem()`, `editItem()`, `submitForm()`.

### 11.2. Drawer gán hồ sơ

Giữ nguyên:

- `detailDrawer` rộng 100vw.
- `HosoListComponent`.
- Gán hồ sơ.
- Bỏ gán hồ sơ.
- Paginator hồ sơ.

Thay đổi duy nhất: drawer được mở từ menu `⋮` của thẻ hội đồng thay vì nút hành động trong table.

## 12. Luồng dữ liệu

```text
ngOnInit
  → loadInit
  → tải danh sách đợt xét tuyển
  → loadData(1, true)
  → fill dataTable

Search
  → onSearch
  → loadData(1, true)

Đổi trang
  → onChangePage(page)
  → loadData(page, false)

Click thẻ
  → selectHoidong(item)
  → selectedHoidong.set({ ...item })
  → vùng phải render HoidongHosoXetduyetComponent

Click menu Cập nhật
  → stopPropagation
  → editItem(item)
  → masterDrawer

Click menu Xóa
  → stopPropagation
  → deleteItem(item)
  → confirm
  → reload danh sách
  → reset selection nếu item đã chọn bị xóa

Click menu Gán hồ sơ
  → stopPropagation
  → openHosoList(item)
  → detailDrawer 100vw
  → HosoListComponent
```

## 13. State cần duy trì

| State | Kiểu | Mục đích |
|---|---|---|
| `selectedHoidong` | `WritableSignal<HoidongXettuyen | null>` | Hội đồng hiển thị ở cột phải |
| `detailDrawerHoidong` | `WritableSignal<HoidongXettuyen | null>` hoặc state tương đương | Hội đồng truyền vào drawer gán hồ sơ |
| `isCouncilPanelCollapsed` | `WritableSignal<boolean>` | Thu gọn cột trái trên màn hình hẹp |
| `state` | `'loading' | 'success' | 'error'` | Trạng thái danh sách hội đồng |
| `searchInfo.search` | `string` | Từ khóa tìm kiếm |
| `dataTable` | `IctuDataTable<HoidongXettuyen>` | Danh sách + paginator |

Nên tách `selectedHoidong` và hội đồng dùng cho drawer để đóng drawer gán hồ sơ không làm mất hội đồng đang được xét duyệt ở cột phải.

## 14. File dự kiến thay đổi sau khi tài liệu được duyệt

### Màn hình cha

```text
frontend/src/app/pages/admin/children/hoidong-xettuyen/
├── hoidong-xettuyen.component.ts
├── hoidong-xettuyen.component.html
└── hoidong-xettuyen.component.css
```

Thay đổi:

- Table master → danh sách thẻ.
- Header chỉ còn tiêu đề.
- Thêm master-detail layout.
- Thêm selected state và responsive collapsed state.
- Giữ CRUD, search, paginator và hai drawer.

### Component xét duyệt

```text
frontend/src/app/pages/admin/children/hoidong-xettuyen/
└── hoidong-hoso-xetduyet/
    ├── hoidong-hoso-xetduyet.component.ts
    ├── hoidong-hoso-xetduyet.component.html
    └── hoidong-hoso-xetduyet.component.css
```

Thay đổi trong phạm vi tích hợp:

- Xóa `throw new Error`.
- Nhận `hoidong` qua Input.
- Hiển thị shell/placeholder của hội đồng đã chọn.

### Component gán hồ sơ

```text
frontend/src/app/pages/admin/children/hoidong-xettuyen/hoso-list/
```

Không thay đổi nghiệp vụ trong giai đoạn này.

## 15. Những nội dung không thực hiện trong giai đoạn giao diện cha

- Không thiết kế chi tiết bảng xét duyệt bên phải.
- Không thay đổi API.
- Không thay đổi model dữ liệu.
- Không thay đổi nghiệp vụ gán/bỏ gán hồ sơ.
- Không thêm xóa hàng loạt hội đồng.
- Không tự động chọn hội đồng đầu tiên.

## 16. Rủi ro cần kiểm soát

1. `hoidong-hoso-xetduyet` đang throw error khi khởi tạo.
2. Menu trong thẻ có thể làm thay đổi selection nếu thiếu `stopPropagation()`.
3. Thiếu `min-height: 0` làm danh sách không scroll và paginator bị đẩy khỏi màn hình.
4. Dùng chung một selected state cho vùng phải và drawer có thể làm mất selection khi drawer đóng.
5. Sau xóa/search/đổi trang, selection cũ có thể trỏ đến item không còn hiển thị.
6. Cột trái 400px có thể gây tràn trên màn hình hẹp nếu không có collapsed/overlay mode.
7. Chỉ dùng màu cho selected state sẽ không đáp ứng accessibility.

## 17. Tiêu chí nghiệm thu sau khi triển khai code

### Bố cục

- Phần 1 chỉ có tiêu đề.
- Cột trái rộng 400px trên desktop.
- Toolbar trái cao đúng 60px.
- Paginator trái cao đúng 60px.
- Chỉ danh sách thẻ cuộn dọc.
- Cột phải không bị tràn ngang toàn trang.

### Chức năng

- Enter trong search tải lại trang 1.
- Nút plus mở drawer thêm hội đồng.
- Click thẻ chọn đúng một hội đồng.
- Hội đồng được chọn truyền đúng sang `hoidong-hoso-xetduyet`.
- Chưa chọn hiển thị waiting state.
- Sửa, xóa, gán hồ sơ hoạt động từ menu thẻ.
- Click menu không đổi selection ngoài ý muốn.
- Drawer gán hồ sơ hoạt động như trước.
- Xóa hội đồng đang chọn đưa vùng phải về waiting state.

### Responsive và accessibility

- Cột trái thu gọn/mở lại trên viewport hẹp.
- Keyboard chọn được thẻ bằng Enter/Space.
- Nút icon có tooltip và `aria-label`.
- Focus ring hiển thị rõ.
- Toggle có `aria-expanded`.

### Kỹ thuật

- Angular build/type-check thành công.
- Test component liên quan thành công.
- Không có lỗi console khi chọn hội đồng hoặc mở drawer.
- Kiểm thử trực tiếp bằng browser ở desktop và viewport hẹp.

## 18. Trạng thái phê duyệt

- [x] Bố cục master-detail.
- [x] Cột trái 400px + responsive thu gọn.
- [x] Toolbar trái 60px.
- [x] Danh sách hội đồng dạng thẻ dọc.
- [x] Danh sách thẻ scroll-y.
- [x] Paginator cố định đáy.
- [x] Cột phải có waiting state.
- [x] Cột phải dùng `HoidongHosoXetduyetComponent`.
- [x] `hoidong` được truyền qua Input.
- [x] Gán hồ sơ tiếp tục dùng `HosoListComponent` trong drawer.
- [x] Menu gán hồ sơ đặt trên thẻ hội đồng.
- [ ] Thiết kế chi tiết nghiệp vụ `hoidong-hoso-xetduyet`.
- [ ] Phê duyệt cuối cùng để bắt đầu sửa code.
