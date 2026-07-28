# Design: Refactor `FormThongtinDangkyComponent` — Angular 21 Standalone

## 1. Mục tiêu

Viết lại component theo chuẩn Angular 21 (standalone, Signals, `@if/@for/@switch`, `inject()`), giảm kích thước file (~617 → ~300 dòng), tách biệt rõ form UI với data-loading logic.

---

## 2. Angular 21 Patterns (đã dùng trong project)

Tham khảo từ các component mới (`dot-xettuyen`, `dashboard`):

| Pattern | Cũ (hiện tại) | Mới (Angular 21) |
|---|---|---|
| Component | `standalone: false` (NgModule) | `standalone: true` |
| Style | `styleUrls: ['./a.css']` | `styleUrl: './a.css'` |
| DI | `constructor(private fb: FormBuilder)` | `private readonly fb = inject(FormBuilder)` |
| Reactivity | `property` + `ChangeDetection` | `signal()`, `computed()` |
| Control Flow | `*ngIf`, `*ngSwitchCase`, `*ngFor` | `@if`, `@switch`, `@for` |
| Form type | `FormBuilder.group({...})` | `FormGroup`, `FormControl` specs |
| State enum | `ngView: 0\|1\|-1` | `viewState = signal<'loading'\|'ready'\|'error'>('loading')` |

---

## 3. Kiến trúc mới

### 3.1. Tách file

```
form-thongtin-dangky/
├── design.md                              # (file này)
├── form-thongtin-dangky.component.ts      # ~300 dòng - UI + binding
├── form-thongtin-dangky.component.html    # @if/@switch/@for syntax
├── form-thongtin-dangky.component.scss    # SCSS thay cho CSS
└── form-thongtin-dangky.service.ts        # ~150 dòng - data-loading + validation
```

**Tại sao tách service?**
- `loadInit()` gọi 5 API forkJoin → che khuất form logic
- `checkCccd()` + `submitData()` là business logic, không thuần UI
- Service tái dùng được nếu sau này có form đăng ký từ phía sinh viên

### 3.2. Component structure

```
┌──────────────────────────────────────────────┐
│ FormThongtinDangkyComponent                  │
├──────────────────────────────────────────────┤
│ viewState = signal<'loading'|'ready'|'error'> │
│ formData = FormGroup                         │
│ cccdValid = signal<boolean>                  │
│ list_citys / list_wards / ... = signal<T[]>   │
│ selectedTH = signal<THOptieon|null>          │
│ readonly tuyensinh_select = input<Tuyensinh>()│
│ readonly disable = input<boolean>(false)      │
│ readonly showStatus = input<boolean>(false)   │
├──────────────────────────────────────────────┤
│ constructor() {                               │
│   inject-based DI                             │
│   initForm() → tạo FormGroup                  │
│ }                                             │
│ ngOnInit() → eff.loadInit()                   │
│ handleCccdCheck()                             │
│ handleSubmit()                                │
│ handleClose()                                 │
│ onChangeTinh()                                │
│ onSelectTHForm()                              │
│ onChangeTypeDiem()                            │
│ onChangeVBCM()                                │
└──────────────────────────────────────────────┘
```

### 3.3. Form init — dùng `FormGroup` với `NonNullableFormBuilder`

```typescript
// thay vì this.fb.group({...})
private readonly formBuilder = inject(FormBuilder).nonNullable;

initForm(): void {
  this.formData = this.formBuilder.group({
    ho_va_ten: ['', Validators.required],
    gioi_tinh: ['', Validators.required],
    ngay_sinh: ['', Validators.required],
    // ... all fields
  });
}
```

### 3.4. Signal state pattern

```typescript
type ViewState = 'loading' | 'ready' | 'error';

readonly viewState = signal<ViewState>('loading');
readonly cccdValid = signal(false);
readonly listCitys = signal<DiaDanh[]>([]);
readonly listWards = signal<DiaDanh[]>([]);
readonly listNganhTuyensinh = signal<NganhTuyensinh[]>([]);
readonly listUserDoitac = signal<User[]>([]);
readonly listUserSoHuu = signal<User[]>([]);
readonly selectedTH = signal<THOption | null>(null);
readonly cccdCheckValue = signal<Tuyensinh | null>(null);
```

### 3.5. Subscription → signals + `takeUntilDestroyed`

```typescript
private readonly destroyRef = inject(DestroyRef);

loadInit(): void {
  forkJoin([...]).pipe(
    takeUntilDestroyed(this.destroyRef)
  ).subscribe({
    next: ([...]) => { ... },
    error: () => { this.viewState.set('error'); }
  });
}
```

