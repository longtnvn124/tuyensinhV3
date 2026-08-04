# Design: FormThongtinDangkyComponent — Approach A (CCCD check bên trong)

## 1. Mục tiêu

Component tự quản lý CCCD check, áp dụng Angular 19 patterns: Signals, `inject()`, `takeUntilDestroyed()`, `@switch/@case/@if/@for`.

---

## 2. Kiến trúc tổng thể

### 2.1. Phân luồng view

```
FormThongtinDangkyComponent
│
├── viewState = 'loading'       ──►  progress bar + "Đang tải..."
├── viewState = 'error'         ──►  "Mất kết nối" + nút [Tải lại]
├── viewState = 'cccd_check'    ──►  Input CCCD + nút [Kiểm tra]
├── viewState = 'existing'      ──►  Card thông tin thí sinh cũ + [Quay lại]
└── viewState = 'form'          ──►  Form đăng ký 6 sections + [Lưu] / [Hủy] / [Reset]
```

### 2.2. Interaction Flow

```
User nhập CCCD + [Kiểm tra]
        │
        ▼
runCccdCheck(cccd)
        │
        ├── API trả về: không tìm thấy ──► viewState = 'form'
        │                                     (patch CCCD + majorId + programId vào form)
        │
        ├── API trả về: found, status = 'bo_hoc' ──► viewState = 'form'
        │
        └── API trả về: found, status ≠ 'bo_hoc' ──► viewState = 'existing'
                                                       (hiện thông tin cũ)

┌─ existing ────────────────────────────────────────┐
│  [Quay lại] ──► backToCccdCheck() → viewState = 'cccd_check' │
└───────────────────────────────────────────────────┘

┌─ form ────────────────────────────────────────────┐
│  [Lưu]    ──► submitData() → onSuccess() → saved.emit() │
│  [Hủy]    ──► closeForm(): initForm() + viewState = 'cccd_check' │
└───────────────────────────────────────────────────┘
```

### 2.3. Component Tree

```
HosoThemComponent (parent — simplified)
├── Left Panel: ngành + CTĐT (giữ nguyên)
│
└── Right Panel:
    └── <app-form-thongtin-dangky
            [data]="editData"              // Optional: edit mode
            [majorId]="selectedMajorId()"   // Create: auto-fill ngành
            [programId]="selectedProgramId()" // Create: auto-fill CTĐT
            (saved)="onReset()"
            (cancel)="onReset()" />

FormThongtinDangkyComponent (self-contained)
├── viewState = 'loading'    → progress bar
├── viewState = 'error'      → retry button
├── viewState = 'cccd_check' → input CCCD
├── viewState = 'existing'   → info card
├── viewState = 'form'       → 6-section form + actions
│
├── loadLookups() → forkJoin(tinh, provinces, users, nganh)
├── runCccdCheck(cccd) → hosoService.checkCccd() → set viewState
├── submitData() → create/update + TuyensinhStatus
└── resetForm() / formReset() → clear state + initForm()
```

---

## 3. State Management (Signals)

```typescript
type ViewState = 'loading' | 'error' | 'cccd_check' | 'existing' | 'form';

// View
readonly viewState    = signal<ViewState>('loading');
readonly cccdInput    = signal<string>('');
readonly cccdLoading  = signal(false);
readonly submitting   = signal(false);
dataId: number | null = null;

// CCCD result
private readonly cccdResult = signal<HosoThisinh | null>(null);
readonly existingRecord     = computed(() => this.cccdResult());
readonly cccdValid          = computed(() => this.viewState() === 'form');

// Role flags (computed)
isManager     : Signal<boolean>
isLanhDaoKhoa : Signal<boolean>
canEdit       : Signal<boolean>
canAdd        : Signal<boolean>
duyetHoso     : Signal<boolean>

// Role flags (signals, set in constructor)
isAdmin           = signal(false)
isDoitac          = signal(false)
isNhanVien        = signal(false)
isDoitacNhanvien  = signal(false)

// Lookup data signals
listDantoc        = signal(DanToc)
genderOption      = signal(GENDER)
listVBTN          = signal(VBTN)
listVBCM          = signal(VBCM)
listTinh          = signal<Locations[]>([])
listXa            = signal<Locations[]>([])
listUser          = signal<User[]>([])
listNganh         = signal<IctuDropdownOption<number>[]>([])

// Static options
typeDiemXettuyen  = signal([...])
noicapCCCD        = {value: string, label: string}[]

// Form (ReactiveForms)
formData!: FormGroup
```

