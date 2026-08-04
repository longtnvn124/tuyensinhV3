# Thiết kế: Lịch sử tư vấn tuyển sinh theo hồ sơ

## 1. Trạng thái

- **Đã duyệt triển khai.**
- Component con chỉ quản lý lịch sử và form thêm tư vấn.
- Header hồ sơ, drawer và thao tác đóng thuộc component cha.
- Không tạo `tuvan-tuyensinh.component.spec.ts`.

## 2. Mục tiêu

Tạo `TuvanTuyensinhComponent` cho từng hồ sơ thí sinh:

- Nhận `HosoThisinh` qua `@Input`.
- Tải lịch sử theo `hoso_id`.
- Mặc định hiển thị lịch sử.
- Chuyển giữa lịch sử và form thêm bằng `@switch`.
- Hỗ trợ xem và thêm; chưa hỗ trợ sửa/xóa.
- Không chứa header hồ sơ hoặc `@Output() close`.

## 3. Phân quyền

| Quyền | Dữ liệu được xem |
|---|---|
| `admin` | Toàn bộ lịch sử tư vấn của hồ sơ đang chọn |
| Quyền khác | Chỉ lịch sử có `user_id` bằng ID tài khoản đăng nhập |

Query frontend:

```typescript
const conditions = [
    { conditionName: 'hoso_id', value: `${hoso.id}`, condition: IctuQueryCondition.equal },
];

if (!isAdmin) {
    conditions.push({
        conditionName: 'user_id',
        value: `${currentUser.id}`,
        condition: IctuQueryCondition.equal,
    });
}
```

Khi thêm mới, `user_id` luôn lấy từ `AuthenticationService.user.id`; không cho người dùng chọn hoặc thay đổi.

> Frontend chỉ giới hạn dữ liệu hiển thị. API `lichsu-tuvan` phải áp dụng cùng quy tắc theo danh tính từ access token để ngăn truy cập bằng request thủ công. Repo hiện tại không chứa backend nên phần bảo vệ API cần triển khai ở backend tương ứng.

## 4. Cấu trúc component

```text
HosoXettuyenComponent
├── Bảng hồ sơ
└── p-drawer
    ├── Header hồ sơ + nút đóng
    └── TuvanTuyensinhComponent
        └── @switch(viewState())
            ├── history — mặc định
            └── form — thêm lần tư vấn
```

```text
frontend/src/app/pages/admin/children/hoso/tuvan-tuyensinh/
├── tuvan_tuyensinh.md
├── tuvan-tuyensinh.component.ts
├── tuvan-tuyensinh.component.html
└── tuvan-tuyensinh.component.css
```

Component standalone; parent import trực tiếp. Không sửa route hoặc module.

## 5. Contract component

```typescript
@Input() set hoso(value: HosoThisinh | null)
```

Quy tắc:

- Parent truyền bản sao hồ sơ đã chọn.
- Component con không mutate input.
- Input `null`: không gọi API.
- Đổi hồ sơ: hủy request cũ, reset form/state, xóa timeline cũ, tải dữ liệu hồ sơ mới.
- Không khai báo output đóng drawer.

## 6. State

```typescript
type ConsultationView = 'history' | 'form';
type ConsultationLoadState = 'idle' | 'loading' | 'success' | 'error';

readonly currentHoso = signal<HosoThisinh | null>(null);
readonly viewState = signal<ConsultationView>('history');
readonly loadState = signal<ConsultationLoadState>('idle');
readonly histories = signal<LichsuTuvan[]>([]);
readonly submitting = signal(false);
```

## 7. API và dữ liệu

Model hiện tại:

```typescript
interface LichsuTuvan {
    id: number;
    hoso_id: number;
    content: string;
    hinhthuc_tuvan: string;
    thoigian_tuvan: string;
    user_id: number;
    ketqua_tuvan?: string;
    next_follow_up?: string;
    created_at: string;
}
```

Query:

