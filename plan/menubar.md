# Kế hoạch thiết kế lại Menu Sidebar (Admin Layout)

## 1. Hiện trạng (trước khi sửa)

Sidebar hiện tại nằm trong `ictu-vertical-menu`:
- **Cấu trúc cũ**: Tab strip trái 80px + content panel phải (danh sách menu con), dùng `<ng-scrollbar>` toàn bộ
- **Logo & version**: Nằm trong `admin-layout.component.html` (trong `.m-header`)
- **User avatar**: Nằm dưới cùng tab strip, thông tin chi tiết trong popup `MatMenu`
- **Menu server**: Đã có logic lấy từ `auth.userMenu`, chỉ cần chỉnh sửa HTML/CSS
- **Đăng xuất**: Nằm trong tab strip + trong user popup

Vấn đề: Bố cục phân tán, thiếu phân khu rõ ràng, scroll toàn bộ sidebar, không có logout ở footer.

## 2. Yêu cầu thiết kế

Sidebar gồm 3 phần + 1 footer:

| Phần | Nội dung | Ghi chú |
|------|----------|---------|
| **Header** | Logo + tên viết tắt website + nút toggle | Fixed, collapsed → ẩn logo, chỉ nút toggle |
| **User Info** | Avatar bo tròn + tên + email + nút popup (TK, Cài đặt, Đổi MK, ĐX) | Fixed, collapsed → chỉ avatar |
| **Menu** | Danh sách menu từ server | Scroll nếu overflow |
| **Footer** | Nút Đăng xuất | Fixed, dưới cùng |

## 3. Files đã sửa

| File | Thay đổi |
|------|----------|
| `admin-layout.component.html` | Bỏ `<nav>/<navbar-wrapper>/<m-header>`, pass `[logo]` + `[version]` |
| `admin-layout.component.ts` | Dọn unused imports (`MatButton`, `NgOptimizedImage`) |
| `ictu-vertical-menu.component.ts` | Thêm `@Input logo, version`, inject `LayoutService`, thêm `toggleMenu()` |
| `ictu-vertical-menu.component.html` | Template mới 4 phần: Header → User → Menu → Footer |
| `ictu-vertical-menu.component.scss` | Style mới: flex column, `flex-shrink:0` cho fixed parts, menu scroll |

## 4. Bố cục chi tiết

### 4.1 Khi expanded (280px)

```
┌──────────────────────────────┐
│ ┌──┐ TUYENSINH          [≡]  │ ← Header (56px, fixed)
│ └──┘                         │
├──────────────────────────────┤
│ ┌────┐                       │
│ │ 😊 │ Nguyễn Văn A     [▾]  │ ← User (auto, fixed)
│ │    │ a@email.com           │
│ └────┘                       │
├──────────────────────────────┤
│ Menu                         │
│ 📊 Dashboard                 │ ← Menu (flex:1, scroll)
│ 📋 Quản lý HS                │
│ 📚 Khóa học                  │
│ ...                          │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│ 🚪 Đăng xuất                 │ ← Footer (fixed)
└──────────────────────────────┘
```

### 4.2 Khi collapsed (80px)

```
┌──────────┐
│     [≡]  │ ← Header: chỉ nút toggle
├──────────┤
│  ┌────┐  │ ← User: chỉ avatar bo tròn
│  │ 😊 │  │
│  └────┘  │
├──────────┤
│  📊      │ ← Menu: icon + hover popup
│  📋      │
│  📚      │
├──────────┤
│  🚪      │ ← Footer: chỉ icon
└──────────┘
```

### 4.3 User Popup (giữ nguyên từ cũ)

Bấm nút `▾` bên phải user → mở `#userMenu` MatMenu:
- Avatar + Tên + Email
- Tài khoản (routerLink account/profile)
- Cài đặt (routerLink account/info)
- Cập nhật mật khẩu (routerLink account/password)
- Đăng xuất (confirmSignOut)

## 5. Style & Màu sắc

```scss
// Header
height: 56px; border-bottom: 1px solid var(--accent-300, #dbe0e5)
Name: var(--primary-500, #4680ff), font-weight: 700

// User
bg: var(--accent-100, #f8f9fa); border-radius: 10px; margin: 8px 12px
Avatar: border-radius: 50%, border: 2px solid white, box-shadow nhẹ

// Menu item
padding: 10px 12px; border-radius: 8px
Default: color var(--accent-600, #5b6b79)
Hover: bg var(--accent-100, #f8f9fa); color var(--primary-500, #4680ff)
Active: bg #eef4ff; color var(--primary-500, #4680ff); font-weight: 500

// Footer logout
hover bg #fef2f2; color #ef4444 (red)
```

## 6. Luồng dữ liệu

```
Server login → Permission.data.menus → auth.userMenu → AdminLayout.menus
                                                              ↓
Logo + Version  ───→  ictu-vertical-menu [logo] [version] [menus] [collapsed]
                                                              ↓
User info ← auth.onUserSetup observable → avatar/displayName/email
```

## 7. Files cần sửa (thực tế đã sửa)

1. [ictu-vertical-menu.component.ts](frontend/src/app/theme/layouts/menu/ictu-vertical-menu/ictu-vertical-menu.component.ts)
2. [ictu-vertical-menu.component.html](frontend/src/app/theme/layouts/menu/ictu-vertical-menu/ictu-vertical-menu.component.html)
3. [ictu-vertical-menu.component.scss](frontend/src/app/theme/layouts/menu/ictu-vertical-menu/ictu-vertical-menu.component.scss)
4. [admin-layout.component.html](frontend/src/app/pages/admin/admin-layout/admin-layout.component.html)
5. [admin-layout.component.ts](frontend/src/app/pages/admin/admin-layout/admin-layout.component.ts)

## 8. Verify

- Build: `ng build` → 0 lỗi, 0 warning
- Menu từ server giữ nguyên logic (chỉ sửa HTML/CSS)
- Collapse/expand dùng LayoutService.toggleSideDrawer()
- Header + User + Footer cố định (flex-shrink: 0), chỉ Menu scroll
- Khi collapsed: ẩn logo, chỉ toggle; ẩn text user, chỉ avatar
- Footer Đăng xuất hover đỏ
