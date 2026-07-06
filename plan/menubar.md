# Kế hoạch thiết kế lại Menu Sidebar (Admin Layout)

## 1. Hiện trạng

Sidebar hiện tại nằm trong `ictu-vertical-menu`:
- **Cấu trúc**: Tab strip trái 80px + content panel phải (danh sách menu con)
- **Logo & version**: Nằm trong `admin-layout.component.html` (trong `.m-header`), không phải trong sidebar component
- **User avatar**: Nằm dưới cùng tab strip, thông tin chi tiết trong popup `MatMenu`
- **Menu server**: Đã có logic lấy từ `auth.userMenu`, chỉ cần chỉnh sửa HTML/CSS

Vấn đề: Bố cục phân tán (logo ở layout, menu ở component riêng), chưa có phân khu rõ ràng.

## 2. Yêu cầu thiết kế

Sidebar gồm 3 phần rõ rệt:

| Phần | Nội dung | Ghi chú |
|------|----------|---------|
| **Header** | Logo + tên viết tắt website | Luôn hiển thị, kể cả khi thu gọn |
| **User Info** | Avatar + tên + email + chức năng (TK, Cài đặt, Đổi MK, ĐX) | Thay cho popup hiện tại |
| **Menu** | Danh sách menu từ server | Giữ nguyên logic, chỉ sửa HTML/CSS |

## 3. Phạm vi thay đổi

| File | Thay đổi |
|------|----------|
| `admin-layout.component.html` | Di chuyển `.m-header` (logo) vào sidebar; đơn giản hóa layout |
| `ictu-vertical-menu.component.html` | **Sửa cấu trúc** thành 3 phần Header + User + Menu |
| `ictu-vertical-menu.component.scss` | **Viết lại style** cho 3 phần, tông màu xanh #4680ff |
| `ictu-menu-item.component.html` | Chỉnh nhỏ (nếu cần) cho phù hợp layout mới |
| `_menu.scss` | Cập nhật global style sidebar |

## 4. Thiết kế chi tiết

### 4.1 Bố cục tổng thể

```
┌──────────────────────┐
│ ┌─┐  Logo + Tên      │ ← Phần 1: Header (56px)
│ └─┘  website         │
├──────────────────────┤
│ ┌──┐                 │
│ │  │  Nguyễn Văn A   │ ← Phần 2: User Info (auto height)
│ │  │  a@email.com    │
│ └──┘  [TK][CĐ][MK]   │
├──────────────────────┤
│                      │
│  📊  Dashboard       │
│  📋  Quản lý HS      │ ← Phần 3: Menu (scroll, flex: 1)
│  📚  Khóa học        │
│  ⚙️  Cài đặt         │
│                      │
│                      │
├──────────────────────┤
│ 🌙  Thu gọn / Mở     │ ← Footer: toggle (optional)
└──────────────────────┘
```

### 4.2 Khi sidebar thu gọn (collapsed - 80px)

```
┌────────┐
│  L     │ ← Logo thu nhỏ
├────────┤
│ [A]    │ ← Avatar nhỏ
├────────┤
│ 📊     │ ← Icon menu
│ 📋     │
│ 📚     │
│ ⚙️     │
├────────┤
│ ◀     │
└────────┘
```

### 4.3 Màu sắc (theme hiện tại)

```scss
// Phần Header
--sidebar-header-bg: #ffffff;          // Nền trắng
--sidebar-header-border: #dbe0e5;      // Border dưới

// Phần User Info  
--sidebar-user-bg: #f8f9fa;            // Nền xám nhạt
--sidebar-user-name: #3e4853;          // Tên đậm
--sidebar-user-email: #8996a4;         // Email mờ
--sidebar-user-accent: #4680ff;        // Màu xanh chủ đạo

// Phần Menu
--sidebar-menu-bg: #ffffff;            // Nền trắng
--sidebar-menu-text: #5b6b79;          // Text menu
--sidebar-menu-active: #4680ff;        // Active (xanh)
--sidebar-menu-hover-bg: #f0f5ff;      // Hover (xanh nhạt)
--sidebar-menu-active-bg: #e8f0fe;     // Active bg
```

### 4.4 Thay đổi cụ thể từng file

#### `admin-layout.component.html`
- **Giữ nguyên** `mat-drawer-container`, `mat-drawer`, `app-container`
- **Di chuyển** `.m-header` (logo, version) vào bên trong `ictu-vertical-menu`
- Bỏ bớt wrapper không cần thiết

