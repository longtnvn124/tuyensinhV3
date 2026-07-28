# Design: FormThongtinDangkyComponent — Approach A (CCCD check bên trong)

## 1. Mục tiêu

Viết lại component với CCCD check **nằm trong form component** (giống v14), áp dụng Angular 19 patterns: Signals, `inject()`, `takeUntilDestroyed()`, `@if/@for/@switch`.

---

## 2. Kiến trúc tổng thể

### 2.1. Phân luồng view mới

```
FormThongtinDangkyComponent
│
├── viewState = 'loading'       ──►  progress bar + "Đang tải..."
├── viewState = 'error'         ──►  "Mất kết nối" + nút [Tải lại]
├── viewState = 'cccd_check'    ──►  Input CCCD + nút [Kiểm tra]
├── viewState = 'existing'      ──►  Card thông tin thí sinh cũ + [Quay lại]
└── viewState = 'form'          ──►  Form đăng ký + nút [Lưu] / [Hủy]
```

### 2.2. Interaction Flow

```
User nhập CCCD + [Kiểm tra]
        │
        ▼
checkCccd(cccd)
        │
        ├── API trả về: không tìm thấy ──► viewState = 'form'
        │                                     (tự động set CCCD vào form)
        │
        ├── API trả về: found, status = 'bo_hoc' ──► viewState = 'form'
        │                                              (cho phép tạo mới)
        │
        └── API trả về: found, status ≠ 'bo_hoc' ──► viewState = 'existing'
                                                       (hiện thông tin cũ)

┌─ existing ─────────────────────────────────────┐
│  [Quay lại] ──► viewState = 'cccd_check'       │
└────────────────────────────────────────────────┘

┌─ form ─────────────────────────────────────────┐
│  [Lưu]    ──► submitData() → saved.emit()      │
│  [Hủy]    ──► cancel.emit() → parent onReset() │
│  [Reset]  ──► resetForm(): clear dataId,        │
│               cccdResult + initForm()            │
└────────────────────────────────────────────────┘
```

### 2.3. Component Tree (mới)

```
HosoThemComponent (parent — simplified)
├── Left Panel: ngành + CTĐT (giữ nguyên)
│
└── Right Panel:
    └── <app-form-thongtin-dangky
            [data]="editData"         // Optional: edit mode
            [majorId]="selectedMajorId()"   // Create: auto-fill ngành
            [programId]="selectedProgramId()" // Create: auto-fill CTĐT
            (saved)="onReset()"
            (cancel)="onReset()" />

FormThongtinDangkyComponent (self-contained)
├── viewState = 'cccd_check' → input CCCD
├── viewState = 'existing'   → info card
├── viewState = 'form'       → form + actions
├── viewState = 'loading'    → progress bar
├── viewState = 'error'      → retry button
│
├── loadLookups() → forkJoin(profiles, donvi, regions, nganh, users)
├── checkCccd(cccd) → hosoService.checkCccd() → set viewState
├── submitData() → create/update + status
└── formReset() → initForm() + set default values
```

### 2.4. Parent Interface (tối giản)

```typescript
// HosoThemComponent — không quản lý CCCD state gì cả
<app-form-thongtin-dangky
    [data]="editData()"
    [majorId]="selectedMajorId()"
    [programId]="selectedProgramId()"
    (saved)="onReset()"
    (cancel)="onReset()" />
```

---

## 3. State Management (Signals)

```typescript
type ViewState = 'loading' | 'error' | 'cccd_check' | 'existing' | 'form';

// View
readonly viewState = signal<ViewState>('loading');

// CCCD check
readonly cccdInput     = signal<string>('');
readonly cccdResult    = signal<HosoCheckCccdResult | null>(null);
readonly existingRecord = computed(() => {
    const r = this.cccdResult();
    return r && r.found ? r.record : null;
});
readonly cccdValid     = computed(() => this.viewState() === 'form');
readonly cccdLoading   = signal(false);

// Role flags
isManager     : Signal<boolean>
isLanhDaoKhoa : Signal<boolean>
canEdit       : Signal<boolean>
canAdd        : Signal<boolean>
duyetHoso     : Signal<boolean>

// Lookup data signals
listTinh             = signal<Locations[]>([])
listXa               = signal<Locations[]>([])
listDonViChuyenmon   = signal<any[]>([])
listNganhTuyensinh   = signal<any[]>([])
listUserDoitac       = signal<User[]>([])

// Form (giữ ReactiveForms)
formData!: FormGroup
submitting = signal(false)
```