---

## 4. Luồng khởi tạo (ngOnInit)

```
ngOnInit()
│
├── initForm()
│
├── loadLookups()
│   ├── forkJoin(tinh, provinces, users, nganh)
│   ├── success →
│   │     ├── có data input? → getFormData(data) → viewState = 'form'
│   │     └── không → viewState = 'cccd_check'
│   └── error → viewState = 'error'
```

---

## 5. Form fields

| Field | Validators | Component |
|-------|-----------|-----------|
| **I. Thông tin cá nhân** |
| `full_name` | required, minLength(2) | pInputText |
| `birthday` | — | p-inputMask dd/mm/yyyy |
| `phone` | required, pattern `^(0[35789])(\d{8})$` | pInputText |
| `email` | email | pInputText |
| `gioi_tinh` | required | p-select |
| `dan_toc` | — | p-select (filter) |
| `noi_sinh` | — | p-select (tinh) |
| `tinh_id` | — | p-select (tinh, cascade) |
| `xa_id` | — | p-select (xa, cascade) |
| `address` | — | pInputText |
| **II. CCCD** |
| `cccd` | required, pattern `[0-9]{12}` | pInputText (readonly) |
| `cccd_ngaycap` | — | p-inputMask dd/mm/yyyy |
| `cccd_noicap` | — | p-select (CQLHCVTTXH / Bộ công an) |
| anh_cmnd_truoc | — | OvicImgCropV2 |
| anh_cmnd_sau | — | OvicImgCropV2 |
| **III. Bằng tốt nghiệp THPT / BTVH** |
| `van_bang_tn` | — | p-select (VBTN) |
| `nam_tn` | — | pInputText |
| `sohieu_vb` | — | pInputText |
| `noicap_tn` | — | pInputText |
| `anh_thpt` | — | OvicImgCropV2 |
| **IV. Văn bằng chuyên môn** |
| `vb_chuyenmon` | — | pInputText |
| `vb_chuyenmon_nganh` | — | pInputText |
| `vb_chuyenmon_noicap` | — | pInputText |
| `vb_chuyenmon_namtn` | — | pInputText |
| **V. Thông tin bổ sung** |
| `nganh_dangky` | — | p-select (filter) |
| `program_id` | — | (hidden, auto-fill từ parent) |
| `type_diem` | — | p-select (THPT / Trung cấp-CĐ-ĐH) |
| `diemtb` | — | p-inputNumber (chỉ hiện khi type_diem = THPT) |
| `content` | — | textarea |
| `nguoi_tuvan_id` | — | p-select (filter), chỉ hiện với admin/doitac, default = user.id với role khác |
| **VI. Hình ảnh hồ sơ** |
| `anh_phieu_dang_ky` | — | OvicImgCropV2 |
| `anh_hoc_ba` | — | OvicAvataTypeMultiple (multiple files) |
| **System** |
| `status` | — | mặc định 'cho_duyet' |
| `owner_by` | — | mặc định auth.user.id |
| `showDiemTb` | signal(true) | Ẩn/hiện điểm TB theo loại điểm |
| `listUserTuvan` | signal (từ listUser, lọc theo quyền) | User list cho người tư vấn |
| `showNguoiTuvan` | computed = isAdmin() || isDoitac() | Hiển thị field người tư vấn |

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
    if (!cccd || cccd.length !== 12) { /* warning */ return; }

    this.cccdLoading.set(true);
    this.hosoService.checkCccd(cccd).subscribe({
        next: (res) => {
            this.cccdLoading.set(false);
            if (!res.found || res.record.status === 'bo_hoc') {
                this.formData.patchValue({
                    cccd,
                    nganh_dangky: this.majorId(),
                    program_id: this.programId(),
                });
                this.viewState.set('form');
            } else {
                this.cccdResult.set(res.record);
                this.viewState.set('existing');
            }
        },
        error: () => {
            this.cccdLoading.set(false);
            this.notification.toastError('Kiểm tra CCCD thất bại');
        },
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
        // Show first error from errorMessages map
        for (const key of Object.keys(this.errorMessages)) {
            if (this.formData.get(key)?.invalid) {
                this.notification.toastError(this.errorMessages[key]);
                break;
            }
        }
        return;
    }

    this.submitting.set(true);
    this.notification.isProcessing(true);
    const raw = { ...this.formData.getRawValue() };

    // Xử lý diem_xettuyen
    if (raw.type_diem && raw.diemtb) {
        raw.diem_xettuyen = `${raw.type_diem}|${raw.diemtb}`;
    }
    delete raw.type_diem;
    delete raw.diemtb;

    if (this.dataId) {
        // UPDATE → hosoService.updateTuyensinh() + optional status change
        this.hosoService.updateTuyensinh(this.dataId, raw).pipe(
            switchMap(() => {
                const hasStatusChange = !!(raw.content || currentStatus !== raw.status);
                return hasStatusChange ? this.statusService.addTuyensinh({...}) : of(null);
            })
        ).subscribe({ next: () => this.onSuccess(), error: () => this.onError() });
    } else {
        // CREATE → hosoService.addTuyensinh() + initial status
        this.hosoService.addTuyensinh(raw).pipe(
            switchMap((newId) => this.statusService.addTuyensinh({
                registration_id: newId,
                status_key: 'XET_TUYEN',
                status_value: 'KHOI_TAO',
                status_name: 'Chờ duyệt',
                content: '',
            }))
        ).subscribe({ next: () => this.onSuccess(), error: () => this.onError() });
    }
}
```

---

## 8. Input signals

```typescript
readonly data       = input<HosoThisinh | null>(null);   // Edit mode
readonly majorId    = input<number | null>(null);         // Auto-fill ngành
readonly programId  = input<number | null>(null);         // Auto-fill CTĐT
readonly saved      = output<void>();
readonly cancel     = output<void>();
```

- `data() ≠ null`: `loadLookups()` gọi `getFormData()` → viewState = 'form' (edit mode)
- `majorId + programId ≠ null`: `runCccdCheck()` patch vào form sau khi CCCD check OK

---

## 9. Form methods

| Method | Behavior |
|--------|----------|
| `getFormData(object)` | Patch form từ object, reload wards nếu có `tinh_id` |
| `resetForm()` | Clear `dataId`, `cccdResult`, reinit form với defaults |
| `formReset()` | Reinit form + clear `cccdResult` + `dataId` (gọi sau submit success) |
| `closeForm()` | Reset form + chuyển về viewState = 'cccd_check' (không emit cancel) |
| `onTinhChange(event)` | Load xã/phường theo tỉnh đã chọn |

---

## 10. HTML structure

```
@switch (viewState()) {
  @case ('loading')     → progress spinner
  @case ('error')       → icon + message + [Tải lại]
  @case ('cccd_check')  → card: input + [Kiểm tra]
  @case ('existing')    → alert + info table + [Quay lại]
  @case ('form')        → form with 6 sections + action buttons
}

