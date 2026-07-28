# OvicAvataTypeMultipleComponent

## Tổng quan

Component `OvicAvataTypeMultipleComponent` (standalone) — upload, preview, replace, và xóa nhiều ảnh. Hỗ trợ crop ảnh qua dialog `IctuImageResizeComponent` hoặc upload trực tiếp (`direct`). Kết quả ghi trực tiếp vào `AbstractControl` của form.

## Inputs

| Input | Kiểu | Default | Vai trò |
|-------|------|---------|---------|
| `formField` | `AbstractControl` | required | Form control binding — giá trị là `string[]` chứa file IDs |
| `disabled` | `boolean` | `false` | Disable toàn bộ tương tác |
| `multiple` | `boolean` | `true` | Cho phép upload nhiều file (hiện nút "Thêm ảnh") |
| `keyUpload` | `'crop' \| 'direct'` | `'crop'` | Chế độ upload: `crop` → mở dialog crop ảnh; `direct` → upload thẳng |
| `accept` | `string` | `''` | File accept filter (mặc định fallback: `image/png,image/gif,image/jpeg,image/bmp,image/x-icon`) |
| `aspectRatio` | `number` | — | Aspect ratio cho crop (vd: `3/2`) |
| `resizeToWidth` | `number` | `300` | Resize chiều rộng ảnh đầu ra (pixels) |
| `format` | `'png' \| 'jpeg' \| 'webp'` | `'png'` | Định dạng ảnh đầu ra |
| `imageQuality` | `number` | `100` | Chất lượng ảnh (1–100) |
| `maintainAspectRatio` | `boolean` | `true` | Giữ tỷ lệ khi resize |
| `cropperMinWidth` | `number` | `10` | Chiều rộng tối thiểu crop |
| `cropperMinHeight` | `number` | `10` | Chiều cao tối thiểu crop |
| `height` | `string` | `'260px'` | Chiều cao container |
| `textView` | `string` | `'Upload file'` | Text hiển thị khi chưa có ảnh |
| `rotateShow` | `boolean` | `false` | Hiển thị nút xoay ảnh |
| `fileName` | `string` | — | Tên file gợi ý |

## Outputs

| Output | Kiểu | Vai trò |
|--------|------|---------|
| `onUploadSuccess` | `string[]` | Emit danh sách file IDs sau upload thành công |
| `onUploadError` | `string` | Emit khi upload thất bại |

## State (Signals)

| Signal | Kiểu | Vai trò |
|--------|------|---------|
| `listFile` | `ArrFile[]` | Danh sách file hiện tại (`{fileName, url}` từ form control) |
| `activeIndex` | `number` | Index ảnh đang xem trong gallery |
| `displayBasic` | `boolean` | Hiển thị fullscreen gallery |

## Luồng dữ liệu

### Khởi tạo (`ngOnInit`)

```
formField.valueChanges
  → map(Array.isArray ? t : [])
  → listFile.set( files.map(f => { fileName, url: fileService.getPreviewLinkLocalFile(file) }) )
```

Nếu formField có giá trị sẵn, gán `listFile` ngay lập tức.

### Upload

```
onInputAvatar(event, fileChooser)
  ├── validate TYPE_FILE_IMAGE (png/gif/jpeg/bmp/x-icon)
  ├── (nếu keyUpload === 'crop')
  │   → mở MatDialog IctuImageResizeComponent
  │   → nhận kết quả blob
  ├── (nếu keyUpload === 'direct')
  │   → dùng file gốc
  ├── uploadFile_tuyensinh(file) 
  │   → result.id (string)
  ├── append vào formField.value array
  └── emit onUploadSuccess
```

### Replace file

```
replaceFile(index, event)
  → tạo input file tạm + click
  → upload thành công → thay thế list[index] = newId
  → setValue(list)
```

### Delete file

```
btnDeleteFile(item)
  → filter listFile (loại item)
  → formField.setValue(arr.map(m => m.fileName))
```

### View image

```
btnViewImage(item)
  → displayBasic = true
  → activeIndex = index trong listFile
```

## View States

| State | Hiển thị |
|-------|----------|
| `listFile().length === 0` | Placeholder: icon upload + text (click → mở file picker) |
| `listFile().length > 0` | Thumbnail grid (items + add button nếu multiple) |
| Fullscreen gallery | `p-galleria` với `[fullScreen]="true"` |

## UI Elements

### Thumbnail Item
- Ảnh thumbnail (fit contain, square aspect ratio)
- **Delete badge** (top-right, visible on hover)
- **Overlay buttons** (visible on hover):
  - Chọn ảnh khác (replace) — chỉ khi `!disabled()`
  - Xem ảnh — mở gallery

### Add Button (trong grid)
- Icon "+ Thêm ảnh" — chỉ hiển thị nếu `multiple() === true` và `!disabled()`

## CSS Classes

| Class | Vai trò |
|-------|---------|
| `.avata-container` | Container chính, dashed border, hover highlight |
| `.avata-placeholder` | Empty state (flex center, click → file chooser) |
| `.avata-grid` | Flex wrap grid chứa thumbnails |
| `.avata-item` | Thumbnail item (square aspect-ratio, overflow hidden) |
| `.avata-item-img` | Ảnh thumbnail (object-fit contain) |
| `.avata-item-overlay` | Hover overlay: replace + view buttons |
| `.avata-item-delete` | Delete badge (top-right, opacity 0 → 1 on hover) |
| `.avata-add-btn` | Nút "Thêm ảnh" (dashed border grid item) |

## Services

| Service | Vai trò |
|---------|---------|
| `IctuFileService` | Upload (`uploadFile_tuyensinh`), lấy preview URL (`getPreviewLinkLocalFile`) |
| `NotificationService` | Toast, loading progress, loading animation |
| `MatDialog` | Mở dialog crop ảnh (`IctuImageResizeComponent`) |
