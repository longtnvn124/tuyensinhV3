# Kế hoạch: Trang đăng ký xét tuyển công khai

## 1. Mục tiêu

Tạo trang công khai cho thí sinh gửi thông tin đăng ký xét tuyển lên server.

- Truy cập `/` tự chuyển đến `/dang-ky-xet-tuyen`.
- `/auth/login` vẫn hoạt động độc lập cho cán bộ đăng nhập.
- Trang đăng ký không yêu cầu đăng nhập.
- Giao diện hiện đại, rõ ràng, responsive.
- Chỉ tạo component public mới; không sửa component form hồ sơ khu vực admin.
- Tái sử dụng service, model, interceptor hiện có.

## 2. Nguồn tham khảo

Component Angular v14:

- `D:/data/project/angular/v14/tuyensinhdttx_V2/src/app/modules/public/features/dang-ky-xet-tuyen/dang-ky-xet-tuyen.component.ts`
- `D:/data/project/angular/v14/tuyensinhdttx_V2/src/app/modules/public/features/dang-ky-xet-tuyen/dang-ky-xet-tuyen.component.html`
- `D:/data/project/angular/v14/tuyensinhdttx_V2/src/app/modules/public/features/dang-ky-xet-tuyen/dang-ky-xet-tuyen.component.css`

Chỉ kế thừa nghiệp vụ cần thiết. Không sao chép giao diện cũ, code đã comment, dependency cũ hoặc lỗi xử lý form cũ.

## 3. Service hiện có sẽ tái sử dụng

### Gửi đăng ký

- `HosoThisinhService.addTuyensinh(data)`.
- Endpoint hiện tại: `POST /hoso-tuyensinh/`.
- Base service tự ghép API URL, lấy `response.data`.

Payload dự kiến:

```ts
{
  ho_va_ten: string;
  dien_thoai: string;
  email?: string;
  nganh_id: number;
  dia_chi_tinh: number;
  vb_chuyenmon: string;
  submit_from: 'public-registration';
}
```

Dùng ID ngành, không dùng tên ngành. Trim chuỗi trước khi gửi. Không gửi trường rỗng không cần thiết.

### Danh sách ngành

- `NganhhocService.load(...)`.
- Ưu tiên ngành có `is_active = true`.
- Giá trị select: `id`.
- Nhãn select: `name`.

### Danh sách tỉnh/thành

- `LocationService.queryLocation([], { limit: -1, paged: 1 }, 'regions')`.
- Giá trị select: `id`.
- Nhãn select: `name`.

### HTTP và thông báo

- Dùng `NotificationService` cho thông báo.
- Dùng interceptor hiện tại để gắn `X-APP-ID`, chữ ký request, token nếu có.
- Nút gửi có loading riêng, khóa gửi lặp.

## 4. Điều kiện cần xác minh trước khi code

Backend không nằm đầy đủ trong repository hiện tại. Cần xác minh:

1. `GET /nganh-hoc` cho phép request không có Bearer token.
2. `GET /regions` cho phép request không có Bearer token.
3. `POST /hoso-tuyensinh/` cho phép tạo hồ sơ công khai với `X-APP-ID` và chữ ký request.
4. Backend chấp nhận payload tối giản phía trên.
5. Backend có yêu cầu thêm `status`, `gioi_tinh`, `doituong`, `owner_by`, `dotxettuyen_id` hoặc `ctdt_id` không.
6. Endpoint public đã có rate limit/chống spam chưa.

Nếu endpoint tạo hồ sơ bắt buộc đăng nhập, backend cần cấp endpoint public riêng. Không bỏ interceptor, giả token hoặc nhúng credential vào frontend.

## 5. Thiết kế giao diện

### Phong cách

- Xanh ICTU, nền sáng gradient nhẹ.
- Card trắng, bo góc, shadow nhẹ.
- Header nhận diện trường, tiêu đề tuyển sinh, mô tả ngắn.
- Form chia nhóm, khoảng cách thoáng.
- Nội dung tối thiểu 14px; label 14px; button 14–15px.
- Focus state rõ; không dùng inline style.

### Wireframe desktop

```text
┌──────────────────────────────────────────────────────────────────┐
│ [Logo ICTU]  TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG │
│                                           [Đăng nhập cán bộ]     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ĐĂNG KÝ TƯ VẤN XÉT TUYỂN          ┌────────────────────────┐   │
│   Điền thông tin, nhà trường sẽ      │  THÔNG TIN ĐĂNG KÝ     │   │
│   liên hệ tư vấn sớm nhất.           │                        │   │
│                                      │  Ngành đăng ký *       │   │
│   ✓ Thông tin được bảo mật           │  Bằng cấp cao nhất *   │   │
│   ✓ Tư vấn đúng ngành                │  Họ và tên *           │   │
│   ✓ Quy trình nhanh                  │  Tỉnh/Thành phố *      │   │
│                                      │  Số điện thoại *       │   │
│                                      │  Email                 │   │
│                                      │                        │   │
│                                      │  □ Tôi xác nhận...     │   │
│                                      │  [ GỬI ĐĂNG KÝ ]       │   │
│                                      └────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ © ICTU · Thông tin tuyển sinh · Hotline                          │
└──────────────────────────────────────────────────────────────────┘
```

### Mobile

- Hero trên, form dưới.
- Field rộng 100%.
- Nút gửi rộng 100%, cao tối thiểu 44px.
- Header gọn; link đăng nhập không lấn nút đăng ký.

## 6. Trường dữ liệu và validation

