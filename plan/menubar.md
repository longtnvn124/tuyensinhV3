# Kế hoạch thiết kế lại Menu Sidebar (Admin Layout)

## 1. Hiện trạng (trước khi sửa)

Sidebar hiện tại nằm trong `ictu-vertical-menu`:
- **Cấu trúc cũ**: Tab strip trái 80px + content panel phải (danh sách menu con), dùng `<ng-scrollbar>` toàn bộ
- **Logo & version**: Nằm trong `admin-layout.component.html` (trong `.m-header`)
- **User avatar**: Nằm dưới cùng tab strip, thông tin chi tiết trong popup `MatMenu`
- **Menu server**: Đã có logic lấy từ `auth.userMenu`, chỉ cần chỉnh sửa HTML/CSS
- **Đăng xuất**: Nằm trong tab strip + trong user popup

Vấn đề: Bố cục phân tán, thiếu phân khu rõ ràng, scroll toàn bộ sidebar, không có logout ở footer.

## 2. Yêu cầu thiết kế (đợt 2 — Accordion cha-con)

Phạm vi đợt này **chỉ sửa phần menu cha-con** (không đụng header/user/footer, không gom nhóm, không thêm divider).

Sidebar gồm 3 phần + 1 footer (giữ nguyên đợt 1):

| Phần | Nội dung | Ghi chú |
|------|----------|---------|
| **Header** | Logo + tên viết tắt website + nút toggle | Fixed, collapsed → ẩn logo, chỉ nút toggle |
| **User Info** | Avatar bo tròn + tên + email + nút popup (TK, Cài đặt, Đổi MK, ĐX) | Fixed, collapsed → chỉ avatar |
| **Menu** | Danh sách menu từ server + accordion cha-con | Scroll nếu overflow |
| **Footer** | Nút Đăng xuất | Fixed, dưới cùng |

**Hành vi menu (đợt 2):**

| Hành động | Kết quả |
|----------|---------|
| Click item **không** có child | Navigate đến route tương ứng |
| Click item **có** child | **Toggle expand/collapse**, KHÔNG navigate |
| Click child trong sidebar | Navigate đến child |
| Vào route child | Auto-expand cha + highlight child đậm, cha nhẹ |
| Collapsed (80px) | Giữ hover-popup hiện có |

## 3. Files đã sửa (đợt 1)

| File | Thay đổi |
|------|----------|
| `admin-layout.component.html` | Bỏ `<nav>/<navbar-wrapper>/<m-header>`, pass `[logo]` + `[version]` |
| `admin-layout.component.ts` | Dọn unused imports (`MatButton`, `NgOptimizedImage`) |
| `ictu-vertical-menu.component.ts` | Thêm `@Input logo, version`, inject `LayoutService`, thêm `toggleMenu()` |
| `ictu-vertical-menu.component.html` | Template mới 4 phần: Header → User → Menu → Footer |
| `ictu-vertical-menu.component.scss` | Style mới: flex column, `flex-shrink:0` cho fixed parts, menu scroll |

## 4. Files sẽ sửa (đợt 2 — Accordion cha-con)

| File | Thay đổi |
|------|----------|
| `ictu-vertical-menu.component.ts` | Thêm `expandedMenuIds` (Set), `toggleSubmenu()`, `navigateToMenu()`, `isExpanded()`, `hasActiveChild()`; sửa `tryActiveMenuByRouting()` để auto-expand cha |
| `ictu-vertical-menu.component.html` | Click cha gọi `toggleSubmenu()`, click con gọi `navigateToMenu()`; thêm block `sidebar-menu__submenu` ngay sau item cha khi expanded; thêm chevron rotate |
| `ictu-vertical-menu.component.scss` | Thêm style cho `.sidebar-menu__submenu` + `.sidebar-menu__item__chevron` + animation slide |

**KHÔNG đụng** đợt này: `admin-layout.component.*`, hover-popup collapsed (`mouseEnter`/`mouseLeave`/`collapsedMenuChild`), Header/User/Footer.

## 5. Bố cục chi tiết (đợt 2)