#### `ictu-vertical-menu.component.html` (thay đổi chính)
Cấu trúc mới:
```html
<ng-scrollbar style="height: 100vh">
  <!-- PHẦN 1: HEADER -->
  <div class="sidebar-header">
    <div class="sidebar-header__logo">
      <img [ngSrc]="logo" height="40" width="40">
    </div>
    @if (!collapsed()) {
      <div class="sidebar-header__info">
        <span class="sidebar-header__info__name">TUYENSINH</span>
        <span class="sidebar-header__info__version">v{{ version }}</span>
      </div>
    }
    <button class="sidebar-header__toggle" (click)="toggleMenu()">
      <i class="ti ti-menu-2"></i>
    </button>
  </div>

  <!-- PHẦN 2: USER INFO -->
  <div class="sidebar-user">
    <div class="sidebar-user__avatar">
      <img [ngSrc]="avatar() | safeUrl" width="44" height="44">
    </div>
    @if (!collapsed()) {
      <div class="sidebar-user__details">
        <span class="sidebar-user__details__name">{{ displayName() }}</span>
        <span class="sidebar-user__details__email">{{ email() }}</span>
        <div class="sidebar-user__actions">
          <button [routerLink]="['/admin/account/profile']" title="Tài khoản">
            <i class="ti ti-user"></i>
          </button>
          <button [routerLink]="['/admin/account/password']" title="Đổi mật khẩu">
            <i class="ti ti-lock"></i>
          </button>
          <button (click)="confirmSignOut()" title="Đăng xuất">
            <i class="ti ti-logout"></i>
          </button>
        </div>
      </div>
    }
  </div>

  <!-- PHẦN 3: MENU -->
  <div class="sidebar-menu">
    <div class="sidebar-menu__label">Menu</div>
    <ul class="nav coded-inner-navbar">
      @for (item of menus(); track item.id) {
        @if (!item.url) {
          <li class="nav-item coded-menu-caption">
            <label>{{ item.title }}</label>
          </li>
        } @else {
          <app-ictu-menu-item [item]="item" [collapsed]="collapsed()"/>
        }
      }
    </ul>
  </div>
</ng-scrollbar>
```

#### `ictu-vertical-menu.component.ts`
- Thêm `@Input() logo: string`
- Thêm `@Input() version: string`
- Thêm method `toggleMenu()` gọi `layoutService.toggleSideDrawer()`

#### `ictu-menu-item.component.ts`
- Thêm `@Input() collapsed: boolean = false`

#### `ictu-menu-item.component.html`
- Nếu `collapsed`: chỉ hiển thị icon, ẩn text
- Giữ nguyên logic routerLink, external link

## 5. Các bước triển khai

| Step | Mô tả | Files |
|------|-------|-------|
| 1 | Thêm @Input logo, version, toggleMenu vào ictu-vertical-menu.component.ts | `.ts` |
| 2 | Viết lại template ictu-vertical-menu 3 phần | `.html` |
| 3 | Viết lại style ictu-vertical-menu | `.scss` |
| 4 | Cập nhật admin-layout: pass logo, version, bỏ m-header | `.html` |
| 5 | Thêm collapsed input vào ictu-menu-item | `.ts` |
| 6 | Điều chỉnh ictu-menu-item hiển thị theo collapsed | `.html` |
| 7 | Cập nhật _menu.scss global | `_menu.scss` |
| 8 | Build & verify | `ng build` |

## 6. Rủi ro & Lưu ý

- **Không phá vỡ logic menu**: Menu từ server vẫn giữ nguyên, chỉ thay đổi HTML/CSS
- **Responsive**: Cần test trên mobile (drawer over mode)
- **Toggle hoạt động**: Collapse/expand vẫn dùng LayoutService.toggleSideDrawer()
- **User popup**: Chuyển từ MatMenu popup sang inline trong sidebar
- **Hiệu ứng**: Cần transition mượt khi collapse/expand (width, opacity, transform)

## 7. File cần sửa

1. `frontend/src/app/theme/layouts/menu/ictu-vertical-menu/ictu-vertical-menu.component.ts` — Thêm @Input logo, version
2. `frontend/src/app/theme/layouts/menu/ictu-vertical-menu/ictu-vertical-menu.component.html` — Viết lại template
3. `frontend/src/app/theme/layouts/menu/ictu-vertical-menu/ictu-vertical-menu.component.scss` — Viết lại style
4. `frontend/src/app/pages/admin/admin-layout/admin-layout.component.html` — Pass logo, version, bỏ m-header
5. `frontend/src/app/theme/layouts/menu/ictu-vertical-menu/ictu-menu-item/ictu-menu-item.component.ts` — Thêm collapsed input
6. `frontend/src/app/theme/layouts/menu/ictu-vertical-menu/ictu-menu-item/ictu-menu-item.component.html` — Điều chỉnh hiển thị
7. `frontend/src/app/theme/styles/layouts/_menu.scss` — Global menu styles
