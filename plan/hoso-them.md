# Thiết kế Component: HosoThem

## 1. Tổng quan

Component `HosoThem` — thêm mới hồ sơ thí sinh.
Standalone component, route: `/admin/hoso-them`.

## 2. Luồng xử lý chính

```
Mở component
    │
    ▼
┌─ Bên trái: chọn Ngành → CTĐT (cascade) ─┐
│  (luôn hiển thị, không phụ thuộc CCCD)   │
└──────────────────────────────────────────┘

┌─ Bên phải (mặc định): ──────────────────────┐
│  NHẬP CCCD ĐỂ KIỂM TRA                      │
│                                              │
│  Số CCCD: [________________]  [🔍 Kiểm tra]  │
│                                              │
│  ─── Kết quả: ───                            │
│                                              │
│  [Nếu KHÔNG tồn tại]                         │
│    → Tự động chuyển sang FORM THÊM MỚI       │
│    → Form đã điền sẵn số CCCD vừa nhập       │
│                                              │
│  [Nếu CÓ tồn tại hồ sơ]                      │
│    → Hiển thị thông tin hồ sơ cũ (readonly)  │
│    → Có nút [Đóng] để reset về CCCD input     │
└──────────────────────────────────────────────┘
```

## 3. Layout tổng thể

```
┌──────────────────────────────────────────────────────────────────┐
│  PHẦN 1: HEADER (cố định)                                        │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Thêm hồ sơ thí sinh                          [↺ Reset]      │ │
│  └──────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│  PHẦN 2: BODY (flex-grow, scroll riêng từng panel)               │
│  ┌─────────────────────────┬────────────────────────────────────┐ │
│  │  BÊN TRÁI (320px)        │  BÊN PHẢI (flex-1)               │ │
│  │  ─────────────           │  ────────────────                  │ │
│  │  overflow-y: auto        │  overflow-y: auto                  │ │
│  │                          │                                    │ │
│  │  Ngành học     [▼]      │  ┌── TRẠNG THÁI: CCCD_CHECK ────┐ │ │
│  │  Chương trình  [▼]      │  │  Nhập CCCD để kiểm tra       │ │ │
│  │                          │  │  CCCD: [________] [Kiểm tra] │ │ │
│  │                          │  └──────────────────────────────┘ │ │
│  │                          │       hoặc                         │ │
│  │                          │  ┌── TRẠNG THÁI: EXISTING ──────┐ │ │
│  │                          │  │  ⚠ Đã tồn tại hồ sơ          │ │ │
│  │                          │  │  Họ tên: ..., SĐT: ...        │ │ │
│  │                          │  │  [Đóng]                       │ │ │
│  │                          │  └──────────────────────────────┘ │ │
│  │                          │       hoặc                         │ │
│  │                          │  ┌── TRẠNG THÁI: FORM ──────────┐ │ │
│  │                          │  │  1. Thông tin cá nhân        │ │ │
│  │                          │  │     [Ảnh thẻ]                │ │ │
│  │                          │  │    Họ tên * | Ngày sinh       │ │ │
│  │                          │  │    SĐT *     | Email           │ │ │
│  │                          │  │    Tỉnh      | Huyện           │ │ │
│  │                          │  │    Xã        | Địa chỉ         │ │ │
│  │                          │  │    Nơi sinh  | Dân tộc         │ │ │
│  │                          │  │    Nguồn ĐK  | Hình thức XT   │ │ │
│  │                          │  │                               │ │ │
│  │                          │  │  2. CCCD                      │ │ │
│  │                          │  │    [CCCD mặt trước][mặt sau]  │ │ │
│  │                          │  │    Số CCCD | Ngày cấp         │ │ │
│  │                          │  │    Nơi cấp                     │ │ │
│  │                          │  │                               │ │ │
│  │                          │  │  3. Thông tin xét tuyển       │ │ │
│  │                          │  │    Đợt ĐK | Điểm XT           │ │ │
│  │                          │  │                               │ │ │
│  │                          │  │  4. Văn bằng TN THPT          │ │ │
│  │                          │  │    [Ảnh VB]                   │ │ │
│  │                          │  │    Loại | Năm | Số hiệu       │ │ │
│  │                          │  │                               │ │ │
│  │                          │  │  5. Văn bằng chuyên môn       │ │ │
│  │                          │  │    Tên VB | Ngành | Nơi cấp   │ │ │
│  │                          │  │                               │ │ │
│  │                          │  │  ──────────────────────────   │ │ │
│  │                          │  │  [💾 Thêm mới]  [↺ Reset]    │ │ │
│  │                          │  └──────────────────────────────┘ │ │
│  └──────────────────────────┴────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## 4. Right Panel States

Bên phải có 3 trạng thái, điều khiển bằng signal `rightState`:

```
type RightPanelState = 'cccd_check' | 'existing' | 'form'
```

### State 1: `cccd_check` (mặc định)

Giao diện nhập CCCD + nút Kiểm tra.

```
┌──────────────────────────────────────┐
│  🔍 Kiểm tra CCCD                    │
│                                      │
│  Nhập số CCCD để kiểm tra.           │
│  Nếu chưa có hồ sơ hoặc hồ sơ cũ     │
│  đã bỏ học, bạn có thể tạo mới.      │
│                                      │
│  Số CCCD: [________________]         │
│                                      │
│  [Hủy]     [🔍 Kiểm tra]             │
└──────────────────────────────────────┘
```

### State 2: `existing` (CCCD đã tồn tại trong hệ thống)

```
┌──────────────────────────────────────┐
│  ⚠ Đã tồn tại hồ sơ                   │
│                                      │
│  Thông tin hồ sơ:                    │
│  ──────────────────────────────────  │
│  Họ tên:      Nguyễn Văn A           │
│  SĐT:         0912345678             │
│  Ngành:       CNTT                   │
│  Chương trình: Đại trà               │
│  Đợt:         Đợt 1 - 2026          │
│  Trạng thái:  [Chờ duyệt]            │
│  Ngày tạo:    2026-07-01             │
│                                      │
│  [🔙 Quay lại kiểm tra CCCD]         │
└──────────────────────────────────────┘
```

### State 3: `form` (CCCD hợp lệ, hiển thị form nhập)

Form nhập liệu đầy đủ (xem chi tiết mục 5).

## 5. Component Tree

```
HosoThemComponent (standalone)
│
├── Header
│   ├── <h4> Thêm hồ sơ thí sinh
│   └── [↺ Reset] button (secondary)
│
├── Left Panel (luôn hiển thị)
│   ├── Nhóm: Ngành học
│   │   └── <p-select> [options]="nganhOptions"
│   └── Nhóm: Chương trình đào tạo
│       └── <p-select> [options]="chuongTrinhOptions" [disabled]="!selectedMajor"
│
├── Right Panel
│   │
│   ├── [STATE: cccd_check] ──────────────────────────
│   │   └── Giao diện nhập CCCD + nút Kiểm tra
│   │
│   ├── [STATE: existing] ────────────────────────────
│   │   └── Thông tin hồ sơ cũ (readonly) + nút [Quay lại]
│   │
│   └── [STATE: form] ────────────────────────────────
│       ├── Section 1: Thông tin cá nhân
│       │   ├── [upload-anh-the] ← Ảnh thẻ
│       │   ├── full_name (input, required)
│       │   ├── phone (input, required) | email (input)
│       │   ├── birthday (date) | dan_toc (input)
│       │   ├── tinh_id (select) | huyen_id (select)
│       │   ├── xa_id (select) | address (textarea)
│       │   ├── noi_sinh (input) | nguon_dang_ky (select)
│       │   └── hinhthuc_xettuyen (select)
│       │
│       ├── Section 2: CCCD
│       │   ├── [upload-cccd-mat-truoc] | [upload-cccd-mat-sau]
│       │   ├── cccd (input, readonly - đã nhập từ bước kiểm tra)
│       │   ├── cccd_ngaycap (date)
│       │   └── cccd_noicap (input)
│       │
│       ├── Section 3: Thông tin xét tuyển
│       │   ├── dot_dangky_id (select) | diem_xettuyen (number)
│       │   └── hinhthuc_xettuyen (select)
│       │
│       ├── Section 4: Văn bằng TN THPT
│       │   ├── [upload-vb-tn-anh]
│       │   ├── vb_tn (input) | vb_tn_nam (input)
│       │   └── vb_tn_sohieu (input)
│       │
│       ├── Section 5: Văn bằng chuyên môn
│       │   ├── vb_chuyenmon (input) | vb_chuyenmon_nganh (input)
│       │   └── vb_chuyenmon_noicap (input)
│       │
│       └── Form Footer
│           ├── [💾 Thêm mới] button (primary)
│           └── [↺ Reset] button (secondary)
```

## 6. Danh sách trường dữ liệu theo section

### 6.1. Thông tin cá nhân

| Trường | Type | Required | Component | Ghi chú |
|--------|------|----------|-----------|---------|
| `anh_the` | string | | UploadPlaceholder | Ảnh thẻ |
| `full_name` | string | ✓ | p-inputText | Họ và tên |
| `phone` | string | ✓ | p-inputText | SĐT, pattern /^(0[35789])(\d{8})$/ |
| `email` | string | | p-inputText | Email |
| `birthday` | string | | p-inputText[type=date] | Ngày sinh |
| `tinh_id` | number | | p-select | Tỉnh/TP |
| `huyen_id` | number | | p-select | Quận/Huyện |
| `xa_id` | number | | p-select | Xã/Phường |
| `address` | string | | p-textarea | Địa chỉ chi tiết |
| `noi_sinh` | string | | p-inputText | Nơi sinh |
| `dan_toc` | string | | p-inputText | Dân tộc |
| `nguon_dang_ky` | string | | p-select | website, doi_tac, truc_tiep |
| `hinhthuc_xettuyen` | string | | p-select | hoc_ba, thpt_quoc_gia, xet_tuyen_som |

### 6.2. CCCD

| Trường | Type | Component | Ghi chú |
|--------|------|-----------|---------|
| `cccd_mattruoc` | string | UploadPlaceholder | Ảnh CCCD mặt trước |
| `cccd_matsau` | string | UploadPlaceholder | Ảnh CCCD mặt sau |
| `cccd` | string | p-inputText (readonly) | Đã nhập từ bước kiểm tra |
| `cccd_ngaycap` | string | p-inputText[type=date] | Ngày cấp |
| `cccd_noicap` | string | p-inputText | Nơi cấp |

### 6.3. Thông tin xét tuyển

| Trường | Type | Component | Ghi chú |
|--------|------|-----------|---------|
| `dot_dangky_id` | number | p-select | Đợt đăng ký |
| `diem_xettuyen` | number | p-inputText[type=number] | Điểm xét tuyển |

*Note: `major_id` và `program_id` được đồng bộ từ left panel, không cần hiển thị lại ở right panel.*

### 6.4. Văn bằng TN THPT

| Trường | Type | Component | Ghi chú |
|--------|------|-----------|---------|
| `vb_tn_anh` | string | UploadPlaceholder | Ảnh văn bằng |
| `vb_tn` | string | p-inputText | Loại văn bằng |
| `vb_tn_nam` | string | p-inputText | Năm tốt nghiệp |
| `vb_tn_sohieu` | string | p-inputText | Số hiệu văn bằng |

### 6.5. Văn bằng chuyên môn

| Trường | Type | Component | Ghi chú |
|--------|------|-----------|---------|
| `vb_chuyenmon` | string | p-inputText | Tên văn bằng |
| `vb_chuyenmon_nganh` | string | p-inputText | Ngành học |
| `vb_chuyenmon_noicap` | string | p-inputText | Nơi cấp |

## 7. Data Flow

### 7.1 Services

| Service | Method | Mục đích |
|---------|--------|----------|
| `NganhhocService` | `load()` | Danh sách ngành |
| `ChuongtrinhDaotaoService` | `load(search, major_id)` | CTĐT theo major_id |
| `HosoThisinhService` | `checkCccd(cccd)` | Kiểm tra CCCD |
| `HosoThisinhService` | `create(payload)` | Tạo hồ sơ |
| `DotXettuyenService` | `load()` | Đợt xét tuyển |
| `LocationService` | `queryLocation()` | Tỉnh/Huyện/Xã |

### 7.2 State (signals)

```typescript
// Right panel state
rightState = signal<'cccd_check' | 'existing' | 'form'>('cccd_check')

