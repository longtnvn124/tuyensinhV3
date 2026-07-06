# Ghi chú UI/API cho course-overview

## Mục tiêu

Tài liệu này tổng hợp nhanh các pattern đang được dùng trong dự án để phục vụ việc hoàn thiện `course-overview` mà vẫn bám đúng cách tổ chức UI và API hiện tại của repo.

## 1. Cách route vào course-overview

Luồng hiện tại được mở từ danh sách khóa học tại:

- `src/app/pages/admin/children/training-management/children/tm-courses/tm-courses.component.ts`

Đoạn điều hướng chính:

- `getToCourseOverView(item: Course)` tại `tm-courses.component.ts:496-507`

Dữ liệu được truyền qua `queryParams.hashcode` sau khi mã hóa, với cấu trúc:

```ts
{
  userId: number,
  course_id: number,
  class_id: number
}
```

Điều này có nghĩa là `course-overview` nên đọc `hashcode`, giải mã bằng `AuthenticationService`, sau đó lấy `course_id` để tải dữ liệu khóa học.

## 2. Pattern component trong dự án

Các màn mới trong repo này đang đi theo hướng standalone component, đặt `imports` trực tiếp trong `@Component`.

Ví dụ:

- `src/app/components/preview-course/preview-course.component.ts`
- `src/app/pages/admin/children/training-management/children/tm-courses/tm-courses.component.ts`

Pattern phổ biến:

- Dùng `signal`, `computed`, `WritableSignal`, `Signal`
- Dùng `inject(...)` thay cho constructor injection ở nhiều component
- Dùng state kiểu:
  - `'loading'`
  - `'success'`
  - `'error'`
  - đôi khi có thêm `'unauthorized'`, `'invalid'`, `'notFound'`

## 3. Pattern template UI

Template trong dự án đang dùng Angular control flow mới:

- `@if`
- `@for`
- `@switch`

Ví dụ rõ nhất là:

- `src/app/pages/admin/children/training-management/children/tm-courses/tm-courses.component.html`
- `src/app/components/preview-course/preview-course.component.ts` + template tương ứng

Các class UI đang được tái sử dụng nhiều:

- `admin-wrap-table`
- `admin-table__alert-danger`
- `ictu-form__row`
- `ictu-form__label`
- `ictu-form__input-field`
- `ictu-badge`
- `ictu-button-*`
- `ictu-badge-btn-*`

Kết luận: nếu cần làm giao diện `course-overview`, nên ưu tiên tái sử dụng hệ class có sẵn thay vì dựng một ngôn ngữ UI hoàn toàn mới.

## 4. Pattern API/service

Dự án không ưu tiên gọi `HttpClient` trực tiếp trong component. Thay vào đó:

1. Service kế thừa `IctuBaseServiceClass<T>`
2. Component gọi service
3. Component `map` dữ liệu từ `DtoObject<T>` sang view model hiển thị

Ví dụ service khóa học:

- `src/app/services/course.service.ts`

Các điểm chính của `CoursesService`:

- kế thừa `IctuBaseServiceClass<Course>`
- có `load(...)`, `loadOptions(...)`, `loadOptionsFull(...)`
- dùng `query(...)` với `IctuConditionParam[]` và `IctuQueryParams`

Khi cần lấy chi tiết khóa học theo `course_id`, pattern phù hợp là:

- tạo `conditions` với `id` và `donvi_id`
- gọi `coursesService.query(...)`
- `map` dữ liệu trả về sang cấu trúc phục vụ UI

## 5. Pattern xử lý dữ liệu ở component

Trong repo này, component thường chịu trách nhiệm transform dữ liệu API thành dữ liệu hiển thị.

Ví dụ ở `preview-course`:

- đọc `hashcode`
- validate role + user
- gọi API
- lưu dữ liệu vào signal
- render từ signal

Với `course-overview`, dữ liệu có thể cần được ánh xạ thành các phần như:

- thông tin khóa học cơ bản
- lĩnh vực (`linhvuc`)
- bậc đào tạo (`bacdaotao`)
- lesson plan
- lessons
- cấu trúc chương trình hiển thị dễ đọc

## 6. Dữ liệu course-overview hiện đang dùng

Theo code hiện tại trong `src/app/components/course-overview/course-overview.component.ts`, component đang lấy:

- `linhvuc`
- `bacdaotao`
- `lesson_plan`
- `lessons`

Và đang cố map ra `course_lesson` để hiển thị:

- `unit`
- `lesson`
- `page`

Ngoài ra file hiện tại còn đang dùng thêm:

- `CourseLesson`
- `CourseLessonPlan`
- `CourseLessonPlanContentPageItem`

Điều đó cho thấy hướng hiển thị mong muốn là một màn mô tả chi tiết khóa học kèm cấu trúc bài học/trang nội dung.

## 7. Các ràng buộc kỹ thuật cần nhớ

### Strict template đang bật

Trong `tsconfig.json`:

- `strictTemplates: true`
- `strictInjectionParameters: true`
- `strictInputAccessModifiers: true`

Nghĩa là:

- template phải dùng đúng field có thật trên model
- không nên đoán bừa property
- mọi import dùng trong standalone component cần khai báo đúng trong `imports`

### Alias import được dùng nhiều

Các alias chính:

- `@app/*`
- `@components/*`
- `@pages/*`
- `@services/*`
- `@models/*`
- `@theme/*`
- `@module/*`
- `@env`

### UI library đang dùng song song

Repo hiện trộn nhiều thư viện:

- PrimeNG
- Angular Material
- CSS nội bộ
- một số custom theme components

Vì vậy khi sửa `course-overview`, cần kiểm tra kỹ import component/directive nếu dùng:

- `mat-flat-button`
- `matTooltip`
- `pTooltip`
- `p-select`
- `pInputText`
- pipe custom

## 8. Gợi ý cách tiếp cận khi hoàn thiện course-overview

Nếu làm tiếp component này, hướng an toàn nhất là:

1. Giữ nguyên phạm vi chỉ trong thư mục `src/app/components/course-overview/`
2. Bám đúng pattern decode `hashcode` giống `preview-course` hoặc `edit-course`
3. Giữ state đơn giản: `loading / success / error / unauthorized`
4. Tái sử dụng class UI sẵn có của dự án
5. Dùng `CoursesService.query(...)` để lấy 1 khóa học theo `course_id` + `donvi_id`
6. Map dữ liệu trong component thành cấu trúc dễ render
7. Tránh dùng field không có trong model vì repo bật `strictTemplates`

## 9. Hạn chế của môi trường hiện tại

Có 2 hạn chế đã quan sát được trong môi trường làm việc hiện tại:

- `gh` chưa có trong máy, nên không đọc PR bằng GitHub CLI được
- `npm run build` không chạy được vì Node hiện tại là `v14.21.3`, trong khi Angular CLI yêu cầu Node mới hơn

Do đó khi sửa giao diện, cần bám chặt pattern hiện có trong repo để giảm rủi ro sai type/template.

## 10. File tham chiếu chính

Các file quan trọng đã đọc để rút ra ghi chú này:

- `src/app/pages/admin/children/training-management/children/tm-courses/tm-courses.component.ts`
- `src/app/pages/admin/children/training-management/children/tm-courses/tm-courses.component.html`
- `src/app/services/course.service.ts`
- `src/app/components/preview-course/preview-course.component.ts`
- `src/app/components/course-overview/course-overview.component.ts`
- `tsconfig.json`
- `angular.json`
- `package.json`