| Trường | Bắt buộc | Quy tắc |
|---|---:|---|
| Ngành đăng ký | Có | Chọn ID từ API |
| Bằng cấp cao nhất | Có | Chọn từ danh sách cố định |
| Họ và tên | Có | Trim, không chỉ chứa khoảng trắng, giới hạn độ dài |
| Tỉnh/Thành phố | Có | Chọn ID từ API |
| Số điện thoại | Có | 10 chữ số, bắt đầu bằng `0` |
| Email | Không | Nếu nhập phải đúng email |
| Cam kết thông tin | Có | Phải chọn trước khi gửi |

Bằng cấp đề xuất: THPT, Trung cấp, Cao đẳng, Đại học, Sau đại học.

Lỗi hiển thị dưới field sau khi touched hoặc submit. Khi form sai, gọi `markAllAsTouched()`; không dùng vòng lặp tìm lỗi như component v14.

## 7. Trạng thái giao diện

### Tải dữ liệu

- Skeleton/spinner trong form.
- Vô hiệu hóa select, nút gửi.
- Lỗi tải có nút “Thử lại”.

### Đang gửi

- Nút hiển thị “Đang gửi...”.
- Khóa gửi bằng state `submitting`.

### Thành công

- Toast thành công.
- Success panel ngắn trong card.
- Reset form và checkbox sau phản hồi thành công.

### Thất bại

- Giữ dữ liệu đã nhập.
- Mở lại nút gửi.
- Thông báo thân thiện; không lộ lỗi kỹ thuật.

## 8. Routing dự kiến

Cập nhật `frontend/src/app/app.routes.ts`:

```ts
{
  path: '',
  redirectTo: 'dang-ky-xet-tuyen',
  pathMatch: 'full'
},
{
  path: 'dang-ky-xet-tuyen',
  loadComponent: () => import('@pages/dang-ky-xet-tuyen/dang-ky-xet-tuyen.component')
    .then(component => component.DangKyXetTuyenComponent)
},
{
  path: 'admin',
  // giữ guard hiện tại
},
{
  path: 'auth',
  // giữ module login hiện tại
},
{
  path: '**',
  redirectTo: 'dang-ky-xet-tuyen'
}
```

Kết quả:

- `/` chuyển tới `/dang-ky-xet-tuyen`.
- `/dang-ky-xet-tuyen` mở form public.
- `/auth/login` mở login hiện tại.
- `/admin` vẫn qua `adminGuard`.
- URL sai trở về trang đăng ký.

## 9. Cấu trúc file khi triển khai

```text
frontend/src/app/pages/dang-ky-xet-tuyen/
├── dang-ky-xet-tuyen.component.ts
├── dang-ky-xet-tuyen.component.html
├── dang-ky-xet-tuyen.component.css
├── dang-ky-xet-tuyen.component.spec.ts
└── dang-ky-xet-tuyen-plan.md
```

File cần sửa: `frontend/src/app/app.routes.ts`.

Không tạo service mới nếu service hiện tại đáp ứng API.

## 10. Trình tự triển khai

### Giai đoạn 1: Kiểm chứng API public

1. Kiểm tra GET ngành không token.
2. Kiểm tra GET tỉnh/thành không token.
3. Xác nhận contract POST với backend/môi trường test.
4. Chốt field bắt buộc phía server.

### Giai đoạn 2: Test trước

1. Test form và validation.
2. Test tải ngành, tỉnh/thành thành công/thất bại.
3. Test chặn submit khi sai/chưa cam kết.
4. Test payload trim, dùng ID đúng.
5. Test chặn submit trùng.
6. Test reset khi thành công, giữ dữ liệu khi thất bại.
7. Test route mặc định, route login.

### Giai đoạn 3: Component

1. Tạo standalone component.
2. Dựng typed Reactive Form.
3. Tải dữ liệu bằng `forkJoin` hoặc tương đương.
4. Kết nối `HosoThisinhService.addTuyensinh()`.
5. Xử lý loading, error, retry, submitting, success.

### Giai đoạn 4: Giao diện

1. Dựng header, hero, form card, footer.
2. Dùng logo phù hợp trong `frontend/public/images/client/ictu/`.
3. Hoàn thiện desktop, tablet, mobile.
4. Bổ sung focus state, error text, `aria-*`, label-input đúng.

### Giai đoạn 5: Router

1. Thêm `/dang-ky-xet-tuyen`.
2. Redirect `/` tới route mới.
3. Giữ `/auth/login`, `/admin`.
4. Chuyển wildcard về trang public.

### Giai đoạn 6: Xác minh

1. Chạy unit test.
2. Chạy type-check/build.
3. Chạy dev server.
4. Browser test desktop/mobile.
5. Kiểm tra golden path, form sai, API lỗi, retry, double-click.
6. Kiểm tra trực tiếp `/auth/login`, `/admin`.
7. Review TypeScript, accessibility, bảo mật public form.

## 11. Rủi ro

### Cao

- Backend từ chối request chưa đăng nhập.
- Backend yêu cầu nhiều field hơn payload tối giản.
- Endpoint public thiếu rate limit/CAPTCHA.

### Trung bình

- API ngành/tỉnh chặn quyền đọc public.
- Interceptor điều hướng login khi API trả `401/403`.
- API response khác dự kiến.

### Thấp

- Nội dung dài vỡ layout mobile.
- CSS global ảnh hưởng PrimeNG field.

## 12. Tiêu chí hoàn thành

- Root URL mở trang đăng ký.
- Login vẫn ở `/auth/login`.
- Form gửi dữ liệu thật không cần đăng nhập.
- Validation đúng, không gửi trùng.
- Có loading, retry, success, error.
- Responsive mobile–desktop.
- Không sửa component form hồ sơ admin.
- Unit test, build, browser test đạt.
