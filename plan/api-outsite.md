# Kế hoạch: Service gọi API bên ngoài (External API Service)

## Yêu cầu

Tạo service cho phép gọi các API ngoài hệ thống, không nằm trong internal API (`https://api-dev.ictu.vn:10091/tuyensinhv3/api/`).

API mẫu:
- `https://api-dev.ictu.vn:10091/lcms/api/ctdt/list`
- `https://api-dev.ictu.vn:10091/lcms/api/ctdt/nganh`

## Vấn đề file hiện tại (`api-outsite.service.ts`)

1. **Constructor nhận tham số `router`** → Angular DI không thể inject string, sẽ crash runtime
2. **Inject `AuthenticationService` không cần thiết** → External API không dùng JWT nội bộ
3. **`console.log`** → Không được phép trong production code
4. **Gắn API base vào `ENVIRONMENT.deployment.api`** → Sai, external API dùng domain khác

## Thiết kế

### 1. Environment config

Thêm config cho external API vào `environment.model.ts` + `environment.ts`:

```typescript
// Trong DeploymentEnvironment
readonly externalApi: string; // VD: 'https://api-dev.ictu.vn:10091/lcms/api/'
```

### 2. Response models

Cần fetch API thực tế để xác định response shape. Dự kiến:

```typescript
export interface CtdtItem {
  id: number;
  ma: string;
  ten: string;
  // ... các field từ API
}
```

### 3. ExternalApiService

```typescript
@Injectable({ providedIn: 'root' })
export class ApiOutsiteService {
  private readonly http = inject(HttpClient);
  private readonly externalApi: string;

  constructor() {
    this.externalApi = ENVIRONMENT.deployment.externalApi;
  }

  private get<T>(path: string): Observable<T> {
    return this.http.get<T>(this.externalApi + path);
  }

  getCtdtList(): Observable<CtdtItem[]> {
    return this.get<CtdtItem[]>('ctdt/list');
  }

  getNganhList(): Observable<NganhItem[]> {
    return this.get<NganhItem[]>('ctdt/nganh');
  }
}
```

### 4. CORS handling

Nếu dev server bị chặn CORS, dùng proxy:
```json
// proxy.conf.json
{
  "/lcms/*": {
    "target": "https://api-dev.ictu.vn:10091",
    "secure": false,
    "changeOrigin": true
  }
}
```

### 5. Interceptor bypass

External API không cần auth token. Dùng `HttpClient` riêng hoặc thêm `HttpContext` để interceptor skip.

## Các file cần tạo/sửa

| File | Action |
|------|--------|
| `environment.model.ts` | Sửa - thêm `externalApi` |
| `environment.ts` | Sửa - thêm URL |
| `environment.prod.ts` | Sửa - thêm URL |
| `models/external-api.ts` | Tạo - interfaces |
| `api-outsite.service.ts` | Sửa lại hoàn toàn |
| `proxy.conf.json` | Tạo (nếu cần CORS) |

## Complexity: LOW

---

**Chờ xác nhận**: Đồng ý kế hoạch? Cần chỉnh sửa gì không?