Form sections:
  I.   Thông tin cá nhân (ảnh thẻ, họ tên, ngày sinh, giới tính, dân tộc, SĐT, email, nơi sinh, địa chỉ)
  II.  CCCD (số CCCD readonly, ngày cấp, nơi cấp, ảnh mặt trước/sau)
  III. Bằng tốt nghiệp THPT/BTVH (loại VB, năm TN, số hiệu, nơi cấp)
  IV.  Văn bằng chuyên môn (số hiệu, ngành, nơi cấp, năm TN)
  V.   Thông tin bổ sung (ngành, loại điểm, điểm TB* (*chỉ hiện khi chọn THPT), nội dung)
  VI.  Hình ảnh hồ sơ (phiếu ĐK, bằng TN THPT, học bạ multiple)

Actions:
- **Create** (`!dataId`): `[Hủy]` `[Thêm mới]` (style `--success-reverse`, icon `ti-plus`)
- **Edit** (`dataId`): chỉ `[Cập nhật]` (style `--primary-reverse`, icon `ti-pencil`) — không có nút Hủy

- `[Hủy]` → reset form + chuyển về màn CCCD check
- `[Thêm mới / Cập nhật]` → submit
```

---

## 11. Dependencies & Services

| Service | Usage |
|---------|-------|
| `HosoThisinhService` | `checkCccd()`, `addTuyensinh()`, `updateTuyensinh()` |
| `TuyensinhStatusService` | `addTuyensinh()` (tạo status record) |
| `ApiOutsiteService` | `getNganhList()` |
| `LocationService` | `queryLocation()` cho regions + provinces |
| `UserService` | `query()` lấy user list |
| `AuthenticationService` | `user`, `userHasRole()` |
| `NotificationService` | `toastSuccess/Warning/Error`, `isProcessing()` |

---

## 12. Role flags

| Flag | Roles | Purpose |
|------|-------|---------|
| `isAdmin` | admin, direction, manager | Full access |
| `isDoitac` | doi-tac | Partner view |
| `isNhanVien` | staff | Staff view |
| `isDoitacNhanvien` | doi-tac-cv | Partner staff |
| `isManager` | admin, manager | Quản lý |
| `isLanhDaoKhoa` | direction | Lãnh đạo khoa |
| `canEdit` | admin, manager, staff | Cho phép sửa |
| `canAdd` | admin, manager, staff, doi-tac | Cho phép thêm |
| `duyetHoso` | reviewer | Duyệt hồ sơ |

---

## 13. Tác động đến `HosoThemComponent`

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

### Ở parent template:

```html
<app-form-thongtin-dangky class="w-100" (saved)="onReset()"
    [majorId]="selectedMajorId()" [programId]="selectedProgramId()" />
