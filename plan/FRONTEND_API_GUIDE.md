# Hướng dẫn API cho AI/lập trình viên frontend

Tài liệu này tóm tắt cách backend Express trong dự án `ttpm-server/api-v3` sinh và xử lý API để AI hoặc lập trình viên frontend có thể tích hợp nhanh mà không cần đọc lại toàn bộ source.

## 1. Tổng quan backend

- Runtime chính: Node.js + Express 4.
- Entry point: `bin/www`, load app từ `app.js`.
- Server mặc định chạy cổng `PORT` trong `.env`, nếu không có thì `3000`.
- API được khởi tạo trong `app.js` bằng vòng lặp qua `config/realms.js`.
- CRUD tự động nằm trong `app/models/main.js`.
- Danh sách resource API nằm trong `routes/apis/<realm>.js`.
- Controller tùy biến cho từng resource nằm trong `app/controllers/<realm>/<table-or-router>.js` hoặc `app/controllers/<path>/<table>.js`.

## 2. Base URL và cách suy ra endpoint

Mỗi hệ thống con gọi là `realm`. Backend mount API theo mẫu:

```txt
/{realm}/api/{version}/{resource}
```

Trong đó:

- `realm`: id của hệ thống, ví dụ `sso`, `lcms`, `dttx`, `tuyensinh`, `dangky-vstep`, `dangky-hsk`, `aptis`, `dacms`, ...
- `version`: lấy từ cấu hình realm. Nếu rỗng thì không có đoạn version.
- `resource`: key trong file `routes/apis/<realm>.js`.

Ví dụ nếu realm `lcms` không có version:

```txt
GET /lcms/api/class
GET /lcms/api/class/123
POST /lcms/api/class
PUT /lcms/api/class/123
DELETE /lcms/api/class/123
```

Ví dụ nếu realm có `version: 'v1'`:

```txt
GET /<realm>/api/v1/<resource>
```

Lưu ý: file `config/system/realms.js` có thể không được commit hoặc được sinh theo môi trường. Khi tích hợp frontend, cần hỏi backend/devops danh sách realm đang bật và domain thật.

## 3. Cách đọc danh sách API resource

Mỗi file `routes/apis/<realm>.js` export object dạng:

```js
module.exports = {
  'resource-name': {
    table: 'database_table',
    resource: ['manager', 'create', 'update', 'delete'],
    public: ['manager'],
    cache: true
  }
}
```

Ý nghĩa:

- Key object là tên endpoint `resource-name`.
- `table`: bảng database backend thao tác.
- `resource`: giới hạn nhóm CRUD được sinh. Nếu không khai báo thì mặc định là `all`.
- `public`: nhóm action được phép gọi không cần đăng nhập.
- `cache`: response GET có cache phía backend.
- `tracking: false`: backend không ghi activity log cho resource này.

Các file resource đáng chú ý:

- `routes/apis/sso.js`: `clients`, `activity`.
- `routes/apis/lcms.js`: rất nhiều resource LCMS như `class`, `class-plans`, `courses`, `lessons`, `article-posts`, `announcements`, `surveys`, ...
- `routes/apis/dttx.js`: `registrations`, `registration-status`, `dotxettuyen`, `nganh`.
- `routes/apis/tuyensinh.js`: `configs`, `dotxettuyen`, `nganh`, `registrations`, `registration-status`, ...
- Các realm khác có file riêng trong `routes/apis/`: `aptis`, `dacms`, `dangky-hsk`, `dangky-vstep`, `dtlsdp`, `ktx`, `lcms_v3`, `tdkt`, `vbcc`, `vstep`, ...

## 4. CRUD chuẩn được sinh tự động

Với resource có `table`, backend tự sinh các route sau:

| Action | HTTP | Endpoint | Mục đích |
|---|---:|---|---|
| `manager` | GET | `/{realm}/api/{resource}` | Lấy danh sách, có filter/pagination |
| `manager` | GET | `/{realm}/api/{resource}/:id` | Lấy chi tiết |
| `create` | POST | `/{realm}/api/{resource}` | Tạo mới |
| `update` | PUT | `/{realm}/api/{resource}/:id` | Cập nhật |
| `delete` | DELETE | `/{realm}/api/{resource}/:id` | Xóa hoặc soft delete |

Nếu `resource` chỉ chứa một số action, chỉ các endpoint tương ứng được sinh. Ví dụ:

```js
'student-activity': {
  table: 'student_activity',
  resource: ['manager', 'update', 'create']
}
```

thì không nên gọi `DELETE /student-activity/:id`.

## 5. Auth và header

Backend hỗ trợ nhiều kiểu auth theo cấu hình realm:

- `auth: 'local'`: đăng nhập tạo session, response trả `access_token` là `sessionID`.
- `auth: 'token'`: đăng nhập trả JWT-like `access_token` và `refresh_token`.
- `auth: false`: API không yêu cầu xác thực.
- Basic Auth cũng được middleware nhận nếu request có header Basic hợp lệ.

Header nên gửi từ frontend:

```txt
Content-Type: application/json
Accept: application/json
Authorization: Bearer <access_token>
```

Với realm `auth: local`, token thực tế là session id; backend cũng dùng cookie session `connect.sid`. Khi frontend chạy khác domain, cần kiểm tra cấu hình CORS/cookie của môi trường triển khai.

Các response lỗi auth thường gặp:

```json
{
  "code": "unauthorized",
  "message": "Unauthorized.",
  "data": null
}
```

```json
{
  "code": "forbidden",
  "message": "Forbidden.",
  "data": null
}
```

## 6. Auth endpoints chuẩn

Khi realm bật auth, backend tự thêm router users/admin/global/upload vào API. Các endpoint auth chính nằm ngay dưới base API:

| HTTP | Endpoint | Ghi chú |
|---:|---|---|
| POST | `/{realm}/api/login` | Đăng nhập bằng username/email/password theo controller auth |
| GET | `/{realm}/api/login-google` | Lấy URL/chuyển hướng đăng nhập Google nếu realm cấu hình provider |
| POST | `/{realm}/api/login-google` | Đăng nhập Google bằng token/credential từ frontend |
| GET | `/{realm}/api/login-microsoft` | Lấy URL/chuyển hướng đăng nhập Microsoft nếu realm cấu hình provider |
| POST | `/{realm}/api/login-microsoft` | Đăng nhập Microsoft bằng token từ frontend |
| GET | `/{realm}/api/login-zalo` | Lấy URL/chuyển hướng đăng nhập Zalo nếu realm cấu hình provider |
| POST | `/{realm}/api/login-zalo` | Đăng nhập Zalo bằng token từ frontend |
| POST | `/{realm}/api/login-firebase` | Đăng nhập bằng Firebase token |
| POST | `/{realm}/api/login-biometric` | Đăng nhập bằng biometric code/token |
| POST | `/{realm}/api/login-qrcode` | Đăng nhập bằng QR token |
| POST | `/{realm}/api/logout` | Đăng xuất, cần auth |
| POST | `/{realm}/api/register` | Đăng ký nếu backend cho phép |
| POST | `/{realm}/api/refresh-token` | Lấy access token mới từ `refresh_token` |
| GET | `/{realm}/api/profile` | Lấy thông tin user hiện tại, cần auth |
| PUT | `/{realm}/api/profile` | Cập nhật profile, cần auth |
| POST | `/{realm}/api/forget-password` | Gửi mã/link quên mật khẩu |
| POST | `/{realm}/api/reset-password` | Đặt lại mật khẩu |
| GET | `/{realm}/api/permission` | Lấy quyền user hiện tại, cần auth |
| POST | `/{realm}/api/avatar` | Cập nhật avatar user hiện tại |