// CCCD check
cccdInput = ''
cccdLoading = false
cccdResult: HosoCheckCccdResult | null = null

// Left panel
selectedMajorId = signal<number | null>(null)
selectedProgramId = signal<number | null>(null)
nganhOptions = signal<IctuDropdownOption<number>[]>([])
chuongTrinhOptions = signal<IctuDropdownOption<number>[]>([])

// Lookups
dots = signal<IctuDropdownOption<number>[]>([])
listTinh = signal<IctuDropdownOption<number>[]>([])
listHuyen = signal<IctuDropdownOption<number>[]>([])
listXa = signal<IctuDropdownOption<number>[]>([])

// Form
submitting = signal(false)
```

### 7.3 FormGroup

```typescript
formGroup = this.fb.group({
    // Personal info
    full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    phone: ['', [Validators.required, Validators.pattern(/^(0[35789])(\d{8})$/)]],
    email: ['', [Validators.email]],
    birthday: [''],
    tinh_id: [null],
    huyen_id: [null],
    xa_id: [null],
    address: [''],
    noi_sinh: [''],
    dan_toc: [''],
    nguon_dang_ky: ['website'],
    hinhthuc_xettuyen: ['hoc_ba'],
    // CCCD
    cccd: [{ value: '', disabled: true }], // readonly
    cccd_ngaycap: [''],
    cccd_noicap: [''],
    // Xét tuyển
    major_id: [null],
    program_id: [null],
    dot_dangky_id: [null],
    // Văn bằng THPT
    vb_tn: [''],
    vb_tn_nam: [''],
    vb_tn_sohieu: [''],
    diem_xettuyen: [null],
    // Văn bằng chuyên môn
    vb_chuyenmon: [''],
    vb_chuyenmon_nganh: [''],
    vb_chuyenmon_noicap: [''],
    // Hidden
    owner_by: [null],
    status: ['cho_duyet'],
})
```

## 8. Events / Handlers

### CCCD Check
| Event | Handler | Mô tả |
|-------|---------|-------|
| Click [Kiểm tra] | `runCccdCheck()` | Gọi API check → nếu không found → chuyển state='form'; nếu found → state='existing' |
| Click [Quay lại] | `backToCccdCheck()` | Reset về state='cccd_check' |

### Left Panel
| Event | Handler | Mô tả |
|-------|---------|-------|
| (onChange) ngành | `onMajorChange(id)` | Load CTĐT, sync major_id vào form |
| (onChange) CTĐT | `onProgramChange(id)` | Sync program_id vào form |

### Form Actions
| Event | Handler | Mô tả |
|-------|---------|-------|
| Click [Reset] (header) | `onReset()` | Reset toàn bộ về mặc định (state='cccd_check') |
| Click [Thêm mới] (footer) | `onSubmit()` | Validate → create → success → reset |
| Click [Reset] (footer) | `onResetForm()` | Clear form fields |

## 9. Right Panel State Template

```html
<div class="hoso-them__right-content">
    @switch (rightState()) {
        <!-- STATE: nhập CCCD -->
        @case ('cccd_check') {
            <div class="hoso-them__cccd-check">
                <h5>🔍 Kiểm tra CCCD</h5>
                <p>Nhập số CCCD để kiểm tra...</p>
                <div class="ictu-form__row">
                    <input pInputText [(ngModel)]="cccdInput" placeholder="Số CCCD" />
                    <button (click)="runCccdCheck()" mat-flat-button>Kiểm tra</button>
                </div>
            </div>
        }

        <!-- STATE: đã tồn tại -->
        @case ('existing') {
            <div class="hoso-them__existing">
                <div class="hoso-them__existing-alert">⚠ Đã tồn tại hồ sơ</div>
                <dl>
                    <dt>Họ tên</dt><dd>{{ cccdResult.record.full_name }}</dd>
                    <!-- ... other fields ... -->
                </dl>
                <button (click)="backToCccdCheck()" mat-flat-button>Quay lại</button>
            </div>
        }

        <!-- STATE: form nhập -->
        @case ('form') {
            <form [formGroup]="formGroup">
                <!-- Sections 1-5 -->
            </form>
            <div class="hoso-them__form-footer">
                <button (click)="onSubmit()">Thêm mới</button>
                <button (click)="onResetForm()">Reset</button>
            </div>
        }
    }