---

## 4. Luồng khởi tạo (ngOnInit)

```
ngOnInit()
│
├── initForm()
│
├── loadLookups()
│   ├── forkJoin(profiles, donvi, regions, nganh, users)
│   ├── success → viewState = 'cccd_check'
│   │              (nếu có data input) → getFormData(data) → viewState = 'form'
│   └── error   → viewState = 'error'
│
├── [OPTIONAL] effect() bắt input data để load edit
│   effect(() => {
│       const d = this.data();
│       if (d && this.viewState() === 'ready') {
│           this.getFormData(d);
│       }
│   })
```

---

## 5. Form fields (đã đồng bộ + fix)

| Field | Validators | Ghi chú |
|-------|-----------|---------|
| `full_name` | required, minLength(2) | |
| `birthday` | | InputMask dd/mm/yyyy |
| `phone` | required, pattern `^(0[35789])(\d{8})$` | |
| `email` | email | |
| **`gioi_tinh`** | required | **Fix: `gioi-tinh` → `gioi_tinh`** |
| `dan_toc` | | p-select |
| `noi_sinh` | | p-select (tỉnh) |
| `tinh_id` | | Location cascade |
| `xa_id` | | Location cascade |
| `address` | | textarea |
| `cccd` | required, pattern `[0-9]{12}` | |
| `cccd_ngaycap` | | InputMask |
| `cccd_noicap` | | p-select |
| `van_bang_tn` | | |
| `nam_tn` | | |
| `sohieu_vb` | | |
| **`noicap_tn`** | | **Thêm mới** |
| `vb_chuyenmon` | | |
| `vb_chuyenmon_nganh` | | |
| `vb_chuyenmon_namtn` | | |
| `vb_chuyenmon_noicap` | | |
| **`program_id`** | | **Thêm mới, auto-fill từ parent** |
| **`nganh_dangky`** | | **Thêm mới, auto-fill từ parent** |
| **`hinhthuc_xettuyen`** | | **Thêm mới** |
| **`type_diem`** | | **Thêm mới** |
| **`diemtb`** | | **Thêm mới** |
| **`donvi_chuyenmon_id`** | | **Thêm mới** |
| **`submit_from`** | default `'website'` | **Thêm mới** |
| `status` | default `'cho_duyet'` | |
| `owner_by` | default `auth.user.id` | |
| `nguon_dang_ky` | default `'website'` | |
| **`content`** | | **Thêm mới** |
| Image fields (6) | | OvicImgCropV2 |

---

## 6. CCCD Check Flow

```typescript
// Filter input — chỉ giữ số
onCccdInputChange(value: string): void {
    this.cccdInput.set(value.replace(/\D/g, ''));
}

// Kiểm tra CCCD
runCccdCheck(): void {
    const cccd = this.cccdInput().trim();
    if (cccd.length !== 12) { /* warning */ return; }

    this.cccdLoading.set(true);
    this.hosoService.checkCccd(cccd).subscribe({
        next: (res) => {
            this.cccdResult.set(res);
            this.cccdLoading.set(false);

            if (!res.found || res.record.status === 'bo_hoc') {
                this.formData.patchValue({
                    cccd,
                    nganh_dangky: this.majorId(),    // auto-fill từ parent
                    program_id: this.programId(),     // auto-fill từ parent
                });
                this.viewState.set('form');
            } else {
                this.viewState.set('existing');
            }
        },
        error: () => {
            this.cccdLoading.set(false);
            this.notification.toastError('Kiểm tra CCCD thất bại');
        }
    });
}

backToCccdCheck(): void {
    this.cccdResult.set(null);
    this.viewState.set('cccd_check');
}
```

---

## 7. Submit Flow