Các endpoint `GET /login-google`, `GET /login-microsoft`, `GET /login-zalo` thường dùng cho flow redirect/OAuth. Các endpoint `POST /login-google`, `POST /login-microsoft`, `POST /login-zalo`, `POST /login-firebase` dùng khi frontend đã nhận token/credential từ SDK phía client và gửi về backend để xác thực.

Ví dụ payload social login cần xác nhận theo provider/controller runtime, nhưng thường có dạng:

```json
{
  "token": "<provider_access_token>",
  "credential": "<id_token_or_credential>"
}
```

Không gửi secret của Google/Microsoft/Zalo từ frontend; frontend chỉ gửi token/credential do SDK provider cấp cho client.

Login response với `auth: local`:

```json
{
  "code": "success",
  "message": "Logged in successfully.",
  "access_token": "<session_id>",
  "expires": "<datetime>",
  "data": { }
}
```

Login response với `auth: token`:

```json
{
  "code": "success",
  "message": "Logged in successfully.",
  "access_token": "<token>",
  "refresh_token": "<refresh_token>"
}
```

## 7. Response format chuẩn

Danh sách:

```json
{
  "code": "success",
  "message": "Request success!",
  "draw": 1,
  "next": 2,
  "count": 20,
  "recordsTotal": 100,
  "recordsFiltered": 100,
  "data": []
}
```

Chi tiết:

```json
{
  "code": "success",
  "message": "Request success!",
  "data": { }
}
```

Tạo mới:

```json
{
  "code": "success",
  "message": "Create success!",
  "data": 123
}
```

Cập nhật:

```json
{
  "code": "success",
  "message": "Update success!",
  "data": "123"
}
```

Xóa:

```json
{
  "code": "success",
  "message": "Delete success!",
  "data": 1
}
```

404 chung:

```json
{
  "code": "not_found",
  "message": "Not Found.",
  "data": null
}
```

## 8. Query params danh sách

Các endpoint `GET /{resource}` hỗ trợ nhiều query param chung:

### Pagination offset/page

```txt
?limit=20&paged=1
?limit=20&offset=40
?length=50&start=0
```

- `limit`: mặc định 20, tối đa backend cho phép 1000.
- `paged`: số trang bắt đầu từ 1.
- `offset` hoặc `start`: bỏ qua N bản ghi.
- `length`: kiểu DataTables, cũng giới hạn số bản ghi.

### Cursor pagination

Nếu request có query `cursor`, backend dùng cursor pagination:

```txt
GET /{realm}/api/{resource}?cursor=0&limit=20
GET /{realm}/api/{resource}?cursor=<next_cursor_tu_response>&limit=20
```

Response có thêm:

```json
{
  "next_cursor": "...",
  "prev_cursor": "...",
  "has_next": true,
  "has_prev": false
}
```

Có thể dùng:

```txt
?cursor_field=id&orderby=id&order=ASC
```

### Sort

```txt
?orderby=created_at&order=DESC
?orderby=name,created_at&order=ASC
```

### Select và first

```txt
?select=id,name,status
?first=1
?first=id,name
```

### Include/exclude theo id hoặc field khác

```txt
?id=1,2,3
?include=1,2,3
?include=abc,def&include_by=code
?exclude=4,5
?exclude=4,5&exclude_by=id
```

### Search/filter cơ bản

Nếu controller khai báo `Search`, có thể dùng:

```txt
?search=keyword
```

Nếu controller khai báo `Filters`, có thể filter trực tiếp theo tên cột:

```txt
?status=1&type=abc
```

### Điều kiện nâng cao

Backend hỗ trợ `condition` hoặc `q`:

```txt
?condition[0][key]=created_at&condition[0][compare]=>=&condition[0][value]=2026-01-01
?condition[0][key]=name&condition[0][type]=like&condition[0][value]=%abc%
?condition[0][key]=id&condition[0][type]=in&condition[0][value]=1,2,3
```

Các `type` thường dùng:

- `like`, `andlike`, `orlike`
- `in`, `orin`, `notin`, `ornotin`
- `between`, `notbetween`
- `and`, `or`

### Aggregate/group

```txt
?max=id
?min=id
?sum=amount
?avg=score
?groupby=status
```

### Relation include

Nếu controller khai báo `With`, frontend có thể gọi:

```txt
?with=user,course,class
```

Không phải resource nào cũng hỗ trợ `with`; cần kiểm tra controller tương ứng trong `app/controllers/<realm>/`.

## 9. Request body cho POST/PUT

Body thường là JSON object:

```json
{
  "name": "Tên",
  "status": 1
}
```

Backend có thể giới hạn field bằng `Fillable` trong controller. Các field hệ thống như `created_by`, `updated_by`, `deleted_by`, `is_deleted`, `created_at`, `updated_at`, `deleted_at` sẽ bị backend xóa/ghi lại tự động trong quá trình sanitize.

Nếu controller có `keyType`, backend có thể tự xử lý:

- `json`, `array`, `array_number`: stringify khi ghi, parse khi đọc.
- `hash`: hash password.
- `slug`: tạo slug.
- `encrypt`: mã hóa khi ghi, giải mã khi đọc.
- `date`: chuẩn hóa date khi đọc.

## 10. Public API

Một số resource cho phép gọi không cần đăng nhập bằng `public` trong `routes/apis/<realm>.js`.

Ví dụ:

```js
'nganh': {
  table: 'nganh',
  public: ['manager']
}
```

Frontend có thể gọi:

```txt
GET /tuyensinh/api/nganh
```

mà không cần token nếu realm/controller không có điều kiện bổ sung.

## 11. Upload file và AWS media

Backend tự thêm resource upload global từ `routes/apis/admin/uploads.js` vào các realm:

| Resource | Table | Mục đích |
|---|---|---|
| `uploads` | `media` | Upload/lấy file lưu local |
| `aws` | `media_aws` | Upload/lấy file qua AWS S3-compatible storage |
| `ftp` | `media_ftp` | Upload/lấy file qua FTP |

Với AWS, endpoint chính thường là:

| HTTP | Endpoint | Ghi chú |
|---:|---|---|
| POST | `/{realm}/api/aws` | Upload file bằng multipart/form-data, cần auth |
| GET | `/{realm}/api/aws` | Lấy danh sách file đã upload |
| GET | `/{realm}/api/aws/:id` | Lấy metadata chi tiết file |
| DELETE | `/{realm}/api/aws/:id` | Xóa file, có thể soft delete |
| DELETE | `/{realm}/api/aws/:id/permanently` | Xóa vĩnh viễn |
| POST | `/{realm}/api/aws/restore/:id` | Khôi phục file đã xóa mềm |
| GET | `/{realm}/api/aws/file/:name` | Redirect sang signed download URL |
| POST | `/{realm}/api/aws/file/:name` | Trả signed download URL dạng JSON |
| GET | `/{realm}/api/aws/file-pdf/:name` | Trả PDF inline, có thể gắn watermark |
| GET | `/{realm}/api/aws/folder` | Lấy cây thư mục |
| GET | `/{realm}/api/aws/trashed` | Lấy danh sách file đã xóa mềm |
| GET | `/{realm}/api/aws/duration/:name` | Lấy duration video/audio nếu hỗ trợ |

Upload AWS dùng `multipart/form-data`. Backend đọc thêm:

- Header `folder`: nếu có, backend lưu vào thư mục dạng `YYYY/MM/<folder>_<day>`.
- Field `tag`: tag nghiệp vụ của file.
- Field `public`: `1` cho file public, `0` cho file cần auth.
- Query `return=ids`: response `data` là danh sách tên file thay vì metadata đầy đủ.

Ví dụ response upload:

```json
{
  "code": "success",
  "message": "Upload success!",
  "data": []
}
```

Ví dụ lấy signed URL bằng JSON:

```txt
POST /{realm}/api/aws/file/<file-name-or-id>
```

```json
{
  "code": "success",
  "message": "Signed success!",
  "data": "https://<signed-download-url>"
}
```

Nếu gọi `GET /{realm}/api/aws/file/<file-name-or-id>`, backend redirect trực tiếp sang signed URL thay vì trả JSON.

## 12. Cách AI frontend nên làm việc với dự án này

Khi cần tích hợp một màn hình frontend:

1. Xác định `realm` của màn hình, ví dụ `lcms`, `tuyensinh`, `dttx`.
2. Mở `routes/apis/<realm>.js` để tìm `resource` tương ứng.
3. Suy ra endpoint CRUD theo mẫu ở mục 4.
4. Nếu cần field/filter/relation cụ thể, mở controller:
   - `app/controllers/<realm>/<table>.js`
   - hoặc theo `path/group` nếu resource cấu hình khác mặc định.
5. Kiểm tra controller có các khai báo sau không:
   - `Search`: hỗ trợ `?search=`.
   - `Filters`: các query filter trực tiếp.
   - `With`: hỗ trợ `?with=`.
   - `Fillable`: field cho phép gửi POST/PUT.
   - `Router`: endpoint tùy biến ngoài CRUD.
6. Dùng response `code === 'success'` làm điều kiện thành công, không chỉ dựa vào HTTP 200.
7. Với form tạo/sửa, chỉ gửi field nghiệp vụ; không gửi field hệ thống.
8. Với danh sách lớn, ưu tiên `limit`, `paged`, `orderby`, `order`; nếu API trả cursor thì dùng `next_cursor`.

## 13. Tối ưu tích hợp cho Angular

Frontend Angular nên dùng `HttpClient`, `environment`, `HttpInterceptor` và service riêng cho từng resource thay vì gọi `fetch` trực tiếp trong component.

### 13.1. Environment

Ví dụ `environment.ts`:

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'https://<domain>/<realm>/api',
};
```

Nếu app cần làm việc với nhiều realm, nên tách base URL theo realm:

```ts
export const environment = {
  production: false,
  apiBaseUrls: {
    sso: 'https://<domain>/sso/api',
    lcms: 'https://<domain>/lcms/api',
    tuyensinh: 'https://<domain>/tuyensinh/api',
  },
};
```

### 13.2. Interface response dùng chung

```ts
export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface ApiListResponse<T> {
  code: string;
  message: string;
  draw: number;
  next: number | null;
  count: number;
  recordsTotal: number | null;
  recordsFiltered: number | null;
  data: T[];
  next_cursor?: string | null;
  prev_cursor?: string | null;
  has_next?: boolean;
  has_prev?: boolean;
}
```

### 13.3. Auth interceptor

Dùng interceptor để tự gắn token vào mọi request. Nếu backend realm dùng `auth: local` và cần cookie session cross-domain, bật thêm `withCredentials`.

```ts
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');

  const authReq = req.clone({
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true,
  });

  return next(authReq);
};
```

Nếu backend chỉ dùng Bearer token và không cần cookie, có thể bỏ `withCredentials: true`.

### 13.4. Auth service

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../environments/environment';

interface LoginResponse {
  code: string;
  message: string;
  access_token: string;
  refresh_token?: string;
  expires?: string;
  data?: unknown;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  login(payload: { username: string; password: string }) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/login`, payload).pipe(
      tap((res) => {
        localStorage.setItem('access_token', res.access_token);
        if (res.refresh_token) {
          localStorage.setItem('refresh_token', res.refresh_token);
        }
      }),
    );
  }

  loginWithGoogle(payload: { token?: string; credential?: string }) {
    return this.socialLogin('/login-google', payload);
  }

  loginWithMicrosoft(payload: { token: string }) {
    return this.socialLogin('/login-microsoft', payload);
  }

  loginWithZalo(payload: { token: string }) {
    return this.socialLogin('/login-zalo', payload);
  }

  loginWithFirebase(payload: { token: string }) {
    return this.socialLogin('/login-firebase', payload);
  }

  getGoogleLoginUrl() {
    return this.http.get(`${this.apiBaseUrl}/login-google`);
  }

  getMicrosoftLoginUrl() {
    return this.http.get(`${this.apiBaseUrl}/login-microsoft`);
  }

  private socialLogin(path: string, payload: Record<string, unknown>) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}${path}`, payload).pipe(
      tap((res) => {
        localStorage.setItem('access_token', res.access_token);
        if (res.refresh_token) {
          localStorage.setItem('refresh_token', res.refresh_token);
        }
      }),
    );
  }

  logout() {
    return this.http.post(`${this.apiBaseUrl}/logout`, {}).pipe(
      tap(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }),
    );
  }

  profile() {
    return this.http.get(`${this.apiBaseUrl}/profile`);
  }
}
```