### 5.1 Khi expanded (280px)

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
│ 📊 Dashboard                 │ ← click = navigate
│ 🗄  Đợt xét tuyển            │ ← click = navigate
│ ➕ Thêm hồ sơ                │ ← click = navigate
│ 📂 Hồ sơ tuyển sinh      [▸] │ ← click = TOGGLE (không navigate)
│    ├ ➡ Hồ sơ xét tuyển       │ ← click = navigate
│    ├ ➡ Hồ sơ trúng tuyển     │ ← click = navigate
│    └ ➡ Hồ sơ không trúng     │ ← click = navigate
│ 👥 Hội đồng xét tuyển        │ ← click = navigate
│ 🔑 Quản lý TK - CBGV         │ ← click = navigate
│ 👤 Thông tin tài khoản       │ ← click = navigate
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│ 🚪 Đăng xuất                 │ ← Footer (fixed)
└──────────────────────────────┘
```

Khi child active → cha highlight nhẹ (color primary, font-weight 500), child highlight đậm (bg `#eef4ff`, color primary).

### 5.2 Khi collapsed (80px)

Giữ nguyên hành vi đợt 1: chỉ icon, hover để mở popup con.

```
┌──────────┐
│     [≡]  │ ← Header: chỉ nút toggle
├──────────┤
│  ┌────┐  │ ← User: chỉ avatar bo tròn
│  │ 😊 │  │
│  └────┘  │
├──────────┤
│  📊      │ ← Menu: icon + hover popup
│  📂      │   (item có child → popup hiện list con)
│  🔑      │
│  👤      │
├──────────┤
│  🚪      │ ← Footer: chỉ icon
└──────────┘
```

## 6. Style & Màu sắc (bổ sung đợt 2)

```scss
// Item cha khi có child (giữ nguyên style cũ + thêm chevron)
.sidebar-menu__item {
    padding: 10px 12px;
    border-radius: 8px;

    &__chevron {
        margin-left: auto;
        transition: transform 200ms ease;
        transform: rotate(-90deg);  // đóng
        opacity: 0.7;
    }
    &.--expanded &__chevron { transform: rotate(0); }  // mở

    &.--child-active:not(.--active) {
        color: var(--primary-500, #4680ff);
        font-weight: 500;
    }
}

// Submenu (child list xổ xuống ngay sau item cha)
.sidebar-menu__submenu {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 0 6px 36px;  // indent vào trong
    animation: ictuSubmenuSlide 200ms ease;

    &__item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        color: var(--accent-600, #5b6b79);
        background: transparent;
        border: none;
        text-align: left;
        cursor: pointer;
        transition: background 150ms, color 150ms;

        &:hover { background: var(--accent-100, #f8f9fa); color: var(--primary-500, #4680ff); }
        &.--active { background: #eef4ff; color: var(--primary-500, #4680ff); font-weight: 500; }

        &__icon { font-size: 12px; opacity: 0.7; }
    }
}

@keyframes ictuSubmenuSlide {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
}
```

**Không thêm** divider, không thêm label nhóm, không gom nhóm — đúng yêu cầu đợt 2.

## 7. Luồng dữ liệu (giữ nguyên + bổ sung đợt 2)

```
Server login → Permission.data.menus → auth.userMenu → AdminLayout.menus
                                                              ↓
Logo + Version  ───→  ictu-vertical-menu [logo] [version] [menus] [collapsed]
                                                              ↓
User info ← auth.onUserSetup observable → avatar/displayName/email
                                                              ↓
Đợt 2: expandedMenuIds (signal) ↔ click item cha → toggle / auto-expand khi route active
```

## 8. Code logic (đợt 2)

### 8.1 [ictu-vertical-menu.component.ts](frontend/src/app/theme/layouts/menu/ictu-vertical-menu/ictu-vertical-menu.component.ts)

Thêm state + helpers, refactor `activeMenu()`:

```typescript
readonly expandedMenuIds : WritableSignal<Set<string>> = signal<Set<string>>( new Set() );

isExpanded( menuId : string ) : boolean {
    return this.expandedMenuIds().has( menuId );
}

hasActiveChild( menu : IctuNavigation ) : boolean {
    return !!menu.child?.some( ( c : IctuNavigation ) : boolean => this.menuActivated()?.id === c.id );
}

toggleSubmenu( menu : IctuNavigation ) : void {
    if ( !menu.child?.length ) {
        void this.navigateToMenu( menu );
        return;
    }
    this.expandedMenuIds.update( ( set : Set<string> ) : Set<string> => {
        const next = new Set( set );
        next.has( menu.id ) ? next.delete( menu.id ) : next.add( menu.id );
        return next;
    } );
}

async navigateToMenu( menu : IctuNavigation ) : Promise<void> {
    try {
        await this.router.navigate( [ [ 'admin' , menu.id ].join( '/' ) ] );
    } catch ( e ) {
        alert( e );
    }
    this.menuActivated.set( menu );
}
```

Sửa `tryActiveMenuByRouting` — fallback tìm child để auto-expand cha:

```typescript
private tryActiveMenuByRouting( router : string | undefined | null ) : void {
    if ( !router ) return;
    const top : IctuNavigation | undefined = this.menus().find( ( i ) : boolean => i.id === router );
    if ( top ) {
        this.menuActivated.set( top );
        return;
    }
    for ( const parent of this.menus() ) {
        const child : IctuNavigation | undefined = parent.child?.find( ( c ) : boolean => c.id === router );
        if ( child ) {
            this.menuActivated.set( child );
            this.expandedMenuIds.update( ( s ) : Set<string> => new Set( s ).add( parent.id ) );
            return;
        }
    }
}
```

Xóa `activeMenu()` (thay bằng 2 hàm trên).

### 8.2 [ictu-vertical-menu.component.html](frontend/src/app/theme/layouts/menu/ictu-vertical-menu/ictu-vertical-menu.component.html)

```html
@for (item of menus(); track item.id) {
    <button
        class="sidebar-menu__item"
        [class.--active]="menuActivated()?.id === item.id"
        [class.--has-child]="!!item.child?.length"
        [class.--child-active]="hasActiveChild(item)"
        [class.--expanded]="isExpanded(item.id)"
        (click)="toggleSubmenu(item)"
        type="button">
        @if (item.icon) {
            <span class="sidebar-menu__item__icon" [ngClass]="item.icon"></span>
        } @else if (item.customSvg) {
            <svg class="sidebar-menu__item__icon pc-icon">
                <use [attr.href]="'fonts/custom-icon.svg#'+item.customSvg"></use>
            </svg>
        }
        @if (!collapsed()) {
            <span class="sidebar-menu__item__label">{{ item.title }}</span>
            @if (item.child?.length) {
                <svg class="sidebar-menu__item__chevron" viewBox="0 0 24 24" width="14" height="14">
                    <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/>
                </svg>
            }
        }
        @if (collapsed()) {
            <a href="#" (click)="mouseEnter(menuTrigger,item , $event)" class="open-menu-on-hover" (mouseenter)="mouseEnter(menuTrigger,item)" (mouseleave)="mouseLeave(menuTrigger)"></a>
            <span class="open-menu-on-hover__point" [matMenuTriggerFor]="menu" #menuTrigger="matMenuTrigger"></span>
        }
    </button>

    @if (item.child?.length && isExpanded(item.id) && !collapsed()) {
        <div class="sidebar-menu__submenu">
            @for (child of item.child; track child.id) {
                <button
                    class="sidebar-menu__submenu__item"
                    [class.--active]="menuActivated()?.id === child.id"
                    (click)="navigateToMenu(child)"
                    type="button">
                    @if (child.icon) {
                        <span class="sidebar-menu__submenu__item__icon" [ngClass]="child.icon"></span>
                    }
                    <span>{{ child.title }}</span>
                </button>
            }
        </div>
    }
}
```

## 9. Verify (đợt 2)

- Build: `ng build` → 0 lỗi, 0 warning
- Click item không có child → navigate bình thường
- Click item có child → toggle expand/collapse (không navigate), chevron rotate
- Click child trong submenu → navigate đến route + highlight đậm
- Vào route child bằng URL trực tiếp → cha tự expand, child highlight đậm, cha highlight nhẹ
- Collapsed: hover popup cha-con vẫn hoạt động như đợt 1
- Không ảnh hưởng Header / User / Footer / Auth flow