```typescript
submitData(): void {
    if (this.formData.invalid) {
        // Show first error
        for (const key of Object.keys(this.errorMessages)) {
            if (this.formData.get(key)?.invalid) {
                this.notification.toastError(this.errorMessages[key]);
                break;
            }
        }
        return;
    }

    this.submitting.set(true);
    const raw = { ...this.formData.getRawValue() };

    // Xử lý diem_xettuyen
    if (raw.type_diem && raw.diemtb) {
        raw.diem_xettuyen = `${raw.type_diem}|${raw.diemtb}`;
    }
    delete raw.type_diem;
    delete raw.diemtb;

    if (this.dataId) {
        // UPDATE
        this.hosoService.updateTuyensinh(this.dataId, raw).pipe(
            switchMap(() => {
                const hasStatusChange = raw.content || raw.status !== this.currentRecord.status;
                return hasStatusChange
                    ? this.tuyensinhStatusService.addTuyensinhStatus({...})
                    : of(null);
            })
        ).subscribe({ next: () => this.onSuccess() });
    } else {
        // CREATE
        this.hosoService.addTuyensinh(raw).pipe(
            switchMap((newId) => this.tuyensinhStatusService.addTuyensinhStatus({
                registration_id: newId,
                status_key: 'XET_TUYEN',
                status_value: 'KHOI_TAO',
                status_name: 'Chờ duyệt',
                content: '',
            }))
        ).subscribe({ next: () => this.onSuccess() });
    }
}

private onSuccess(): void {
    this.submitting.set(false);
    this.notification.isProcessing(false);
    this.notification.toastSuccess('Thành công');
    this.formReset();
    this.saved.emit();
}
```

---

## 8. Input signals (bắt sự kiện từ parent)

```typescript
readonly data      = input<HosoThisinh | null>(null);  // Edit mode → load full data
readonly majorId   = input<number | null>(null);        // Create: auto-fill ngành_dangky
readonly programId = input<number | null>(null);        // Create: auto-fill program_id
```

- **data() ≠ null**: `loadLookups()` gọi `getFormData()` → viewState = 'form' (edit mode)
- **majorId + programId ≠ null**: `runCccdCheck()` patch vào form sau khi CCCD check OK

---

## 9. Tác động đến `HosoThemComponent`

### Bỏ được từ parent:
- `rightState`, `cccdInput`, `cccdLoading`, `cccdResult`, `existingRecord`
- `onCccdChange()`, `runCccdCheck()`, `backToCccdCheck()`
- `statusOptions`
- Template `@case ('cccd_check')`, `@case ('existing')`

### Giữ lại ở parent:
- Left panel (ngành + CTĐT)
- `loadLookups()` cho majors, programs, dots
- `onMajorChange()`, `selectProgram()`
- `onReset()` (reset toàn bộ về mặc định)

### Parent template hiện tại:

```html
<app-form-thongtin-dangky class="w-100" (saved)="onReset()" (cancel)="onReset()"
    [majorId]="selectedMajorId()" [programId]="selectedProgramId()" />
```

---

## 10. Thứ tự thực hiện

| Phase | File(s) | Nội dung | Trạng thái |
|-------|---------|----------|------------|
| 0 | `tuyensinh-status.ts`, `tuyensinh-status.service.ts` | Tạo model + service | ✅ Done |
| 1 | `.ts` | `ViewState` type, signals, role flags | ✅ Done |
| 2 | `.ts` | `initForm()`: fix `gioi_tinh`, thêm fields | ✅ Done |
| 3 | `.ts` | `loadLookups()`: thêm nganh, user profile | ✅ Done |
| 4 | `.ts` | CCCD check (`runCccdCheck`, `backToCccdCheck`) | ✅ Done |
| 5 | `.ts` | `submitData()`: update flow, status, `diem_xettuyen` | ✅ Done |
| 6 | `.ts` | `formReset()` + `data` input | ✅ Done |
| 7 | `.html` | `@switch(viewState())` — 5 cases | ✅ Done |
| 8 | `.html` | Form 6 sections + images + actions | ✅ Done |
| 9 | `.css` | Styles mới | ✅ Done |
| 10 | Parent `.ts/.html` | Gỡ CCCD state, simplify | ✅ Done |

> **Status: ALL PHASES COMPLETE** — Dừng tại đây, chờ phiên tiếp theo.

---

## 11. Risks

- **TuyensinhStatusService**: chưa tồn tại trong v19 → phải tạo
- **DonViService**: chưa tồn tại → tạo hoặc dùng `IctuBaseServiceClass`
- **UserProfileService**: cần kiểm tra có method lấy `donvi_chuyenmon_id` không
- **`gioi_tinh` rename**: ảnh hưởng nếu DB vẫn dùng `gioi-tinh`
- **Parent interface thay đổi**: ảnh hưởng component khác dùng `FormThongtinDangkyComponent`