### 13.5. Resource service CRUD

Ví dụ service cho resource `class` của realm `lcms`:

```ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { ApiListResponse, ApiResponse } from './api-response.types';

export interface ClassItem {
  id: number;
  name?: string;
  status?: number;
}

@Injectable({ providedIn: 'root' })
export class ClassService {
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly resourceUrl = `${this.apiBaseUrl}/class`;

  constructor(private readonly http: HttpClient) {}

  list(params: {
    limit?: number;
    paged?: number;
    search?: string;
    orderby?: string;
    order?: 'ASC' | 'DESC';
  } = {}) {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return this.http.get<ApiListResponse<ClassItem>>(this.resourceUrl, {
      params: httpParams,
    });
  }

  detail(id: number | string) {
    return this.http.get<ApiResponse<ClassItem>>(`${this.resourceUrl}/${id}`);
  }

  create(payload: Partial<ClassItem>) {
    return this.http.post<ApiResponse<number>>(this.resourceUrl, payload);
  }

  update(id: number | string, payload: Partial<ClassItem>) {
    return this.http.put<ApiResponse<string>>(`${this.resourceUrl}/${id}`, payload);
  }

  delete(id: number | string) {
    return this.http.delete<ApiResponse<number>>(`${this.resourceUrl}/${id}`);
  }
}
```

### 13.6. AWS upload service

Không set thủ công `Content-Type` khi gửi `FormData`; Angular/browser sẽ tự thêm boundary cho `multipart/form-data`.

```ts
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { ApiListResponse, ApiResponse } from './api-response.types';

export interface AwsMediaItem {
  id: number;
  name: string;
  title?: string;
  type?: string;
  ext?: string;
  url?: string;
  public?: number;
}

@Injectable({ providedIn: 'root' })
export class AwsUploadService {
  private readonly resourceUrl = `${environment.apiBaseUrl}/aws`;

  constructor(private readonly http: HttpClient) {}

  upload(files: File[], options: { folder?: string; tag?: string; public?: boolean; returnIds?: boolean } = {}) {
    const formData = new FormData();

    files.forEach((file) => formData.append('files', file));
    if (options.tag) {
      formData.append('tag', options.tag);
    }
    formData.append('public', options.public ? '1' : '0');

    let headers = new HttpHeaders();
    if (options.folder) {
      headers = headers.set('folder', options.folder);
    }

    let params = new HttpParams();
    if (options.returnIds) {
      params = params.set('return', 'ids');
    }

    return this.http.post<ApiResponse<AwsMediaItem[] | string[]>>(this.resourceUrl, formData, {
      headers,
      params,
    });
  }

  list(params: { limit?: number; paged?: number; search?: string } = {}) {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return this.http.get<ApiListResponse<AwsMediaItem>>(this.resourceUrl, {
      params: httpParams,
    });
  }

  getSignedUrl(nameOrId: string | number) {
    return this.http.post<ApiResponse<string>>(`${this.resourceUrl}/file/${nameOrId}`, {});
  }

  openFile(nameOrId: string | number) {
    window.open(`${this.resourceUrl}/file/${nameOrId}`, '_blank');
  }

  restore(id: string | number) {
    return this.http.post(`${this.resourceUrl}/restore/${id}`, {});
  }

  delete(id: string | number) {
    return this.http.delete(`${this.resourceUrl}/${id}`);
  }
}
```

