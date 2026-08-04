# Plan: HosoXettuyenComponent

## Yêu cầu

Tạo component `hoso-xettuyen` hiển thị danh sách hồ sơ thí sinh theo đợt xét tuyển, có filter, phân quyền, init load danh mục.

## Phân tích

### Component đích
`frontend/src/app/pages/admin/children/hoso/hoso-xettuyen/` — hiện là skeleton.

### Pattern hiện tại (standalone component)
- `inject()` tất cả services
- `IctuDataTable<T>` cho table data
- `IctuFormControl2<T>` cho form (drawer) — TẠM THỜI CHƯA CẦN form add/edit trong phase 1
- `Subject<DataTableEvent<T>>` + event handler registry
- `permissionControl` signal từ `auth.getUserPermission('module-key')`
- `forkJoin` load lookups trong ngOnInit
- `takeUntil(this.onDestroy$)` unsubscribe pattern
- View state: `'loading' | 'success' | 'error'`

### Routing
Đã có trong `hoso-routing.module.ts`:
- `path: ''` → redirect `hoso-xettuyen`
- `path: 'hoso-xettuyen'` → loadComponent

### Services / Models cần dùng
| Service | Model | Endpoint | Mục đích |
|---------|-------|----------|----------|
| `HosoThisinhService` | `HosoThisinh` | `hoso-tuyensinh` | Load ds hồ sơ |
| `DotXettuyenService` | `DotXettuyen` | `dot-xettuyen` | Load đợt xét tuyển (filter) |
| `NganhhocService` | `Nganhhoc` | `nganh-hoc` | Load ngành học (filter + hiển thị) |
| `ChuongtrinhDaotaoService` | `ChuongtrinhDaotao` | `chuongtrinh-daotao` | CTĐT (hiển thị) |

### Permission key
Đang dùng `'hoso-tuyensinh'` trong `HosoTuyensinhComponent` → dùng lại key này.

### Constants có sẵn trong syscats.ts
- `TH_XETTUYEN` — mảng trạng thái xét tuyển

## Implementation Plan

### Phase 1: Core Component — Danh sách hồ sơ + filter

**Files:**
- `hoso-xettuyen.component.ts`
- `hoso-xettuyen.component.html`
- `hoso-xettuyen.component.css`

**Component structure:**

#### 1. Imports (Angular, Models, Services, UI, RxJS)

#### 2. SearchInfo
```typescript
searchInfo: HosoThisinhSearchInfo = {
    search: '',
    status: undefined,
    dot_xet_tuyen_id: undefined,
    major_id: undefined,
};
```

#### 3. Lookups (forkJoin trong ngOnInit)
- `dots: WritableSignal<IctuDropdownOption<number>[]>` — đợt xét tuyển
- `majors: WritableSignal<IctuDropdownOption<number>[]>` — ngành học
- `programs: WritableSignal<IctuDropdownOption<number>[]>` — CTĐT

#### 4. Master table (read-only list)
- `dataTable: IctuDataTable<HosoThisinh>`
- `loadData(paged, resetPaginator)` — gọi `hosoService.load(searchInfo, queryParams)`
- `state: 'loading' | 'success' | 'error'`

#### 5. Columns hiển thị
| Cột | Field | Ghi chú |
|-----|-------|---------|
| # | index | |
| Họ tên | `full_name` | |
| SĐT | `phone` | |
| Email | `email` | |
| Ngành | `major_id` | Map từ majors lookup |
| CTĐT | `program_id` | Map từ programs lookup |
| Đợt ĐK | `dot_xet_tuyen_id` | Map từ dots lookup |
| Trạng thái | `status` | Badge với màu |
| Hành động | | View/Edit/Delete buttons |

#### 6. Filter bar
- Search input (tìm theo tên/SĐT)
- Select filter theo đợt xét tuyển
- Select filter theo ngành học
- Select filter theo trạng thái (dùng `TH_XETTUYEN` từ syscats)

#### 7. Templates
- HTML: section table pattern giống dot-xettuyen
  - Loading state
  - Error state với reload link
  - Table với checkbox, index, các cột dữ liệu, action buttons
  - Paginator
- CSS: layout table (kế thừa pattern từ dot-xettuyen)

#### 8. Phân quyền
```typescript
permissionControl: Signal<IctuPermissionControl> = signal<IctuPermissionControl>(
    new IctuPermissionControl(this.auth.getUserPermission('hoso-tuyensinh'))
);
```

#### 9. Status badge helpers
```typescript
statusLabel(status: string): string
statusBadgeClass(status: string): string
majorLabel(id: number): string
programLabel(id: number): string
dotLabel(id: number): string
```

### Phase 2: Drawer form (chi tiết hồ sơ)
*Không nằm trong phase 1 — sẽ implement sau.*

## File thay đổi

| File | Action |
|------|--------|
| `hoso-xettuyen/hoso-xettuyen.component.ts` | **REWRITE** — từ skeleton → full component |
| `hoso-xettuyen/hoso-xettuyen.component.html` | **REWRITE** — template table + filter |
| `hoso-xettuyen/hoso-xettuyen.component.css` | **REWRITE** — styles |
| `hoso-routing.module.ts` | **KHÔNG ĐỔI** — đã config sẵn |

## Risks
- **LOW**: Cần kiểm tra permission key `'hoso-tuyensinh'` có hoạt động với user hiện tại không
- **LOW**: API trả về field names có khớp với model không

## Complexity: MEDIUM (~150-200 LOC TS, ~80 LOC HTML, ~50 LOC CSS)
