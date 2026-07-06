# Auth Forms — Implementation Status

## Design System (Đã áp dụng)

### Color Palette

| Token | Value |
|-------|-------|
| `--auth-bg-start` | `#667eea` |
| `--auth-bg-end` | `#764ba2` |
| `--auth-primary` | `#4F6EF7` |
| `--auth-primary-dark` | `#3B56D4` |
| `--auth-card-bg` | `#FFFFFF` |
| `--auth-text-primary` | `#1A1A2E` |
| `--auth-text-secondary` | `#6B7280` |
| `--auth-border` | `#E5E7EB` |
| `--auth-input-bg` | `#F9FAFB` |
| `--auth-error` | `#EF4444` |
| `--auth-success` | `#10B981` |

### Background
- Gradient: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Grid overlay: `48×48px` ô kẻ trắng (rgba 0.04) — tạo hiệu ứng checkered pattern
- 2 decorative glow spheres (`blur(80px)`) với float animation
- Không dùng background image

### Card
- White (`#FFFFFF`), border-radius `16px`
- Shadow: `0 20px 60px rgba(0, 0, 0, 0.12)`
- Padding: `40px` (desktop), `28px 24px` (mobile)
- Max-width: `440px`

### Form Elements
- Input: height `48px`, border-radius `8px`, padding-left `42px` (icon)
- Input focus: blue border + `box-shadow 0 0 0 3px rgba(79,110,247,0.1)`
- SVG icons bên trái input (user, lock, email, key)
- Button: dùng `pButton pRipple` với `style="height:48px"` — PrimeNG tự căn icon + label, không cần custom flex
- Labels: `14px`, weight `500`
- Gap giữa fields: `10px` (login), `20px` (forgot/reset)

---

## Component Architecture (Triệt để trong từng component — không dùng shared layout)

### Các component dùng CSS `:host` variables để định nghĩa design tokens riêng

| Component | Route | Trạng thái |
|-----------|-------|------------|
| Login | `/auth/login` | ✅ Redesigned |
| Forgot Password | `/auth/forgot-password` | ✅ Redesigned |
| Reset Password | `/auth/reset-password` | ✅ Redesigned |
| Unauthorized | `/auth/unauthorized` | ✅ Redesigned |
| Redirect URI Callback | `/auth/redirect-uri-call-back` | ✅ Redesigned |

### Template Structure (mỗi component)
```html
<div class="auth-page">
  <div class="auth-page__bg">
    <div class="auth-page__grid"></div>
    <div class="auth-page__glow--1"></div>
    <div class="auth-page__glow--2"></div>
  </div>
  <div class="auth-page__container">
    <div class="auth-card">
      <!-- Header: logo icon + title + subtitle -->
      <!-- Form or content -->
    </div>
  </div>
</div>
```

### CSS Structure (mỗi component)
- `:host` defines CSS variables (design tokens)
- `auth-page` — fullscreen gradient container
- `auth-page__bg` — background layer container
- `auth-page__grid` — checkered kẻ ô pattern (48px, opacity 0.6)
- `auth-page__glow` — decorative blur spheres
- `auth-card` — centered white card
- `auth-card__header` / `auth-card__title` / `auth-card__subtitle` — typography
- `auth-form` — flex column form layout
- `auth-form__field` / `auth-form__label` / `auth-form__input-group` / `auth-form__input` — form fields
- `auth-form__submit` — primary action button (dùng `pButton pRipple` với icon `pi` + label `pButtonLabel`)
- `auth-form__third-party__btn` — third-party button (dùng `pButton pRipple severity="secondary"`)
- `auth-form__back-link` — "back to login" link
- `auth-form__divider` / `auth-form__third-party` — third-party login section

---

## Files Modified

| File | Changes |
|------|---------|
| `login/login.component.html` | Complete rewrite — gradient bg, card, input icons, polished |
| `login/login.component.css` | Complete rewrite — auth-page design system |
| `forgot-password/forgot-password.component.ts` | `styleUrls` → `styleUrl`, xóa reference login CSS |
| `forgot-password/forgot-password.component.html` | Complete rewrite — auth design system |
| `forgot-password/forgot-password.component.css` | Complete rewrite — auth design system |
| `reset-password/reset-password.component.ts` | `styleUrls` → `styleUrl`, xóa reference login CSS |
| `reset-password/reset-password.component.html` | Complete rewrite — auth design system |
| `reset-password/reset-password.component.css` | Complete rewrite — auth design system |
| `unauthorized/unauthorized.component.html` | Redesign — auth card with lock icon |
| `unauthorized/unauthorized.component.css` | Complete rewrite — auth design system |
| `redirect-uri-call-back/redirect-uri-call-back.html` | Redesign — auth card với spinner/status |
| `redirect-uri-call-back/redirect-uri-call-back.css` | Complete rewrite — auth design system |

---

## Key Decisions

1. **Không dùng shared layout auth-layout component** — mỗi component tự duy trì template + CSS riêng, giảm coupling
2. **Dùng `:host` CSS variables** — design tokens được định nghĩa trong từng component, dễ maintain
3. **Inline styles được giữ tối thiểu** — chỉ còn `style="height:48px"` cho pButton (vì pButton default height ~36px, cần 48px để đồng bộ với input)
4. **Không còn reference `styleUrls: ['../login/login.component.css']`** — mỗi component độc lập
5. **Responsive** — media query `max-width: 480px` giảm padding/font cho mobile
6. **Animation nhẹ** — glow spheres float infinite, spinner cho redirect-uri-call-back

---

## PrimeNG Button Migration

### Pattern thống nhất cho button (từ 2026-07-06)

**Primary submit button:**
```html
<button class="auth-form__submit" pButton pRipple style="height:48px">
    <i class="pi pi-{icon-name}" pButtonIcon></i>
    <span pButtonLabel>{label text}</span>
</button>
```

**Third-party button (Google):**
```html
<button class="auth-form__third-party__btn" pButton pRipple severity="secondary" style="height:48px">
    <svg pButtonIcon width="18" height="18" viewBox="...">
        <!-- SVG paths -->
    </svg>
    <span pButtonLabel>Google</span>
</button>
```

### Component Status

| Component | Submit | Third-party | CSS |
|-----------|--------|-------------|-----|
| Login | ✅ `pButton pRipple` + `pi pi-sign-in` | ✅ Google: `pButton pRipple severity="secondary"` | `width: 100% !important` |
| Forgot Password | ✅ `pButton pRipple` + `pi pi-send` | — | `width: 100% !important` |
| Reset Password | ✅ `pButton pRipple` + `pi pi-refresh` | — | `width: 100% !important` |

### Notes
- `style="height:48px"` override PrimeNG default height
- CSS class `.auth-form__submit` chỉ còn `width: 100% !important` — pButton tự align icon + label
- pRipple directive tạo hiệu ứng click ripple
- SVG third-party dùng `pButtonIcon` attribute selector để pButton biết đây là icon

---

## Notes

- Logic TypeScript không thay đổi — chỉ template + CSS
- Selector component giữ nguyên — không ảnh hưởng routing
- Các component standalone dùng `loadComponent` trong routing — không cần module
- Background image `/images/bggp.webp` đã loại bỏ
- File cũ `authentication.css` không tồn tại — không cần xoá