### 13.7. Build query nâng cao bằng HttpParams

Với các query dạng array/object như `condition[0][key]`, set key trực tiếp bằng `HttpParams`:

```ts
const params = new HttpParams()
  .set('limit', 20)
  .set('paged', 1)
  .set('orderby', 'created_at')
  .set('order', 'DESC')
  .set('condition[0][key]', 'created_at')
  .set('condition[0][compare]', '>=')
  .set('condition[0][value]', '2026-01-01');
```

### 13.8. Error handling

Nên xử lý lỗi tập trung trong interceptor hoặc service helper. Backend có thể trả HTTP 200 nhưng `code` khác `success` ở một số luồng custom, nên UI nên kiểm tra cả `response.code`.

```ts
import { catchError, map, throwError } from 'rxjs';

function unwrapApiResponse<T>() {
  return map((res: ApiResponse<T>) => {
    if (res.code !== 'success') {
      throw new Error(res.message || 'API request failed');
    }

    return res.data;
  });
}

function handleApiError() {
  return catchError((error) => {
    const message = error?.error?.message || error?.message || 'API request failed';
    return throwError(() => new Error(message));
  });
}
```

## 14. Angular integration checklist

- Với Google/Microsoft/Zalo/Firebase, frontend chỉ gửi token/credential từ SDK client; không đưa client secret/provider secret vào Angular.
- Với upload AWS, gửi `FormData` bằng `HttpClient`, không tự set `Content-Type`, và dùng header `folder` nếu cần phân thư mục.
- Khi cần link tải file AWS dạng JSON, dùng `POST /aws/file/:name`; khi muốn mở file trực tiếp, dùng `GET /aws/file/:name`.
- Cấu hình `environment.apiBaseUrl` đúng theo domain, realm và version runtime.
- Import `HttpClientModule` hoặc dùng `provideHttpClient()` nếu app standalone.
- Đăng ký auth interceptor để gắn `Authorization: Bearer <access_token>`.
- Bật `withCredentials` nếu backend dùng session cookie `connect.sid` và triển khai khác domain.
- Tạo interface response chung: `ApiResponse<T>` và `ApiListResponse<T>`.
- Mỗi màn hình nên có service riêng gọi resource backend, component không gọi HTTP trực tiếp.
- Dùng `HttpParams` cho `limit`, `paged`, `orderby`, `order`, `search`, `condition`, `with`.
- Khi tạo/sửa chỉ gửi field nghiệp vụ, không gửi field hệ thống như `created_by`, `updated_by`, `is_deleted`.
- Với danh sách lớn, ưu tiên `limit + paged`; nếu dùng cursor thì lưu `next_cursor`/`prev_cursor` từ response.
- Kiểm tra file `routes/apis/<realm>.js` để biết resource có hỗ trợ `create`, `update`, `delete` hay chỉ `manager`.
- Kiểm tra controller trong `app/controllers/<realm>/` trước khi dùng `search`, `with`, filter hoặc route custom.

## 15. Những điểm cần xác nhận với backend trước khi triển khai frontend thật

- Domain/base URL theo môi trường dev/staging/production.
- Realm nào đang bật trong `config/system/realms.js` runtime.
- Realm dùng `auth: local` hay `auth: token`.
- Cách gửi token thực tế: Bearer token, cookie session, hay cả hai.
- Resource nào public, resource nào cần quyền cụ thể.
- Controller custom có route ngoài CRUD hay không.
- Field request/response chính xác cho từng màn hình, vì tài liệu này mô tả quy ước chung chứ không thay thế schema nghiệp vụ chi tiết.