```

⚠️ `cancel` output đã không dùng nữa — `closeForm()` tự chuyển về CCCD check, không emit ra parent.

---

## 14. Implementation status

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| Models + services (`TuyensinhStatus`) | ✅ Done |
| Signals, ViewState, role flags | ✅ Done |
| `initForm()` với đầy đủ fields | ✅ Done |
| `loadLookups()` — forkJoin 4 API | ✅ Done |
| CCCD check (`runCccdCheck`, `backToCccdCheck`) | ✅ Done |
| `submitData()` — create/update + status | ✅ Done |
| `resetForm()` / `formReset()` / `getFormData()` | ✅ Done |
| HTML template — @switch 5 cases | ✅ Done |
| Form 6 sections + images + actions | ✅ Done |
| CSS styles | ✅ Done |
| Parent simplification | ✅ Done |

---

## 15. Known issues

- **HTML bug (line 318)**: "Nơi cấp bằng" trong Section III dùng `formControlName="sohieu_vb"` — cần sửa thành `noicap_tn` (copy-paste error)
- **`noicapCCCD` label**: Giá trị `'CQLHCVTTXH'` là viết tắt, cần xác nhận display name đúng
- **`OvicAvataTypeMultipleComponent`**: Import mới cho Section VI (upload multiple files)
- **Section III duplicate field (lines 301-312)**: `nam_tn` và `sohieu_vb` cùng nằm trên 1 row giống nhau, `nam_tn` xuất hiện 2 lần ở col-2 và col (flex-div) — cần kiểm tra layout