- Luôn lọc `hoso_id`.
- Non-admin lọc thêm `user_id`.
- Sort mới nhất trước theo `created_at`.
- Không mutate `res.data`.

Payload thêm mới:

```typescript
{
    hoso_id: hoso.id,
    content: trimmedContent,
    hinhthuc_tuvan: selectedMethod,
    user_id: currentUser.id,
    ketqua_tuvan: trimmedResult || undefined,
    next_follow_up: normalizedFollowUp || undefined,
}
```

## 8. Màn lịch sử

- Tiêu đề nội dung, tổng số lần tư vấn, nút **Thêm lần tư vấn**.
- Timeline: hình thức, ngày giờ, nội dung, kết quả, lịch chăm sóc tiếp theo.
- Loading, empty, error/retry.
- Không render HTML động; nội dung dùng `white-space: pre-line`.
- Header hồ sơ không nằm trong component này.

## 9. Form thêm tư vấn

| Field | Bắt buộc | Quy tắc |
|---|---:|---|
| `hinhthuc_tuvan` | Có | Chọn gọi điện, tin nhắn, trực tiếp hoặc online |
| `content` | Có | Trim; không chấp nhận chuỗi chỉ có khoảng trắng |
| `ketqua_tuvan` | Không | Trim trước gửi |
| `next_follow_up` | Không | Chuẩn hóa `datetime-local` sang SQL datetime |

Luồng submit:

- Invalid: đánh dấu touched, không gọi API.
- Success: toast, reset form, về lịch sử, tải lại timeline.
- Error: giữ form, cho phép thử lại, toast lỗi.
- Chặn submit lặp bằng `submitting`.

## 10. Tích hợp component cha

State:

```typescript
readonly consultationDrawerVisible = signal(false);
readonly selectedConsultationHoso = signal<HosoThisinh | null>(null);
```

Mở drawer:

```typescript
openLichSu(row: HosoThisinh): void {
    this.selectedConsultationHoso.set({ ...row });
    this.consultationDrawerVisible.set(true);
}
```

Template:

```html
<p-drawer
    [(visible)]="consultationDrawerVisible"
    position="right"
    [style]="{ width: '640px', 'max-width': '100%' }"
    (onHide)="onConsultationDrawerHide()">
    <ng-template #header>
        <!-- Header hồ sơ do parent render -->
    </ng-template>

    <app-tuvan-tuyensinh [hoso]="selectedConsultationHoso()" />
</p-drawer>
```

Parent chịu trách nhiệm header, visibility, hồ sơ được chọn và nút đóng. Component con không phát sự kiện close.

## 11. File tác động

| File | Hành động |
|---|---|
| `tuvan-tuyensinh/tuvan-tuyensinh.component.ts` | Triển khai state, query, form, phân quyền |
| `tuvan-tuyensinh/tuvan-tuyensinh.component.html` | Timeline và form |
| `tuvan-tuyensinh/tuvan-tuyensinh.component.css` | Layout responsive |
| `hoso-xettuyen/hoso-xettuyen.component.ts` | Import component; quản lý drawer/header/selection |
| `hoso-xettuyen/hoso-xettuyen.component.html` | Thay dialog cũ bằng drawer |
| `hoso-xettuyen/hoso-xettuyen.component.css` | Chuyển style lịch sử sang component con |

Không tạo `tuvan-tuyensinh.component.spec.ts`.

## 12. Tiêu chí nghiệm thu

- Mỗi dòng mở đúng hồ sơ.
- Header hồ sơ và nút đóng nằm ở parent.
- Component con không có `@Output() close`.
- Admin xem toàn bộ lịch sử của hồ sơ.
- Non-admin chỉ xem lịch sử do chính mình tạo.
- Lịch sử mới tạo luôn mang `user_id` của tài khoản đăng nhập.
- Đổi hồ sơ không lẫn dữ liệu từ request cũ.
- Loading, empty, error/retry và submitting hoạt động đúng.
- UI responsive; build không lỗi.
- API backend áp dụng cùng chính sách phân quyền trước khi phát hành production.
