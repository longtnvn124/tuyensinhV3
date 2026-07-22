# Fix component ovic-avata-type-multiple và ovic-avata-type-thpt

## 1. Phân tích lỗi

### ovic-avata-type-multiple (multiple files)

| # | Vấn đề | Mức độ | File |
|---|--------|--------|------|
| 1 | **Memory leak**: `ngOnChanges` + `ngOnInit` đều subscribe `valueChanges` nhưng không unsubscribe | HIGH | .ts |
| 2 | **Memory leak**: Khai báo `destroy$` nhưng không dùng `takeUntil` | HIGH | .ts |
| 3 | **`ngOnChanges` sai logic**: Mỗi lần input change lại tạo subscription mới, không cleanup | HIGH | .ts |
| 4 | **`listFile` không khởi tạo**: `ArrFile[]` thiếu `= []` | MEDIUM | .ts |
| 5 | **`console.log`** | MEDIUM | .ts |
| 6 | **Mutate File object**: `item['__created'] = true` | MEDIUM | .ts |
| 7 | **`btnDeleteFile` không null-check**: Crash nếu `listFile` undefined | MEDIUM | .ts |

### ovic-avata-type-thpt (single file)

| # | Vấn đề | Mức độ | File |
|---|--------|--------|------|
| 1 | **`ngOnChanges` dư thừa**: Logic overlap với `ngOnInit`, không cleanup | MEDIUM | .ts |
| 2 | **`console.log`** | MEDIUM | .ts |

## 2. Các thay đổi

### ovic-avata-type-multiple.component.ts
- Xoá `ngOnChanges` hoàn toàn, chỉ giữ `ngOnInit`
- Thêm `takeUntil(this.destroy$)` vào subscription trong `ngOnInit`
- Khởi tạo `listFile: ArrFile[] = []`
- Xoá `console.log`
- Thay `__created` mutation bằng Set tracking
- Null-check trong `btnDeleteFile`

### ovic-avata-type-thpt.component.ts
- Xoá `ngOnChanges` và `OnChanges` import
- Xoá `console.log`
- Giữ nguyên logic `ngOnInit` (đã đúng với `takeUntil`)
