# Thiết kế Component: HosoThem

## 1. Tổng quan

Component `HosoThem` — thêm mới hồ sơ thí sinh.
Standalone component, route: `/admin/hoso-them`.

Layout 2 cột: trái chọn Ngành (p-select) → CTĐT (list check), phải info bar + kiểm tra CCCD → form nhập.

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
│  (tự động lọc bỏ chữ cái & khoảng cách)       │
│  (yêu cầu đúng 12 chữ số)                     │
│                                              │
│  ─── Kết quả: ───                            │
│                                              │
│  [Nếu KHÔNG tồn tại hoặc status = bỏ học]    │
│    → Tự động chuyển sang FORM THÊM MỚI       │
│    → Form đã điền sẵn số CCCD vừa nhập       │
│                                              │
│  [Nếu CÓ tồn tại hồ sơ (status ≠ bỏ học)]    │
│    → Hiển thị thông tin hồ sơ cũ (readonly)  │
│    → Có nút [Quay lại] để reset về CCCD input │
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
│  │  overflow-y: auto        │  flex column                       │ │
│  │                          │                                    │ │
│  │  Ngành học     [▼]      │  ┌── INFO BAR (60px) ────────────┐ │ │
│  │                          │  │  Ngành: CNTT │ CTĐT: Đại trà   │ │ │
│  │  Chương trình đào tạo   │  └────────────────────────────────┘ │ │
│  │  ┌─────────────────────┐ │  ┌── TRẠNG THÁI: CCCD_CHECK ────┐ │ │
│  │  │ Item 1  (mờ)       │ │  │  Nhập CCCD để kiểm tra       │ │ │
│  │  │ Item 2  (mờ)       │ │  │  CCCD: [________] [Kiểm tra] │ │ │
│  │  │▶ Item 3  (chọn)    │ │  └──────────────────────────────┘ │ │
│  │  │ Item 4  (mờ)       │ │       hoặc                         │ │
│  │  └─────────────────────┘ │  ┌── TRẠNG THÁI: EXISTING ──────┐ │ │
│  │                          │  │  ⚠ Đã tồn tại hồ sơ           │ │ │
│  │                          │  │  Họ tên: ..., SĐT: ...         │ │ │
│  │                          │  │  [Quay lại kiểm tra CCCD]     │ │ │
│  │                          │  └──────────────────────────────┘ │ │
│  │                          │       hoặc                         │ │
│  │                          │  ┌── TRẠNG THÁI: FORM ──────────┐ │ │
│  │                          │  │  <app-form-thongtin-dangky>   │ │ │
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

Giao diện nhập CCCD + nút Kiểm tra. Input tự động lọc bỏ ký tự không phải số.

```
┌──────────────────────────────────────┐
│  🔍 Kiểm tra CCCD                    │
│                                      │
│  Nhập số CCCD để kiểm tra.           │
│  Nếu chưa có hồ sơ hoặc hồ sơ cũ     │
│  đã bỏ học, bạn có thể tạo mới.      │
│                                      │
│  Số CCCD: [________________]         │
│  (12 chữ số, không chứa chữ/khoảng)  │
│                                      │
│  [🔍 Kiểm tra]                       │
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
│  CCCD:        001234567890           │
│  Ngành:       CNTT                   │
│  CTĐT:        Đại trà               │
│  Đợt:         Đợt 1 - 2026          │
│  Trạng thái:  [Chờ duyệt]            │
│  Ngày tạo:    2026-07-01             │
│                                      │
│  [🔙 Quay lại kiểm tra CCCD]         │
└──────────────────────────────────────┘
```

### State 3: `form` (CCCD hợp lệ, hiển thị form nhập)

Delegate to `<app-form-thongtin-dangky [cccd]="cccdInput" (saved)="onReset()" (cancel)="backToCccdCheck()" />`.

## 5. Component Tree

