# Kế hoạch: Component `ovic-img-crop-v2`

## Yêu cầu

Kết hợp:
1. **Crop ảnh từ parent-component** — dùng `IctuImageResizeComponent` (MatDialog + `ngx-image-cropper`) để crop ảnh với cấu hình linh hoạt (aspectRatio, resizeToWidth, format...), nhận kết quả dạng `ImageResizerDto` (blob + objectUrl)
2. **Form binding từ ovic-avata-type-thpt** — nhận `AbstractControl` qua input `formField`, upload ảnh đã crop lên server, set value vào form control
3. **Upload flow từ ovic-avata-type-thpt** — dùng `IctuFileService.uploadFile_tuyensinh()` để upload file đã crop
4. **Style mới** — giao diện đẹp hơn, padding hợp lý, hiệu ứng mượt, responsive

## Kiến trúc component mới: `ovic-img-crop-v2`

### Inputs

| Input | Type | Default | Mô tả | Nguồn |
|-------|------|---------|-------|-------|
| `formField` | `AbstractControl` | required | Form control để bind giá trị sau upload | thpt |
| `disabled` | `boolean` | `false` | Disable toàn bộ | thpt |
| `accept` | `string` | `'image/png, image/gif, image/jpeg, image/bmp'` | File accept types | thpt |
| `aspectRatio` | `number` | `3/2` | Aspect ratio cho crop | thpt |
| `resizeToWidth` | `number` | `300` | Resize width sau crop | parent |
| `format` | `'png' \| 'jpeg' \| 'webp'` | `'png'` | Format output ảnh | parent |
| `imageQuality` | `number` | `100` | Chất lượng ảnh (1-100) | parent |
| `maintainAspectRatio` | `boolean` | `true` | Giữ tỷ lệ khi crop | parent |
| `textView` | `string` | `'Upload file'` | Text hiển thị | thpt |
| `height` | `string` | `'260px'` | Chiều cao container | thpt |
| `fileName` | `string` | tự động sinh | Tên file upload | thpt |
| `footage` | `'horizontal' \| 'vertical'` | `'horizontal'` | Kiểu hiển thị ảnh preview | thpt |
| `rotateShow` | `boolean` | `false` | Hiển thị nút xoay trong crop | thpt |
| `keyUpload` | `'crop' \| 'direct'` | `'crop'` | `'crop'` = crop trước upload, `'direct'` = upload luôn | thpt |
| `fileSize` | `number` | `10 * 1024 * 1024` | Dung lượng tối đa (bytes) | thpt |
| `cropperMinWidth` | `number` | `10` | Min width vùng crop | parent |
| `cropperMinHeight` | `number` | `10` | Min height vùng crop | parent |

### Outputs

| Output | Type | Mô tả |
|--------|------|-------|
| `onUploadSuccess` | `string` | Emit tên file sau upload thành công |
| `onUploadError` | `string` | Emit message lỗi |

### Flow

```
User click camera icon
  → Mở file picker (accept: image types)
  → Validate file:
     - File type hợp lệ
     - File size < fileSize
  → Nếu keyUpload === 'crop':
       Mở MatDialog với IctuImageResizeComponent
       User crop → nhấn "Lưu lại"
       Convert result.data.blob → File (Helper.blobToFile)
     Nếu keyUpload === 'direct':
       Dùng file gốc luôn
  → Gọi IctuFileService.uploadFile_tuyensinh(file)
  → Set formField.value = fileName từ response
  → Preview ảnh qua IctuFileService.getPreviewLinkLocalFile
```

### Giao diện

```
┌─────────────────────────────────┐
│  .bg-container                  │
│   ┌─────────────────────────┐   │
│   │                         │   │
│   │     [preview image]     │   │
│   │     (nếu có ảnh)        │   │
│   │                         │   │
│   │  ┌───────────────────┐  │   │
│   │  │  [📷]   [🖼]      │  │   │  <- overlay center
│   │  └───────────────────┘  │   │
│   │                         │   │
│   └─────────────────────────┘   │
└─────────────────────────────────┘
```

**Chi tiết UI:**
- Container có border dashed + border-radius 12px
- Hover: overlay background semi-transparent + scale nhẹ buttons
- Buttons: icon to, background tròn (50px), hover border trắng
- Ảnh preview: object-fit cover/contain, border-radius 8px
- Galleria fullscreen: giữ nguyên pattern từ thpt
- Transition all 0.3s ease cho hover effects
- Khi không có ảnh: hiển thị placeholder icon

### CSS cải thiện

```css
/* Container chính */
.bg-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  background: #f9fafb;
  transition: border-color 0.3s ease, background 0.3s ease;
}
.bg-container:hover {
  border-color: #3b82f6;
  background: #f0f5ff;
}

/* Overlay buttons - center, flex row, gap 16px */
.overlay-buttons {
  display: none;
  position: absolute;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  border-radius: 12px;
}

/* Button tròn, icon to */
.overlay-buttons .button {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 20px;
}
.overlay-buttons .button:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: #fff;
  transform: scale(1.1);
}
```

### Files cần tạo

1. `frontend/src/app/components/ovic-img-crop-v2/ovic-img-crop-v2.component.ts`
2. `frontend/src/app/components/ovic-img-crop-v2/ovic-img-crop-v2.component.html`
3. `frontend/src/app/components/ovic-img-crop-v2/ovic-img-crop-v2.component.css`

### Dependencies

- `IctuImageResizeComponent` (đã có)
- `IctuFileService` (đã có)
- `NotificationService` (đã có)
- `Helper.blobToFile` (đã có)
- `MatDialog` (đã có trong project)
- PrimeNG: `GalleriaModule`, `ImageModule`, `RippleModule`
- Angular: `NgClass`, `takeUntilDestroyed`

## So sánh code gốc

### Parent-component (crop part)
- File picker → validate → `imageResize()` mở `IctuImageResizeComponent` dialog
- Sau crop: `result.data.blob` → `Helper.blobToFile` → `fileService.upload`
- Set value vào form control bằng tay: `getControl('avatar').setValue(url)`

### ovic-avata-type-thpt
- File picker → validate → `makeCharacterAvatar()` dùng `MediaService.callAvatarMakerV2()` (NgbModal)
- Sau crop: base64 → `base64ToFile` → `fileService.uploadFile_tuyensinh`
- Set value: `formField().setValue(fileUl.name)`
- Cơ chế preview: `valueChanges` subscribe để cập nhật URL preview

### Component mới sẽ
- Dùng crop từ parent-component (IctuImageResizeComponent + MatDialog) — ưu điểm: cấu hình linh hoạt, preview trực tiếp
- Dùng form binding pattern từ ovic-avata-type-thpt — `formField` input + valueChanges subscription
- Dùng upload từ ovic-avata-type-thpt — `uploadFile_tuyensinh` (không cần token xác thực riêng)
- Thêm direct upload mode (không crop) cho flex hơn
- UI đẹp hơn với border-radius, backdrop-filter, transition mượt

## Risks

- LOW: `IctuImageResizeComponent` dùng `ngx-image-cropper` — cần verify import
- LOW: Overlay CSS cần test với cả 2 footage mode
- NONE: Không có xung đột dependency vì tất cả đã có trong project

## Complexity: LOW (3 files, ~180 lines total)

**Chờ xác nhận để bắt đầu code.**