</div>
```

## 10. CSS chi tiết

```scss
.hoso-them {
    display: flex;
    flex-direction: column;
    height: 100%;

    // ===== HEADER =====
    &__header {
        flex-shrink: 0;
        padding: 16px 24px;
        background: #fff;
        border-bottom: 1px solid #e4e4e7;
        display: flex;
        align-items: center;
        justify-content: space-between;

        &-title {
            font-size: 18px;
            font-weight: 700;
            color: #18181b;
            display: flex;
            align-items: center;
            gap: 8px;
        }
    }

    // ===== BODY =====
    &__body {
        flex: 1;
        display: flex;
        overflow: hidden;
    }

    // ===== LEFT PANEL =====
    &__left {
        width: 320px;
        min-width: 320px;
        border-right: 1px solid #e4e4e7;
        background: #fafafa;
        overflow-y: auto;

        &-content {
            padding: 24px 20px;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        &-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        &-label {
            font-size: 13px;
            font-weight: 600;
            color: #3f3f46;
        }
    }

    // ===== RIGHT PANEL =====
    &__right {
        flex: 1;
        overflow-y: auto;
        background: #fff;

        &-content {
            padding: 24px 28px 32px;
            max-width: 900px;
        }
    }

    // ===== CCCD CHECK STATE =====
    &__cccd-check {
        max-width: 480px;
        margin: 80px auto 0;
        text-align: center;

        h5 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        p { color: #52525b; margin-bottom: 20px; }

        .ictu-form__row {
            display: flex;
            gap: 10px;
            justify-content: center;
        }

        input { flex: 1; max-width: 280px; }
    }

    // ===== EXISTING STATE =====
    &__existing {
        max-width: 600px;
        margin: 40px auto 0;

        &-alert {
            background: #fef3c7;
            border: 1px solid #fde68a;
            color: #92400e;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-weight: 500;
        }

        dl {
            display: grid;
            grid-template-columns: 140px 1fr;
            gap: 10px 16px;
            dt { color: #71717a; font-weight: 500; }
            dd { color: #18181b; margin: 0; }
        }

        button { margin-top: 20px; }
    }

    // ===== FORM FOOTER =====
    &__form-footer {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        padding-top: 20px;
        margin-top: 8px;
        border-top: 1px solid #e4e4e7;
    }
}

// ===== Kế thừa từ hoso-tuyensinh =====
.hoso-form__section { ... }
.hoso-form__section-title { ... }
.ictu-form__row--two { ... }
```

## 11. Files cần sửa

```
frontend/src/app/pages/admin/children/hoso/hoso-them/
├── hoso-them.component.css     # CSS (layout + 3 states + form)
├── hoso-them.component.html    # Template (header + left + right@switch)
└── hoso-them.component.ts      # Logic (signals, form, services, handlers)
```