### 3.6. Template — `@if`/`@switch`

```html
@switch (viewState()) {
  @case ('loading') {
    <div class="...">loading...</div>
  }
  @case ('error') {
    <div class="...">Mất kết nối... <button (click)="loadInit()">Tải lại</button></div>
  }
  @case ('ready') {
    <form [formGroup]="formData">...</form>
  }
}
```

---

## 4. Chi tiết thay đổi

### 4.1. Component decorator

```typescript
@Component({
  selector: 'app-form-thongtin-dangky',
  standalone: true,
  imports: [
    InputMaskModule, InputNumberModule, InputTextModule, InputTextareaModule,
    ButtonModule, RippleModule, MatProgressBarModule,
    Select, SelectButton,
    ReactiveFormsModule, SharedModule,
    OvicAvataTypeThptComponent, OvicAvataTypeMultipleComponent,
  ],
  templateUrl: './form-thongtin-dangky.component.html',
  styleUrl: './form-thongtin-dangky.component.scss',
})
```

### 4.2. Inputs dùng `input()` signal

```typescript
readonly tuyensinhSelect = input<Tuyensinh | null>(null);
readonly disable = input<boolean, unknown>(false, { transform: booleanAttribute });
readonly showStatus = input<boolean, unknown>(false, { transform: booleanAttribute });
readonly isManager = input<boolean, unknown>(false, { transform: booleanAttribute });
readonly canAdd = input<boolean, unknown>(false, { transform: booleanAttribute });
readonly canEdit = input<boolean, unknown>(false, { transform: booleanAttribute });
```

### 4.3. FormGroup controls accessor

```typescript
get f(): FormGroup['controls'] {
  return this.formData.controls;
}
// → Giữ nguyên, vẫn là pattern tiện cho template
```

### 4.4. Submit thay đổi nhỏ

```typescript
handleSubmit(): void {
  if (this.formData.invalid) { ... showFirstError ... return; }
  // ...
}
```

### 4.5. Template fields clean up

- `formControlName="diemtb"` → PrimeNG `p-inputNumber` vẫn dùng được.
- Các `hasControlRequired` pipe → giữ nguyên (là custom pipe).
- Các bindings dropdown `[options]="listCitys()"` → signal đọc value.

---

## 5. Không thay đổi (giữ nguyên)

| Thành phần | Lý do |
|---|---|
| **Nghiệp vụ** | Không đổi, form fields/services APIs như cũ |
| **PrimeNG module** | Chỉ đổi cách import, không đổi component | 
| **Ovic custom controls** | Giữ lại `ovic-avata-type-thpt` + `ovic-avata-type-multiple`. Các controls khác (`ovic-dropdown` → `p-select`, `ovic-groups-radio` → `p-selectButton`) đã thay bằng PrimeNG |
| **CSS class names** | `.thongtin-container`, `.ovic-*`, `.tuyensinh-*` |
| **Form field names** | `ho_va_ten`, `ngay_sinh`, ... giống DB mapping |
| **Service layer** | `TuyensinhService`, `LocationService`, ... không đổi |

---

## 6. Các bước thực hiện

| Bước | File(s) | Nội dung |
|---|---|---|
| 1 | `.ts` | Đổi decorator: `standalone: true`, `styleUrl`, imports array |
| 2 | `.ts` | Đổi DI từ constructor → `inject()` |
| 3 | `.ts` | Đổi properties sang `signal()` |
| 4 | `.ts` | Đổi `*ngIf/*ngSwitch` enum → `ViewState` type |
| 5 | `.ts` | Đổi `ngOnInit` → dùng `takeUntilDestroyed` |
| 6 | `.html` | `*ngIf` → `@if`, `*ngSwitchCase` → `@switch` |
| 7 | `.html` | Bỏ `<ng-container>` wrapper không cần thiết |
| 8 | `.css` → `.scss` | Rename + SCSS syntax |
| 9 | `.service.ts` | (optional) Extract data-loading logic |

---

## 7. Rủi ro

- **Thay đổi template**: `formControlName` vẫn hoạt động trong `@if` block — OK trong Angular 21.
- **Input Mask**: `p-inputMask` cần `InputMaskModule` — có sẵn.
- **Dropdown**: `ovic-dropdown` binding `[formField]="f['xyz']"` — giữ nguyên.
- **formData.setValue()**: Trong `getFormData()`, object key mapping không đổi.
- **viewState enum**: LoadInit() bắn `ngView` → có thể miss case nếu quên mapping.

> **Sẵn sàng code sau khi bạn xác nhận plan này.**