```
HosoThemComponent (standalone)
│
├── Header
│   ├── <h4> Thêm hồ sơ thí sinh
│   └── [↺ Reset] button (secondary) → onReset()
│
├── Left Panel (luôn hiển thị)
│   ├── Nhóm: Ngành học
│   │   └── <p-select> [options]="nganhOptions"
│   └── Nhóm: Chương trình đào tạo
│       └── List CTĐT dạng item (opacity .4, hover → 1)
│           └── Item đang chọn: nền xanh, border-left 3px, đậm
│
├── Right Panel (flex column)
│   │
│   ├── Info bar (height: 60px, hiển thị nếu có ngành)
│   │   ├── Ngành học: {{ selectedMajorLabel() }}
│   │   ├── Divider
│   │   ├── Chương trình: {{ selectedProgramLabel() }}
│   │   ├── Divider (nếu có)
│   │   ├── Số năm đào tạo: {{ selectedProgramDuration() }}
│   │   ├── Divider (nếu có)
│   │   └── Danh hiệu: {{ selectedProgramDegree() }}
│   │
│   ├── [STATE: cccd_check] ──────────────────────────
│   │   ├── input: filter non-digit via onCccdChange(), maxlength=12
│   │   ├── validation: exactly 12 digits before allowing check
│   │   └── button: runCccdCheck()
│   │
│   ├── [STATE: existing] ────────────────────────────
│   │   └── Thông tin hồ sơ cũ (readonly) + nút [Quay lại]
│   │
│   └── [STATE: form] ────────────────────────────────
│       └── <app-form-thongtin-dangky> (standalone child)
│           ├── Section 1: Thông tin cá nhân
│           │   ├── [ovic-img-crop-v2] ← Ảnh thẻ
│           │   ├── full_name (input, required)
│           │   ├── phone (input, required) | email (input)
│           │   ├── birthday (date) | dan_toc (select)
│           │   ├── tinh_id (select) | huyen_id (select)
│           │   ├── xa_id (select) | address (textarea)
│           │   ├── noi_sinh (input) | nguon_dang_ky (select)
│           │   └── hinhthuc_xettuyen (select)
│           │
│           ├── Section 2: CCCD
│           │   ├── [upload-placeholder] mặt trước | [upload-placeholder] mặt sau
│           │   ├── cccd (input, readonly - đã nhập từ bước kiểm tra)
│           │   ├── cccd_ngaycap (date)
│           │   └── cccd_noicap (input)
│           │
│           ├── Section 3: Văn bằng TN THPT
│           │   ├── [upload-placeholder] ảnh văn bằng
│           │   ├── van_bang_tn (input) | nam_tn (input)
│           │   └── sohieu_vb (input)
│           │
│           ├── Section 4: Văn bằng chuyên môn (khác)
│           │   ├── vb_chuyenmon (input) | vb_chuyenmon_nganh (input)
│           │   └── vb_chuyenmon_noicap (input)
│           │
│           └── Form Footer (trong child component)
│               ├── [Hủy] → emit cancel → backToCccdCheck()
│               ├── [Reset] → initForm()
│               └── [Thêm mới] → submitData → emit saved → onReset()
```

## 6. Danh sách trường dữ liệu theo section

### 6.1. Thông tin cá nhân

| Trường | Type | Required | Component | Ghi chú |
|--------|------|----------|-----------|---------|
| `anh_the` | string | | OvicImgCropV2 | Ảnh thẻ |
| `full_name` | string | ✓ | p-inputText | Họ và tên |
| `phone` | string | ✓ | p-inputText | SĐT, pattern /^(0[35789])(\d{8})$/ |
| `email` | string | | p-inputText | Email |
| `birthday` | string | | p-inputText[type=date] | Ngày sinh |
| `tinh_id` | number | | p-select | Tỉnh/TP |
| `huyen_id` | number | | p-select | Quận/Huyện |
| `xa_id` | number | | p-select | Xã/Phường |
| `address` | string | | p-textarea | Địa chỉ chi tiết |
| `noi_sinh` | string | | p-inputText | Nơi sinh |
| `dan_toc` | string | | p-select | Dân tộc (từ DanToc syscat) |
| `nguon_dang_ky` | string | | p-select | website, doi_tac, truc_tiep |
| `hinhthuc_xettuyen` | string | | p-select | hoc_ba, thpt_quoc_gia, xet_tuyen_som |

### 6.2. CCCD

| Trường | Type | Required | Component | Ghi chú |
|--------|------|----------|-----------|---------|
| `anh_cmnd_truoc` | string | | UploadPlaceholder | Ảnh CCCD mặt trước |
| `anh_cmnd_sau` | string | | UploadPlaceholder | Ảnh CCCD mặt sau |
| `cccd` | string | ✓ | p-inputText (readonly) | Đã nhập từ bước kiểm tra, pattern [0-9]{12} |
| `cccd_ngaycap` | string | | p-inputText[type=date] | Ngày cấp |
| `cccd_noicap` | string | | p-inputText | Nơi cấp |

### 6.3. Văn bằng TN THPT

| Trường | Type | Component | Ghi chú |
|--------|------|-----------|---------|
| `anh_thpt` | string | UploadPlaceholder | Ảnh văn bằng |
| `van_bang_tn` | string | p-inputText | Loại văn bằng |
| `nam_tn` | string | p-inputText | Năm tốt nghiệp |
| `sohieu_vb` | string | p-inputText | Số hiệu văn bằng |

### 6.4. Văn bằng chuyên môn

| Trường | Type | Component | Ghi chú |
|--------|------|-----------|---------|
| `vb_chuyenmon` | string | p-inputText | Tên văn bằng |
| `vb_chuyenmon_nganh` | string | p-inputText | Ngành học |
| `vb_chuyenmon_noicap` | string | p-inputText | Nơi cấp |

## 7. Data Flow

### 7.1 Services

| Service | Method | Mục đích |
|---------|--------|----------|
| `ApiOutsiteService` | `getNganhList()` | Danh sách ngành |
| `ApiOutsiteService` | `getCtdtListByIdNganh(id)` | CTĐT theo major_id |
| `HosoThisinhService` | `checkCccd(cccd)` | Kiểm tra CCCD |
| `HosoThisinhService` | `addTuyensinh(payload)` | Tạo hồ sơ (trong child form) |
| `DotXettuyenService` | `load()` | Đợt xét tuyển |
| `LocationService` | `queryLocation()` | Tỉnh/Huyện/Xã |

### 7.2 State — HosoThemComponent (signals)

```typescript
// Right panel state
rightState = signal<'cccd_check' | 'existing' | 'form'>('cccd_check')

// CCCD check
cccdInput = ''                        // raw string, filtered via replace(/\D/g, '')
cccdLoading = false
cccdResult: HosoCheckCccdResult | null = null
existingRecord: Signal<HosoThisinh | null>  // computed từ cccdResult

// Left panel
selectedMajorId = signal<number | null>(null)
selectedProgramId = signal<number | null>(null)
nganhOptions = signal<IctuDropdownOption<number>[]>([])
chuongTrinhOptions = signal<IctuDropdownOption<number>[]>([])
selectedMajorLabel = computed(() => ...)
selectedProgramLabel = computed(() => ...)
selectProgram(id)       // toggle — click lần nữa để bỏ chọn

// Lookups
dots = signal<IctuDropdownOption<number>[]>([])
```

### 7.3 State — FormThongtinDangkyComponent (FormGroup)

```typescript
formData = this.fb.group({
    // Personal info
    full_name:           ['', [Validators.required, Validators.minLength(2)]],
    birthday:            [''],
    phone:               ['', [Validators.required, Validators.pattern(/^(0[35789])(\d{8})$/)]],
    email:               ['', [Validators.email]],
    dan_toc:             [''],
    // CCCD
    cccd:                [{value: this.cccd(), disabled: !!this.cccd()}, [Validators.required, Validators.pattern('[0-9]{12}')]],
    cccd_ngaycap:        [''],
    cccd_noicap:         [''],
    // Location
    tinh_id:             [null],
    huyen_id:            [null],
    xa_id:               [null],
    address:             [''],
    noi_sinh:            [''],
    // Van bang THPT
    van_bang_tn:         [''],
    nam_tn:              [''],
    sohieu_vb:           [''],
    // Van bang chuyen mon
    vb_chuyenmon:        [''],
    vb_chuyenmon_nganh:  [''],
    vb_chuyenmon_namtn:  [''],
    // Files (string paths)
    anh_phieu_dang_ky:   [''],
    anh_thpt:            [''],
    anh_the:             [''],
    anh_cmnd_truoc:      [''],
    anh_cmnd_sau:        [''],
    anh_hoc_ba:          [''],
    // Hidden
    status:              ['cho_duyet'],
    owner_by:            [this.auth.user.id],
    nguon_dang_ky:       ['website'],
    hinhthuc_xettuyen:   ['hoc_ba'],
})
```

## 8. Events / Handlers

### CCCD Check
| Event | Handler | Mô tả |
|-------|---------|-------|
| Input change | `onCccdChange(value)` | Lọc `replace(/\D/g, '')` — chỉ giữ số |
| Click [Kiểm tra] | `runCccdCheck()` | Validate đủ 12 số → gọi API check → không found/bo_hoc → form; found → existing |
| Click [Quay lại] | `backToCccdCheck()` | Reset về state='cccd_check' |

### Left Panel
| Event | Handler | Mô tả |
|-------|---------|-------|
| (onChange) ngành | `onMajorChange(id)` | Load CTĐT theo major_id, reset program |
| Click CTĐT item | `selectProgram(id)` | Toggle chon/bo — item chon: nen xanh + border-left + dam |

### Form Actions (child component)
| Event | Handler | Mô tả |
|-------|---------|-------|
| Click [Hủy] | `closeForm()` → `cancel.emit()` | Parent gọi `backToCccdCheck()` |
| Click [Reset] (footer) | `resetForm()` → `initForm()` | Clear form fields |
| Click [Thêm mới] | `submitData()` | Validate → create → success → `saved.emit()` |
| (saved) | `onReset()` (parent) | Reset toàn bộ về mặc định |

## 9. CCCD Validation Rules

| Vị trí | Rule | Xử lý |
|--------|------|-------|
| Input field (`cccd_check`) | Tự động lọc ký tự không phải số | `onCccdChange` → `value.replace(/\D/g, '')` |
| Nút Kiểm tra (`cccd_check`) | Disabled khi `cccdInput` rỗng | `[disabled]="cccdLoading \|\| !cccdInput.trim()"` |
| `runCccdCheck()` | Phải đúng 12 chữ số | `cccd.length !== 12` → toast warning |
| Form validator (`form`) | Pattern [0-9]{12} | `Validators.pattern('[0-9]{12}')` |
| Input maxlength | 12 ký tự | `maxlength="12"` |

## 10. Files

```
frontend/src/app/pages/admin/children/hoso/hoso-them/
├── hoso-them.component.css
├── hoso-them.component.html
├── hoso-them.component.ts
└── hoso-them.md (file này)

frontend/src/app/pages/admin/children/hoso/form-thongtin-dangky/
├── form-thongtin-dangky.component.css
├── form-thongtin-dangky.component.html
└── form-thongtin-dangky.component.ts
```
